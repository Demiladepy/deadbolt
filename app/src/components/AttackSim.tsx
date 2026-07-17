import { useState } from "react";
import { useReadContract, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import {
  vaultAbi,
  drainerAbi,
  DRAINER_ADDRESS,
  DEMO_TOKEN_ADDRESS,
} from "../config/contracts";
import { ERC20 } from "../lib/erc20";
import { fmtToken, shorten } from "../lib/format";
import { explorerAddress } from "../config/chain";

type Verdict = null | "blocked" | "drained";

/**
 * The live demo. Owner (phished) approves the drainer; because it is an unknown
 * spender the vault quarantines the request, so the drainer's drain() reverts.
 * If the owner deliberately trusts + executes, the drain succeeds — showing the
 * policy is the only thing standing between a signature and a loss.
 */
export function AttackSim({
  vault,
  user,
  decimals,
  symbol,
  onChange,
}: {
  vault: Address;
  user: Address;
  decimals: number;
  symbol: string;
  onChange: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [note, setNote] = useState<string>("");

  const { data: drainerAllowance, refetch: refetchAllow } = useReadContract({
    address: DEMO_TOKEN_ADDRESS,
    abi: ERC20,
    functionName: "allowance",
    args: [vault, DRAINER_ADDRESS],
    query: { refetchInterval: 5000 },
  });

  const allowance = (drainerAllowance as bigint) ?? 0n;
  const armed = allowance > 0n;

  async function phish() {
    // Owner is tricked into requesting an unlimited approval for the drainer.
    setBusy(true);
    setVerdict(null);
    try {
      const hash = await writeContractAsync({
        address: vault,
        abi: vaultAbi as never,
        functionName: "requestApproval",
        args: [DEMO_TOKEN_ADDRESS, DRAINER_ADDRESS, parseUnits("1000000", decimals)],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setNote("Signed. The request is now sitting in quarantine — not granted.");
      onChange();
    } catch (e) {
      setNote(e instanceof Error ? e.message.split("\n")[0] : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function fire() {
    setBusy(true);
    setVerdict(null);
    try {
      // Attacker calls drain(). With no allowance this reverts on estimation.
      const hash = await writeContractAsync({
        address: DRAINER_ADDRESS,
        abi: drainerAbi as never,
        functionName: "drain",
        args: [DEMO_TOKEN_ADDRESS, vault, user, allowance > 0n ? allowance : 1n],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setVerdict("drained");
      onChange();
      refetchAllow();
    } catch {
      // Expected path: the guard never approved the drainer, so it can't move a thing.
      setVerdict("blocked");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Live attack simulation</div>
      <div className="steps">
        <div className={`step ${true ? "done" : ""}`}>
          <div className="step-n">1</div>
          <div className="step-body">
            <h4>You get phished into approving a drainer</h4>
            <p>
              A malicious dApp asks for an unlimited approval to{" "}
              <a className="link" href={explorerAddress(DRAINER_ADDRESS)} target="_blank" rel="noreferrer">
                {shorten(DRAINER_ADDRESS, 5)}
              </a>
              . Behind the vault, that request is quarantined instead of granted.
            </p>
          </div>
        </div>
        <div className={`step ${armed ? "" : "done"}`}>
          <div className="step-n">2</div>
          <div className="step-body">
            <h4>The drainer fires</h4>
            <p>
              It calls <span className="mono">drain()</span> to sweep your{" "}
              {symbol}. With no live approval, the transfer can't even leave the
              gate.
            </p>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost full" onClick={phish} disabled={busy}>
          {busy ? "…" : "1 · Sign the malicious approval"}
        </button>
        <button
          className={`btn full ${armed ? "btn-danger" : "btn-violet"}`}
          onClick={fire}
          disabled={busy}
        >
          {busy ? "…" : "2 · Fire the drainer"}
        </button>
      </div>

      {note && <p className="hint">{note}</p>}

      {verdict === "blocked" && (
        <div className="verdict blocked">
          Blocked. The vault never approved the drainer, so <span className="mono">drain()</span> reverted — your {symbol} never moved.
        </div>
      )}
      {verdict === "drained" && (
        <div className="verdict drained">
          Drained. You trusted + executed the approval, so the guard stepped aside and the sweep went through. This is what panic is for.
        </div>
      )}

      <p className="hint">
        Current vault → drainer allowance:{" "}
        <b>{fmtToken(allowance, decimals)} {symbol}</b>. Untrusted = 0 = unspendable.
      </p>
    </div>
  );
}
