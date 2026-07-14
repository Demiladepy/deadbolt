// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {DeadboltFactory} from "../src/DeadboltFactory.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {Drainer} from "../src/mocks/Drainer.sol";

/// @notice Deploys the Deadbolt factory plus the demo token + drainer to Monad testnet.
///         forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --verify
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        DeadboltFactory factory = new DeadboltFactory();
        MockERC20 demoToken = new MockERC20("Deadbolt Demo USD", "dUSD");
        Drainer drainer = new Drainer();

        vm.stopBroadcast();

        console.log("DeadboltFactory:", address(factory));
        console.log("Demo token (dUSD):", address(demoToken));
        console.log("Drainer (demo):", address(drainer));
    }
}
