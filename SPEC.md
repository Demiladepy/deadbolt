# Deadbolt — Onchain Approval Firewall on Monad

**One line:** Gate every token approval by a policy you set onchain, and wipe every risky approval in one signature.
**Tagline:** Sign anything, lose nothing.
**Target:** Monad testnet. Live app + deployed & verified contract. 5-day solo build (Monad Spark).

---

## 1. Day-0 gate results (2026-07-14)

### Network parameters (verified from docs.monad.xyz / chainlist / faucet)

| Param | Testnet (build target) | Mainnet (reference) |
|---|---|---|
| Chain ID | `10143` | `143` |
| RPC | `https://testnet-rpc.monad.xyz` | `https://rpc.monad.xyz` |
| Explorer | `https://testnet.monadexplorer.com` | `https://monadvision.com` |
| Currency | MON | MON |
| Faucet | `https://faucet.monad.xyz` | — |

ERC-4337 EntryPoint v0.7 (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`) is deployed on Monad testnet; Pimlico, Biconomy, ZeroDev, and MetaMask Smart Accounts all support Monad. EIP-7702 is live (Biconomy advertises 7702 support on Monad). **We do not take a 4337 dependency — see §3.**

### Prior art

**Revoke.cash already supports Monad — both mainnet and testnet** (`revoke.cash/token-approval-checker/monad-testnet`). Per the decision rule:

> **→ We lead with the GUARD.** Onchain policy enforcement (allowlist + timelock on unknown spenders + one-signature panic) is the headline. Approval scan + revoke is a supporting feature, not the pitch.

This is also the stronger authenticity story: policy-gated permissions is the ClearGate / Apart Research lane.

## 2. Product

### Lead feature: DeadboltVault (the guard)

A personal onchain firewall the user deploys from a factory. The vault holds the user's tokens; because the **vault** is the token owner, every approval of those tokens must pass through the vault's policy — a browser extension can be spoofed, this cannot.

Policy, enforced in the contract:

1. **Allowlist** — approvals to spenders the owner has explicitly trusted execute instantly.
2. **Timelock** — an approval to an *unknown* spender does not execute. It is queued with a delay (demo: 5 minutes; configurable) and is cancelable during the window. A drainer's "unlimited approval" signature lands in quarantine instead of in the drainer's wallet.
3. **Panic (deadbolt)** — one signature calls `panic()`: the vault revokes **all** outstanding approvals it has granted (native loop, single tx — no 4337 needed, since the vault owns its own approvals), clears the pending queue, and locks new approvals until the owner unlocks.

**The demo moment:** sign the drainer's malicious unlimited-approval request on camera → nothing drains, the guard queued it → hit panic → every door slams in one sub-second Monad tx.

### Supporting feature: EOA approval scanner + revoke

- Connect wallet → scan live ERC-20/721 approvals for the EOA (`eth_getLogs` on `Approval`/`ApprovalForAll` + live `allowance()` reads to filter stale entries).
- Revoke via `approve(spender, 0)`. Where the wallet supports **EIP-5792 `wallet_sendCalls`** (MetaMask w/ 7702 upgrade), batch all revokes into one confirmation; otherwise sequential txs (honest fallback, same as Revoke.cash).

## 3. Batching decision

**Chosen: contract-native batching for the guard; EIP-5792 as progressive enhancement for EOA revokes. No ERC-4337 dependency.**

Reasons:

- The vault grants its own approvals, so `panic()` batch-revokes them in **one ordinary transaction** — no smart-account migration, no bundler, no paymaster, no UserOp signing UX. The "one signature wipes everything" moment is delivered by our own deployed contract, which is exactly what the judges must see.
- ERC-4337 would force users to move to a new account type and adds bundler infra as a live-demo failure mode, for zero additional demo value in a 5-day window.
- EIP-5792 costs ~nothing to feature-detect (`wallet_getCapabilities`) and upgrades the EOA-revoke flow to one signature on supporting wallets, with a clean fallback.

## 4. Contracts (Solidity + Foundry)

- `DeadboltVault.sol` — per-user vault. Deposit/withdraw ERC-20; `requestApproval(token, spender, amount)` → executes if allowlisted, else queues `PendingApproval{eta}`; `executePending` after eta; `cancelPending`; `setAllowlist`; `panic()` (revoke-all + lock); `unlock()`. Tracks an enumerable set of (token, spender) pairs with live approvals so `panic()` can iterate.
- `DeadboltFactory.sol` — `createVault()` + registry (owner → vault), emits event for the app.
- `MockERC20` + a `Drainer` contract for the demo (testnet only, clearly labeled).
- Foundry tests: policy paths (allowlisted, timelocked, cancel, panic under 20 approvals), fuzz on amounts.
- Deploy + **verify** on Monad testnet explorer (unverified = Mystery Box penalty).

## 5. App (React + Vite + TS + wagmi/viem + RainbowKit)

- Chain config for Monad testnet from §1 (single source of truth in `chains.ts`).
- Views: (1) Vault dashboard — balances, allowlist, pending queue with countdown, big red PANIC; (2) Approvals scanner for the connected EOA with revoke / batch-revoke.
- Impeccable-driven visual identity; fits in viewport; no fake toasts — every state change reads back from chain.

## 6. Build order (5 days)

| Day | Ship |
|---|---|
| 0 (today) | This gate: research, decision, repo, SPEC. ✅ |
| 1 | Foundry install; vault + factory contracts + tests green; deploy + verify on testnet. |
| 2 | App scaffold, wallet connect, vault dashboard wired to real contract (deposit, allowlist, request/queue). |
| 3 | Panic flow end-to-end + EOA approval scanner; Drainer demo script. |
| 4 | EIP-5792 batch enhancement (if wallet cooperates), Impeccable polish pass, README, deploy app (live URL). |
| 5 | Demo video (≤3 min), buffer, social post. |

## 7. Guardrails

- Fresh repo (this one), incremental honest commits, no prior-project code.
- One real feature fully working > five half-features. Stretch only after MVP is polished: per-spender caps, mainnet read-only mirror.
- Never hardcode chain data outside `chains.ts` / `foundry.toml`. No placeholder or static approval data anywhere.
