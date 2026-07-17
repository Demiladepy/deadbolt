# Deadbolt

**An onchain approval firewall on Monad.** Gate every token approval by a policy you set onchain, and wipe every risky approval in one signature.

> Sign anything, lose nothing.

Wallet-drainer phishing is the #1 documented money-loss in crypto — the chain works fine; people just sign things they don't understand. A browser extension can be spoofed. An onchain guard contract cannot. Deadbolt puts the firewall where the money is.

## What it does

- **Guard vault** — your tokens live behind a policy: approvals to trusted spenders go through instantly, approvals to unknown spenders are quarantined in a cancelable timelock.
- **Panic** — one signature revokes every outstanding approval and locks the vault. Sub-second on Monad.
- **Live attack sim** — sign a drainer's malicious approval on-screen and watch it get quarantined; the drain reverts and your funds never move.
- **Scanner** — see and revoke every live ERC-20 approval on your own wallet, one at a time or all in a single signature on EIP-5792 wallets.

## Run the app

```bash
cd app
npm install
npm run dev
```

Connect a wallet on Monad testnet (chain `10143`), mint the demo token, deposit it, and try the flows. Get testnet MON from https://faucet.monad.xyz.

## Deploy

The app deploys to **Vercel**. Import the repo at [vercel.com/new](https://vercel.com/new), set **Root Directory** to `app` (Vite is auto-detected via [app/vercel.json](app/vercel.json)), and deploy. Every push to `main` redeploys automatically. Contracts deploy + verify with Foundry — see [contracts/README.md](contracts/README.md).

## Status

Contracts live & verified on **Monad testnet** (chain id `10143`); app complete. See [SPEC.md](./SPEC.md).

| Contract | Address |
|---|---|
| DeadboltFactory | [`0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78`](https://testnet.monadexplorer.com/address/0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78) |
| Demo token (dUSD) | [`0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C`](https://testnet.monadexplorer.com/address/0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C) |
| Drainer (demo) | [`0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1`](https://testnet.monadexplorer.com/address/0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1) |

Built for Monad Spark.

## Stack

Solidity + Foundry · React + Vite + TypeScript · wagmi/viem + RainbowKit
