// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeadboltVault} from "../src/DeadboltVault.sol";
import {DeadboltFactory} from "../src/DeadboltFactory.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Drainer} from "../src/mocks/Drainer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeadboltVaultTest is Test {
    DeadboltFactory factory;
    DeadboltVault vault;
    MockERC20 token;
    Drainer drainer;

    address owner = makeAddr("owner");
    address attacker = makeAddr("attacker");
    address dex = makeAddr("dex"); // a trusted spender
    uint64 constant DELAY = 5 minutes;
    uint256 constant FUND = 1_000 ether;

    function setUp() public {
        factory = new DeadboltFactory();
        token = new MockERC20("Test USD", "tUSD");
        drainer = new Drainer();

        vm.prank(owner);
        vault = DeadboltVault(payable(factory.createVault(DELAY)));

        token.mint(owner, FUND);
        vm.startPrank(owner);
        token.approve(address(vault), FUND);
        vault.deposit(address(token), FUND);
        vm.stopPrank();
    }

    // ---------------------------------------------------------- factory

    function test_factory_registersVault() public view {
        address[] memory v = factory.vaultsOf(owner);
        assertEq(v.length, 1);
        assertEq(v[0], address(vault));
        assertEq(vault.owner(), owner);
        assertEq(vault.timelockDelay(), DELAY);
    }

    function test_deposit_holdsFunds() public view {
        assertEq(token.balanceOf(address(vault)), FUND);
    }

    // ---------------------------------------------------- trusted path

    function test_trustedSpender_approvesInstantly() public {
        vm.startPrank(owner);
        vault.setTrustedSpender(dex, true);
        uint256 id = vault.requestApproval(address(token), dex, 100 ether);
        vm.stopPrank();

        assertEq(id, type(uint256).max, "trusted approvals are not queued");
        assertEq(token.allowance(address(vault), dex), 100 ether);
        assertEq(vault.liveApprovalCount(), 1);
    }

    // -------------------------------------------------- timelock path

    function test_unknownSpender_isQuarantined() public {
        vm.prank(owner);
        uint256 id = vault.requestApproval(address(token), attacker, type(uint256).max);

        // nothing approved yet — the door stays shut
        assertEq(token.allowance(address(vault), attacker), 0);
        assertEq(vault.queueLength(), 1);

        DeadboltVault.PendingApproval memory p = vault.getPending(id);
        assertEq(p.spender, attacker);
        assertEq(p.eta, block.timestamp + DELAY);
    }

    function test_executeBeforeEta_reverts() public {
        vm.startPrank(owner);
        uint256 id = vault.requestApproval(address(token), dex, 1 ether);
        vm.expectRevert(DeadboltVault.RequestNotReady.selector);
        vault.executeApproval(id);
        vm.stopPrank();
    }

    function test_executeAfterEta_grantsApproval() public {
        vm.startPrank(owner);
        uint256 id = vault.requestApproval(address(token), dex, 42 ether);
        skip(DELAY);
        vault.executeApproval(id);
        vm.stopPrank();

        assertEq(token.allowance(address(vault), dex), 42 ether);
        assertEq(vault.liveApprovalCount(), 1);
    }

    function test_cancelDuringWindow_killsRequest() public {
        vm.startPrank(owner);
        uint256 id = vault.requestApproval(address(token), attacker, 1 ether);
        vault.cancelApproval(id);
        skip(DELAY);
        vm.expectRevert(DeadboltVault.RequestDead.selector);
        vault.executeApproval(id);
        vm.stopPrank();
        assertEq(token.allowance(address(vault), attacker), 0);
    }

    // ------------------------------------------------- the demo moment

    /// Owner is phished into approving the drainer. Behind the vault, the
    /// drainer's approval is quarantined, so the drain reverts.
    function test_drainerBlockedByGuard() public {
        vm.prank(owner);
        vault.requestApproval(address(token), address(drainer), type(uint256).max);

        // attacker fires immediately — no allowance exists, transferFrom fails
        vm.prank(attacker);
        vm.expectRevert();
        drainer.drain(address(token), address(vault), attacker, FUND);

        assertEq(token.balanceOf(address(vault)), FUND, "funds never moved");
        assertEq(token.balanceOf(attacker), 0);
    }

    // -------------------------------------------------------- panic

    function test_panic_revokesEverythingAndLocks() public {
        vm.startPrank(owner);
        vault.setTrustedSpender(dex, true);
        vault.setTrustedSpender(attacker, true);
        vault.requestApproval(address(token), dex, 100 ether);
        vault.requestApproval(address(token), attacker, 200 ether);
        assertEq(vault.liveApprovalCount(), 2);

        vault.panic();
        vm.stopPrank();

        assertEq(token.allowance(address(vault), dex), 0);
        assertEq(token.allowance(address(vault), attacker), 0);
        assertEq(vault.liveApprovalCount(), 0);
        assertTrue(vault.locked());
    }

    function test_panic_invalidatesQueue() public {
        vm.startPrank(owner);
        uint256 id = vault.requestApproval(address(token), attacker, 1 ether);
        vault.panic();
        vault.unlock(); // unlock so we hit the epoch check, not the lock check
        skip(DELAY);
        // request belonged to the pre-panic epoch — dead forever
        vm.expectRevert(DeadboltVault.RequestDead.selector);
        vault.executeApproval(id);
        vm.stopPrank();
    }

    function test_lockedVault_rejectsNewApprovals() public {
        vm.startPrank(owner);
        vault.panic();
        vm.expectRevert(DeadboltVault.VaultLocked.selector);
        vault.requestApproval(address(token), dex, 1 ether);
        vm.stopPrank();
    }

    function test_unlock_restoresApprovals() public {
        vm.startPrank(owner);
        vault.panic();
        vault.unlock();
        assertFalse(vault.locked());
        vault.setTrustedSpender(dex, true);
        vault.requestApproval(address(token), dex, 5 ether);
        vm.stopPrank();
        assertEq(token.allowance(address(vault), dex), 5 ether);
    }

    // ------------------------------------------------------- access

    function test_onlyOwner_canRequest() public {
        vm.prank(attacker);
        vm.expectRevert(DeadboltVault.NotOwner.selector);
        vault.requestApproval(address(token), dex, 1 ether);
    }

    function test_onlyOwner_canPanic() public {
        vm.prank(attacker);
        vm.expectRevert(DeadboltVault.NotOwner.selector);
        vault.panic();
    }

    function test_onlyOwner_canWithdraw() public {
        vm.prank(attacker);
        vm.expectRevert(DeadboltVault.NotOwner.selector);
        vault.withdraw(address(token), attacker, 1 ether);
    }

    // ----------------------------------------------------- panic scale

    /// panic() must slam every door even with many open — parallel/cheap on Monad.
    function test_panic_manyApprovals(uint8 raw) public {
        uint256 n = bound(uint256(raw), 1, 30);
        vm.startPrank(owner);
        for (uint256 i = 0; i < n; i++) {
            address s = address(uint160(0x1000 + i));
            vault.setTrustedSpender(s, true);
            vault.requestApproval(address(token), s, (i + 1) * 1 ether);
        }
        assertEq(vault.liveApprovalCount(), n);
        vault.panic();
        vm.stopPrank();
        assertEq(vault.liveApprovalCount(), 0);
    }

    // ----------------------------------------------------- fuzz delay

    function test_setDelay_boundsEnforced(uint64 d) public {
        vm.startPrank(owner);
        if (d < vault.MIN_DELAY() || d > vault.MAX_DELAY()) {
            vm.expectRevert(DeadboltVault.DelayOutOfRange.selector);
            vault.setTimelockDelay(d);
        } else {
            vault.setTimelockDelay(d);
            assertEq(vault.timelockDelay(), d);
        }
        vm.stopPrank();
    }
}
