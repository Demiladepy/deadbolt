import type { Address } from "viem";
import DeadboltFactoryAbi from "../abi/DeadboltFactory.json";
import DeadboltVaultAbi from "../abi/DeadboltVault.json";
import MockERC20Abi from "../abi/MockERC20.json";
import DrainerAbi from "../abi/Drainer.json";

/// Deployed + verified on Monad testnet (chain 10143). See deployments.json.
export const FACTORY_ADDRESS = "0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78" as Address;
export const DEMO_TOKEN_ADDRESS = "0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C" as Address;
export const DRAINER_ADDRESS = "0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1" as Address;

export const factoryAbi = DeadboltFactoryAbi;
export const vaultAbi = DeadboltVaultAbi;
export const erc20Abi = MockERC20Abi;
export const drainerAbi = DrainerAbi;
