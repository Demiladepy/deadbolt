# Deadbolt

**An onchain approval firewall on Monad.** Gate every token approval by a policy you set onchain, and wipe every risky approval in one signature.

> Sign anything, lose nothing.

Wallet-drainer phishing is the #1 documented money-loss in crypto — the chain works fine; people just sign things they don't understand. A browser extension can be spoofed. An onchain guard contract cannot. Deadbolt puts the firewall where the money is.

## 3-minute judge path

1. Open the live app → [deadbolt-gamma.vercel.app](https://deadbolt-gamma.vercel.app) (or `cd app && npm run dev`).
2. Get testnet MON → [faucet.monad.xyz](https://faucet.monad.xyz). Switch wallet to **Monad testnet** (chain `10143`).
3. **Connect wallet** → **Deploy vault** (use the 5 min preset).
4. On the **Live proof · 4 taps** board:
   - **01 Fund** → Mint 1,000 dUSD → Deposit into vault
   - **02 Phish** → Sign phishing approval (Demo drainer)
   - **03 Drain** → Fire drain attempt → green **Blocked** bar (funds never moved)
   - **04 Panic** → Panic — revoke all
5. Optional: **Approval scanner** tab to revoke live EOA approvals.

If you can complete steps 1–4 in under three minutes, the core product works.

## What it does

- **Guard vault** — tokens sit behind allowlist + cancelable timelock on unknown spenders.
- **Panic** — one signature revokes every outstanding vault approval and locks the vault.
- **Live attack path** — sign the Demo drainer’s malicious approval → quarantine → drain reverts.
- **Scanner** — list and revoke EOA ERC-20 approvals (EIP-5792 batch when the wallet supports it).

## Contracts (Monad testnet `10143`)

| Contract | Address |
|---|---|
| DeadboltFactory | [`0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78`](https://testnet.monadexplorer.com/address/0x1B896cb2D43F812feEa43aCEBA1D05f2Ed8bbE78) |
| Demo token (dUSD) | [`0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C`](https://testnet.monadexplorer.com/address/0x2DE0D591b708e5f1f1F7878d912e3EAB971F224C) |
| Demo drainer | [`0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1`](https://testnet.monadexplorer.com/address/0xDd4C500bf704D58cd9E1631fe70C92392FfB89d1) |

## Run locally

```bash
cd app
npm install
npm run dev
```

## Deploy app

Import the repo at [vercel.com/new](https://vercel.com/new), set **Root Directory** to `app`, deploy. Contracts: see [contracts/README.md](contracts/README.md).

## Demo video script (~45s)

1. Hook (5s): “This is what a wallet-drainer approval looks like.”
2. Sign phishing → show quarantine (10s).
3. Fire drain → **Blocked**, vault balance unchanged (15s).
4. Hit **Panic** → every door closed (10s).
5. Close (5s): “Sign anything, lose nothing. Deadbolt on Monad.”

## Stack

Solidity + Foundry · React + Vite + TypeScript · wagmi/viem + RainbowKit

Built for Monad Spark.
