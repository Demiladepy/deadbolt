// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Stand-in for a wallet-drainer contract, used in the demo to prove
///         the guard holds. TESTNET ONLY. It can only move tokens it has been
///         approved for — which, behind a Deadbolt vault, is nothing until the
///         owner deliberately trusts it.
contract Drainer {
    /// @dev Sweeps `amount` of `token` from `victim` to `attacker`, exactly
    ///      what a phishing approval would enable.
    function drain(address token, address victim, address attacker, uint256 amount) external {
        IERC20(token).transferFrom(victim, attacker, amount);
    }
}
