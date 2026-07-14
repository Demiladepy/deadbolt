# Deadbolt Contracts

Foundry workspace for the Deadbolt approval firewall.

- `DeadboltVault.sol` — personal vault enforcing the approval policy (allowlist + timelock quarantine + one-tx `panic()` revoke-all).
- `DeadboltFactory.sol` — deploys and registers vaults per owner.
- `mocks/` — `MockERC20` and `Drainer` for the testnet demo. **Not for mainnet.**

## Build & test

```bash
forge build
forge test
```

17 tests cover the trusted/timelock/cancel/panic paths, the drainer-blocked demo, access control, and fuzzed panic-at-scale + delay bounds.

## Deploy to Monad testnet (chain id 10143)

```bash
cp .env.example .env      # fill PRIVATE_KEY with a faucet-funded throwaway key
source .env
forge script script/Deploy.s.sol \
  --rpc-url $MONAD_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

Verify on the Monad testnet explorer so judges don't hit the "Mystery Box" penalty. Deployed addresses are written to `deployments.json` (see repo root).
