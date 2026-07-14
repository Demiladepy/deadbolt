// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DeadboltVault — a personal onchain approval firewall
/// @notice Holds the owner's tokens and forces every ERC-20 approval of those
///         tokens through an onchain policy:
///           1. Approvals to trusted (allowlisted) spenders execute instantly.
///           2. Approvals to unknown spenders are quarantined behind a
///              cancelable timelock — a phished signature lands in the queue,
///              not in the drainer's wallet.
///           3. `panic()` revokes every live approval the vault has granted
///              and locks the vault, in one transaction.
///         The vault is the token owner, so this policy cannot be bypassed by
///         spoofing a UI — the chain itself enforces it.
contract DeadboltVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------- types

    struct PendingApproval {
        address token;
        address spender;
        uint256 amount;
        uint64 eta; // earliest execution timestamp
        uint64 epoch; // panic generation this request belongs to
        bool executed;
        bool canceled;
    }

    struct ApprovalKey {
        address token;
        address spender;
    }

    // --------------------------------------------------------------- errors

    error NotOwner();
    error VaultLocked();
    error VaultNotLocked();
    error ZeroAddress();
    error DelayOutOfRange();
    error UnknownRequest();
    error RequestNotReady();
    error RequestDead(); // executed, canceled, or invalidated by a panic

    // --------------------------------------------------------------- events

    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event SpenderTrusted(address indexed spender, bool trusted);
    event TimelockDelayChanged(uint64 previousDelay, uint64 newDelay);
    event ApprovalGranted(address indexed token, address indexed spender, uint256 amount);
    event ApprovalQueued(
        uint256 indexed id, address indexed token, address indexed spender, uint256 amount, uint64 eta
    );
    event ApprovalExecuted(uint256 indexed id, address indexed token, address indexed spender, uint256 amount);
    event ApprovalCanceled(uint256 indexed id);
    event ApprovalRevoked(address indexed token, address indexed spender, bool cleanly);
    event PanicTriggered(uint256 approvalsRevoked, uint64 newEpoch);
    event Unlocked();

    // -------------------------------------------------------------- storage

    uint64 public constant MIN_DELAY = 1 minutes;
    uint64 public constant MAX_DELAY = 30 days;

    address public immutable owner;
    uint64 public timelockDelay;
    uint64 public epoch;
    bool public locked;

    mapping(address spender => bool) public trustedSpender;

    PendingApproval[] private _queue;

    // enumerable set of (token, spender) pairs with a live allowance,
    // so panic() can wipe every open door in one pass
    ApprovalKey[] private _liveApprovals;
    mapping(address token => mapping(address spender => uint256)) private _liveIndexPlusOne;

    // ------------------------------------------------------------ modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, uint64 timelockDelay_) {
        if (owner_ == address(0)) revert ZeroAddress();
        if (timelockDelay_ < MIN_DELAY || timelockDelay_ > MAX_DELAY) revert DelayOutOfRange();
        owner = owner_;
        timelockDelay = timelockDelay_;
    }

    // ---------------------------------------------------------------- funds

    /// @notice Pull `amount` of `token` from the caller into the vault.
    ///         Caller must have approved the vault beforehand.
    function deposit(address token, uint256 amount) external nonReentrant {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, msg.sender, amount);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    receive() external payable {}

    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        require(ok, "native transfer failed");
        emit NativeWithdrawn(to, amount);
    }

    // --------------------------------------------------------------- policy

    function setTrustedSpender(address spender, bool trusted) external onlyOwner {
        if (spender == address(0)) revert ZeroAddress();
        trustedSpender[spender] = trusted;
        emit SpenderTrusted(spender, trusted);
    }

    function setTimelockDelay(uint64 newDelay) external onlyOwner {
        if (newDelay < MIN_DELAY || newDelay > MAX_DELAY) revert DelayOutOfRange();
        emit TimelockDelayChanged(timelockDelay, newDelay);
        timelockDelay = newDelay;
    }

    /// @notice Ask the vault to approve `spender` for `amount` of `token`.
    ///         Trusted spender → approval executes now (id = type(uint256).max).
    ///         Unknown spender → request is queued behind the timelock.
    function requestApproval(address token, address spender, uint256 amount)
        external
        onlyOwner
        returns (uint256 id)
    {
        if (locked) revert VaultLocked();
        if (token == address(0) || spender == address(0)) revert ZeroAddress();

        if (trustedSpender[spender]) {
            _setApproval(token, spender, amount);
            emit ApprovalGranted(token, spender, amount);
            return type(uint256).max;
        }

        uint64 eta = uint64(block.timestamp) + timelockDelay;
        _queue.push(
            PendingApproval({
                token: token,
                spender: spender,
                amount: amount,
                eta: eta,
                epoch: epoch,
                executed: false,
                canceled: false
            })
        );
        id = _queue.length - 1;
        emit ApprovalQueued(id, token, spender, amount, eta);
    }

    /// @notice Execute a queued approval once its timelock has elapsed.
    function executeApproval(uint256 id) external onlyOwner {
        if (locked) revert VaultLocked();
        if (id >= _queue.length) revert UnknownRequest();
        PendingApproval storage p = _queue[id];
        if (p.executed || p.canceled || p.epoch != epoch) revert RequestDead();
        if (block.timestamp < p.eta) revert RequestNotReady();

        p.executed = true;
        _setApproval(p.token, p.spender, p.amount);
        emit ApprovalExecuted(id, p.token, p.spender, p.amount);
    }

    function cancelApproval(uint256 id) external onlyOwner {
        if (id >= _queue.length) revert UnknownRequest();
        PendingApproval storage p = _queue[id];
        if (p.executed || p.canceled || p.epoch != epoch) revert RequestDead();
        p.canceled = true;
        emit ApprovalCanceled(id);
    }

    /// @notice Revoke a single live approval immediately.
    function revokeApproval(address token, address spender) external onlyOwner {
        _revoke(token, spender);
    }

    /// @notice THE DEADBOLT. One transaction: revoke every live approval the
    ///         vault has granted, invalidate every queued request, and lock
    ///         the vault against new approvals until `unlock()`.
    function panic() external onlyOwner {
        uint256 n = _liveApprovals.length;
        for (uint256 i = n; i > 0; i--) {
            ApprovalKey memory k = _liveApprovals[i - 1];
            _revoke(k.token, k.spender);
        }
        epoch += 1; // kills everything still sitting in the queue
        locked = true;
        emit PanicTriggered(n, epoch);
    }

    function unlock() external onlyOwner {
        if (!locked) revert VaultNotLocked();
        locked = false;
        emit Unlocked();
    }

    // ---------------------------------------------------------------- views

    function queueLength() external view returns (uint256) {
        return _queue.length;
    }

    function getPending(uint256 id) external view returns (PendingApproval memory) {
        if (id >= _queue.length) revert UnknownRequest();
        return _queue[id];
    }

    function getQueue() external view returns (PendingApproval[] memory) {
        return _queue;
    }

    /// @notice Every (token, spender) pair the vault currently has a live
    ///         allowance for — the doors panic() would slam.
    function getLiveApprovals() external view returns (ApprovalKey[] memory) {
        return _liveApprovals;
    }

    function liveApprovalCount() external view returns (uint256) {
        return _liveApprovals.length;
    }

    // ------------------------------------------------------------ internals

    function _setApproval(address token, address spender, uint256 amount) internal {
        IERC20(token).forceApprove(spender, amount);
        if (amount > 0) {
            _track(token, spender);
        } else {
            _untrack(token, spender);
        }
    }

    /// @dev Best-effort revoke: a malicious token that reverts on approve(0)
    ///      must not be able to brick panic(), so failures are surfaced as an
    ///      event instead of reverting the whole sweep.
    function _revoke(address token, address spender) internal {
        (bool ok, bytes memory ret) = token.call(abi.encodeCall(IERC20.approve, (spender, 0)));
        bool cleanly = ok && (ret.length == 0 || abi.decode(ret, (bool)));
        _untrack(token, spender);
        emit ApprovalRevoked(token, spender, cleanly);
    }

    function _track(address token, address spender) internal {
        if (_liveIndexPlusOne[token][spender] != 0) return;
        _liveApprovals.push(ApprovalKey({token: token, spender: spender}));
        _liveIndexPlusOne[token][spender] = _liveApprovals.length;
    }

    function _untrack(address token, address spender) internal {
        uint256 idxPlusOne = _liveIndexPlusOne[token][spender];
        if (idxPlusOne == 0) return;
        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = _liveApprovals.length - 1;
        if (idx != lastIdx) {
            ApprovalKey memory last = _liveApprovals[lastIdx];
            _liveApprovals[idx] = last;
            _liveIndexPlusOne[last.token][last.spender] = idxPlusOne;
        }
        _liveApprovals.pop();
        delete _liveIndexPlusOne[token][spender];
    }
}
