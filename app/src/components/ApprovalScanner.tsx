import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { encodeFunctionData, type Address } from "viem";
import { ERC20 } from "../lib/erc20";
import { monadTestnet, explorerAddress } from "../config/chain";
import { fmtToken, shorten } from "../lib/format";

type LiveApproval = {
  token: Address;
  spender: Address;
  symbol: string;
  decimals: number;
  allowance: bigint;
};

/**
 * Scans the connected EOA's own ERC-20 approvals (the Revoke.cash-style
 * supporting feature) and revokes them — one at a time, or all in a single
 * confirmation on wallets that support EIP-5792 wallet_sendCalls.
 */
export function ApprovalScanner({ user }: { user: Address }) {
  const publicClient = usePublicClient();
  const { connector } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [rows, setRows] = useState<LiveApproval[]>([]);
  const [error, setError] = useState<string>("");
  const [batchable, setBatchable] = useState(false);
  const [busyKey, setBusyKey] = useState<string>("");

  const keyOf = (a: LiveApproval) => `${a.token}-${a.spender}`;

  // Detect EIP-5792 atomic-batch capability once we know the connector.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const provider = (await connector?.getProvider()) as
          | { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
          | undefined;
        if (!provider) return;
        const caps = (await provider.request({
          method: "wallet_getCapabilities",
          params: [user],
        })) as Record<string, { atomic?: { status?: string }; atomicBatch?: { supported?: boolean } }>;
        const chainHex = `0x${monadTestnet.id.toString(16)}`;
        const c = caps?.[chainHex];
        const ok =
          c?.atomicBatch?.supported === true ||
          c?.atomic?.status === "supported" ||
          c?.atomic?.status === "ready";
        if (alive) setBatchable(!!ok);
      } catch {
        if (alive) setBatchable(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [connector, user]);

  const scan = useCallback(async () => {
    if (!publicClient) return;
    setScanning(true);
    setError("");
    try {
      const latest = await publicClient.getBlockNumber();
      // Monad public RPC caps getLogs ranges, so walk backwards in windows.
      const WINDOW = 90n;
      const SPAN = 50_000n; // recent history is enough for a live wallet
      const from = latest > SPAN ? latest - SPAN : 0n;

      const logs: { address: Address; args: { spender?: Address } }[] = [];
      for (let hi = latest; hi >= from; hi -= WINDOW + 1n) {
        const lo = hi > from + WINDOW ? hi - WINDOW : from;
        const chunk = await publicClient.getLogs({
          event: ERC20[0],
          args: { owner: user },
          fromBlock: lo,
          toBlock: hi,
        });
        for (const l of chunk) logs.push(l as never);
        if (lo === from) break;
      }

      // unique (token, spender) pairs
      const pairs = new Map<string, { token: Address; spender: Address }>();
      for (const l of logs) {
        const spender = l.args.spender;
        if (!spender) continue;
        pairs.set(`${l.address}-${spender}`, { token: l.address, spender });
      }

      const found: LiveApproval[] = [];
      for (const { token, spender } of pairs.values()) {
        const [allowance, symbol, decimals] = await Promise.all([
          publicClient.readContract({ address: token, abi: ERC20, functionName: "allowance", args: [user, spender] }) as Promise<bigint>,
          publicClient.readContract({ address: token, abi: ERC20, functionName: "symbol" }).catch(() => "?") as Promise<string>,
          publicClient.readContract({ address: token, abi: ERC20, functionName: "decimals" }).catch(() => 18) as Promise<number>,
        ]);
        if (allowance > 0n) found.push({ token, spender, symbol, decimals, allowance });
      }

      found.sort((a, b) => (b.allowance > a.allowance ? 1 : -1));
      setRows(found);
      setScanned(true);
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [publicClient, user]);

  async function revokeOne(a: LiveApproval) {
    setBusyKey(keyOf(a));
    try {
      const hash = await writeContractAsync({
        chainId: monadTestnet.id,
        address: a.token,
        abi: ERC20,
        functionName: "approve",
        args: [a.spender, 0n],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setRows((rs) => rs.filter((r) => keyOf(r) !== keyOf(a)));
    } catch {
      /* user rejected or reverted — leave the row in place */
    } finally {
      setBusyKey("");
    }
  }

  async function revokeAll() {
    if (rows.length === 0) return;
    setBusyKey("__all__");
    const calls = rows.map((a) => ({
      to: a.token,
      data: encodeFunctionData({ abi: ERC20, functionName: "approve", args: [a.spender, 0n] }),
    }));
    try {
      if (batchable) {
        const provider = (await connector?.getProvider()) as {
          request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
        await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "1.0",
              chainId: `0x${monadTestnet.id.toString(16)}`,
              from: user,
              calls,
            },
          ],
        });
        setRows([]);
      } else {
        // honest fallback: sequential approvals, same as Revoke.cash
        for (const a of [...rows]) {
          const hash = await writeContractAsync({
            chainId: monadTestnet.id,
            address: a.token,
            abi: ERC20,
            functionName: "approve",
            args: [a.spender, 0n],
          });
          await publicClient?.waitForTransactionReceipt({ hash });
          setRows((rs) => rs.filter((r) => keyOf(r) !== keyOf(a)));
        }
      }
    } catch {
      /* aborted — whatever succeeded already dropped from the list */
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="dash">
      <div className="section-head">
        <h2>
          Approval <span className="serif">scanner</span>
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={scan} disabled={scanning}>
          {scanning ? "Scanning…" : scanned ? "Rescan" : "Scan my wallet"}
        </button>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Live approvals on your wallet</span>
          {batchable && <span className="badge on">EIP-5792 · batchable</span>}
        </div>

        {!scanned && !scanning && (
          <div className="empty">
            Scan to list every live ERC-20 approval on{" "}
            <span className="mono">{shorten(user, 5)}</span> and revoke the risky ones.
          </div>
        )}
        {scanning && <div className="empty">Reading Approval logs from Monad…</div>}
        {error && <div className="verdict drained">{error}</div>}

        {scanned && !scanning && rows.length === 0 && !error && (
          <div className="empty">No live approvals found. Your wallet is clean.</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="list">
              {rows.map((a) => (
                <div className="item" key={keyOf(a)}>
                  <div>
                    <div className="who">
                      {shorten(a.spender, 6)}{" "}
                      <a className="link" href={explorerAddress(a.spender)} target="_blank" rel="noreferrer">
                        ↗
                      </a>
                    </div>
                    <div className="meta">
                      {fmtToken(a.allowance, a.decimals)} {a.symbol} · token {shorten(a.token, 5)}
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={!!busyKey}
                      onClick={() => revokeOne(a)}
                    >
                      {busyKey === keyOf(a) ? "…" : "Revoke"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <hr className="hr" />
            <button className="btn btn-danger full" disabled={!!busyKey} onClick={revokeAll}>
              {busyKey === "__all__"
                ? "Revoking…"
                : batchable
                ? `Revoke all ${rows.length} in one signature`
                : `Revoke all ${rows.length}`}
            </button>
            <p className="hint">
              {batchable ? (
                <>
                  Your wallet supports <b>EIP-5792</b>, so every revoke is bundled into a
                  single confirmation.
                </>
              ) : (
                <>
                  Your wallet signs each revoke separately. Connect an EIP-5792 wallet to
                  batch them into one.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
