# Deadbolt

**An onchain approval firewall on Monad.** Gate every token approval by a policy you set onchain, and wipe every risky approval in one signature.

> Sign anything, lose nothing.

Wallet-drainer phishing is the #1 documented money-loss in crypto — the chain works fine; people just sign things they don't understand. A browser extension can be spoofed. An onchain guard contract cannot. Deadbolt puts the firewall where the money is.

## What it does

- **Guard vault** — your tokens live behind a policy: approvals to trusted spenders go through instantly, approvals to unknown spenders are quarantined in a cancelable timelock.
- **Panic** — one signature revokes every outstanding approval and locks the vault. Sub-second on Monad.
- **Scanner** — see and revoke every live ERC-20/721 approval on your EOA.

## Status

Contracts live & verified on **Monad testnet** (chain id `10143`). Frontend in progress. See [SPEC.md](./SPEC.md).

| Contract | Address |
|---|---|
| DeadboltFactory | [`0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78`](https://testnet.monadexplorer.com/address/0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78) |
| Demo token (dUSD) | [`0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C`](https://testnet.monadexplorer.com/address/0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C) |
| Drainer (demo) | [`0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1`](https://testnet.monadexplorer.com/address/0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1) |

Built for Monad Spark.

## Stack

Solidity + Foundry · React + Vite + TypeScript · wagmi/viem + RainbowKit
