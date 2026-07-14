# Deadbolt

**An onchain approval firewall on Monad.** Gate every token approval by a policy you set onchain, and wipe every risky approval in one signature.

> Sign anything, lose nothing.

Wallet-drainer phishing is the #1 documented money-loss in crypto — the chain works fine; people just sign things they don't understand. A browser extension can be spoofed. An onchain guard contract cannot. Deadbolt puts the firewall where the money is.

## What it does

- **Guard vault** — your tokens live behind a policy: approvals to trusted spenders go through instantly, approvals to unknown spenders are quarantined in a cancelable timelock.
- **Panic** — one signature revokes every outstanding approval and locks the vault. Sub-second on Monad.
- **Scanner** — see and revoke every live ERC-20/721 approval on your EOA.

## Status

Day 0 — spec and scaffold. See [SPEC.md](./SPEC.md).

Built for Monad Spark on **Monad testnet** (chain id `10143`).

## Stack

Solidity + Foundry · React + Vite + TypeScript · wagmi/viem + RainbowKit
