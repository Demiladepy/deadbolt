import { useEffect, useMemo, useState } from "react";
import { useReadContracts } from "wagmi";
import { parseUnits, type Address } from "viem";
import { vaultAbi, erc20Abi, DEMO_TOKEN_ADDRESS, DRAINER_ADDRESS } from "../config/contracts";
import { explorerAddress } from "../config/chain";
import { useTx } from "../hooks/useTx";
import { TxToast } from "./TxToast";
import { fmtToken, shorten, untilEta } from "../lib/format";

type PendingApproval = {
  token: Address;
  spender: Address;
  amount: bigint;
  eta: bigint;
  epoch: bigint;
  executed: boolean;
  canceled: boolean;
};
type ApprovalKey = { token: Address; spender: Address };

export function VaultDashboard({ vault, user }: { vault: Address; user: Address }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const token = DEMO_TOKEN_ADDRESS;

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: vault, abi: vaultAbi as never, functionName: "locked" },
      { address: vault, abi: vaultAbi as never, functionName: "timelockDelay" },
      { address: vault, abi: vaultAbi as never, functionName: "getLiveApprovals" },
      { address: vault, abi: vaultAbi as never, functionName: "getQueue" },
      { address: token, abi: erc20Abi as never, functionName: "balanceOf", args: [vault] },
      { address: token, abi: erc20Abi as never, functionName: "balanceOf", args: [user] },
      { address: token, abi: erc20Abi as never, functionName: "symbol" },
      { address: token, abi: erc20Abi as never, functionName: "decimals" },
      { address: token, abi: erc20Abi as never, functionName: "allowance", args: [user, vault] },
    ],
    query: { refetchInterval: 5000 },
  });

  const tx = useTx(() => refetch());

  const r = (i: number) => data?.[i]?.result as unknown;
  const locked = (r(0) as boolean) ?? false;
  const delay = Number((r(1) as bigint) ?? 0n);
  const liveApprovals = (r(2) as ApprovalKey[]) ?? [];
  const queue = (r(3) as PendingApproval[]) ?? [];
  const vaultBal = (r(4) as bigint) ?? 0n;
  const userBal = (r(5) as bigint) ?? 0n;
  const symbol = (r(6) as string) ?? "dUSD";
  const decimals = (r(7) as number) ?? 18;
  const userAllowance = (r(8) as bigint) ?? 0n;

  const activeQueue = useMemo(
    () => queue.map((p, id) => ({ ...p, id })).filter((p) => !p.executed && !p.canceled),
    [queue]
  );

  // --- fund flow ---
  const MINT = parseUnits("1000", decimals);
  async function mint() {
    await tx.run({
      address: token,
      abi: erc20Abi,
      functionName: "mint",
      args: [user, MINT],
      label: `Mint 1,000 ${symbol}`,
    });
  }
  async function deposit() {
    if (userAllowance < userBal) {
      await tx.run({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault, userBal],
        label: "Approve vault to pull tokens",
      });
      return;
    }
    await tx.run({
      address: vault,
      abi: vaultAbi,
      functionName: "deposit",
      args: [token, userBal],
      label: `Deposit ${fmtToken(userBal, decimals)} ${symbol}`,
    });
  }

  // --- policy form ---
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("100");
  const [trust, setTrust] = useState(false);
  const validSpender = /^0x[a-fA-F0-9]{40}$/.test(spender);

  async function requestApproval() {
    if (locked) return;
    if (trust) {
      await tx.run({
        address: vault,
        abi: vaultAbi,
        functionName: "setTrustedSpender",
        args: [spender as Address, true],
        label: "Trust spender",
      });
      return;
    }
    await tx.run({
      address: vault,
      abi: vaultAbi,
      functionName: "requestApproval",
      args: [token, spender as Address, parseUnits(amount || "0", decimals)],
      label: "Request approval",
    });
  }

  function useDrainer() {
    setSpender(DRAINER_ADDRESS);
    setTrust(false);
  }

  return (
    <div className="dash">
      <div className="dash-head">
        <h2>
          Your <span className="serif">Deadbolt</span> vault
        </h2>
        <a className="link mono" href={explorerAddress(vault)} target="_blank" rel="noreferrer">
          {shorten(vault, 6)} ↗
        </a>
      </div>

      {locked && (
        <div className="locked-banner">
          🔒 Vault is locked after a panic. No new approvals until you unlock.
        </div>
      )}

      <div className="stat-row">
        <div className="stat">
          <div className="k">Protected balance</div>
          <div className="v mint">
            {fmtToken(vaultBal, decimals)} <span style={{ fontSize: 13 }}>{symbol}</span>
          </div>
        </div>
        <div className="stat">
          <div className="k">Live approvals</div>
          <div className="v violet">{liveApprovals.length}</div>
        </div>
        <div className="stat">
          <div className="k">Quarantined</div>
          <div className="v">{activeQueue.length}</div>
        </div>
        <div className="stat">
          <div className="k">Timelock</div>
          <div className="v">{delay >= 60 ? `${Math.round(delay / 60)}m` : `${delay}s`}</div>
        </div>
      </div>

      <div className="grid">
        {/* left: policy */}
        <div className="card pad-lg">
          <div className="card-title">Request an approval</div>
          <div className="field">
            <label>Spender address</label>
            <div className="row">
              <input
                className="input"
                placeholder="0x…"
                value={spender}
                onChange={(e) => setSpender(e.target.value.trim())}
              />
              <button className="btn btn-ghost btn-sm" onClick={useDrainer} type="button">
                Use demo drainer
              </button>
            </div>
          </div>
          <div className="field">
            <label>Amount ({symbol})</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <label
            style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, color: "var(--muted)", marginBottom: 16, cursor: "pointer" }}
          >
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
            Trust this spender (allowlist — approvals execute instantly)
          </label>
          <button
            className="btn btn-violet"
            disabled={!validSpender || locked || tx.busy}
            onClick={requestApproval}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {trust ? "Add to allowlist" : "Request approval →"}
          </button>
          <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>
            Untrusted spenders are quarantined behind the timelock — a phished
            signature lands in the queue below, not in the attacker's wallet.
          </p>
        </div>

        {/* right: fund */}
        <div className="card pad-lg">
          <div className="card-title">Fund the vault</div>
          <div className="stat" style={{ marginBottom: 16 }}>
            <div className="k">Your wallet ({symbol})</div>
            <div className="v">{fmtToken(userBal, decimals)}</div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={mint}
            disabled={tx.busy}
            style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}
          >
            Mint 1,000 {symbol} (testnet faucet)
          </button>
          <button
            className="btn btn-primary"
            onClick={deposit}
            disabled={tx.busy || userBal === 0n}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {userAllowance < userBal && userBal > 0n
              ? "Approve deposit"
              : `Deposit all into vault`}
          </button>
          <hr className="hr" />
          <p style={{ fontSize: 12.5, color: "var(--faint)", lineHeight: 1.5 }}>
            Tokens live in the vault, so the vault owns every approval — which is
            why one <span style={{ color: "var(--danger)" }}>panic</span> can
            revoke them all.
          </p>
        </div>
      </div>

      {/* quarantine queue */}
      <div className="card">
        <div className="card-title">
          <span>Quarantine queue</span>
          <span style={{ textTransform: "none", letterSpacing: 0 }}>{activeQueue.length} pending</span>
        </div>
        {activeQueue.length === 0 ? (
          <div className="empty">Nothing quarantined. Untrusted approvals would appear here.</div>
        ) : (
          <div className="pending">
            {activeQueue.map((p) => {
              const eta = Number(p.eta);
              const ready = now >= eta;
              return (
                <div className="pending-item" key={p.id}>
                  <div>
                    <div className="who">{shorten(p.spender, 6)}</div>
                    <div className="meta">
                      {fmtToken(p.amount, decimals)} {symbol} ·{" "}
                      {ready ? "timelock elapsed" : `unlocks in ${untilEta(eta, now)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${ready ? "ready" : "wait"}`}>
                      {ready ? "ready" : "waiting"}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={!ready || locked || tx.busy}
                      onClick={() =>
                        tx.run({
                          address: vault,
                          abi: vaultAbi,
                          functionName: "executeApproval",
                          args: [BigInt(p.id)],
                          label: "Execute approval",
                        })
                      }
                    >
                      Execute
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={tx.busy}
                      onClick={() =>
                        tx.run({
                          address: vault,
                          abi: vaultAbi,
                          functionName: "cancelApproval",
                          args: [BigInt(p.id)],
                          label: "Cancel approval",
                        })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* live approvals */}
      <div className="card">
        <div className="card-title">
          <span>Open doors (live approvals)</span>
          <span style={{ textTransform: "none", letterSpacing: 0 }}>{liveApprovals.length}</span>
        </div>
        {liveApprovals.length === 0 ? (
          <div className="empty">No live approvals. Every door is shut.</div>
        ) : (
          <div className="pending">
            {liveApprovals.map((a, i) => (
              <div className="pending-item" key={i}>
                <div>
                  <div className="who">{shorten(a.spender, 6)}</div>
                  <div className="meta">on token {shorten(a.token, 6)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="badge trusted">approved</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={tx.busy}
                    onClick={() =>
                      tx.run({
                        address: vault,
                        abi: vaultAbi,
                        functionName: "revokeApproval",
                        args: [a.token, a.spender],
                        label: "Revoke approval",
                      })
                    }
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* panic */}
      <div className="panic-zone">
        <h3>The deadbolt</h3>
        <p>
          One signature revokes every live approval and locks the vault. Sub-second on Monad.
        </p>
        {locked ? (
          <button
            className="btn btn-ghost"
            disabled={tx.busy}
            onClick={() =>
              tx.run({ address: vault, abi: vaultAbi, functionName: "unlock", args: [], label: "Unlock vault" })
            }
          >
            Unlock vault
          </button>
        ) : (
          <button
            className="btn btn-danger"
            disabled={tx.busy}
            onClick={() =>
              tx.run({ address: vault, abi: vaultAbi, functionName: "panic", args: [], label: "PANIC — revoke everything" })
            }
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            🚨 PANIC — slam every door
          </button>
        )}
      </div>

      <TxToast status={tx.status} hash={tx.hash} label={tx.label} error={tx.error} />
    </div>
  );
}
