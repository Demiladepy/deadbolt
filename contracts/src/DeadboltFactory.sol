// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DeadboltVault} from "./DeadboltVault.sol";

/// @title DeadboltFactory — deploy your personal approval firewall
contract DeadboltFactory {
    event VaultCreated(address indexed owner, address vault, uint64 timelockDelay);

    mapping(address owner => address[] vaults) private _vaultsOf;

    function createVault(uint64 timelockDelay) external returns (address vault) {
        vault = address(new DeadboltVault(msg.sender, timelockDelay));
        _vaultsOf[msg.sender].push(vault);
        emit VaultCreated(msg.sender, vault, timelockDelay);
    }

    function vaultsOf(address owner) external view returns (address[] memory) {
        return _vaultsOf[owner];
    }

    function vaultCount(address owner) external view returns (uint256) {
        return _vaultsOf[owner].length;
    }
}
