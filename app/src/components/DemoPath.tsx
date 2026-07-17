import { useState } from "react";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import {
  vaultAbi,
  drainerAbi,
  erc20Abi,
  DRAINER_ADDRESS,
  DEMO_TOKEN_ADDRESS,
} from "../config/contracts";
import { fmtToken } from "../lib/format";
import { labelAddress } from "../lib/labels";
import { explorerAddress } from "../config/chain";

type Verdict = null | "blocked" | "drained";

/**
 * The product spine: fund → get phished → fire drain → panic.
 * Judges should understand Deadbolt in four taps.
 */
export function DemoPath({
  vault,
  user,
  decimals,
  symbol,
  vaultBal,
  userBal,
  userAllowance,
  locked,
  busy,
  onMint,
  onDeposit,
  onPanic,
  onUnlock,
  onChange,
}: {
  vault: Address;
  user: Address;
  decimals: number;
  symbol: string;
  vaultBal: bigint;
  userBal: bigint;
  userAllowance: bigint;
  locked: boolean;
  busy: boolean;
  onMint: () => void;
  onDeposit: () => void;
  onPanic: () => void;
  onUnlock: () => void;
  onChange: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [stepBusy, setStepBusy] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [note, setNote] = useState("");
  const [balAtDrain, setBalAtDrain] = useState<bigint | null>(null);

  const { data: drainerAllowance, refetch: refetchAllow } = useReadContract({
    address: DEMO_TOKEN_ADDRESS,
    abi: erc20Abi as never,
    functionName: "allowance",
    args: [vault, DRAINER_ADDRESS],
    query: { refetchInterval: 4000 },
  });

  const allowance = (drainerAllowance as unknown as bigint | undefined) ?? 0n;
  const funded = vaultBal > 0n;
  const needsApprove = userBal > 0n && userAllowance < userBal;
  const working = busy || stepBusy;

  async function phish() {
    setStepBusy(true);
    setVerdict(null);
    try {
      const hash = await writeContractAsync({
        address: vault,
        abi: vaultAbi as never,
        functionName: "requestApproval",
        args: [DEMO_TOKEN_ADDRESS, DRAINER_ADDRESS, parseUnits("1000000", decimals)],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setNote("Signed. Quarantined — not granted.");
      onChange();
    } catch (e) {
      setNote(e instanceof Error ? e.message.split("\n")[0] : "Failed");
    } finally {
      setStepBusy(false);
    }
  }

  async function fire() {
    setStepBusy(true);
    setVerdict(null);
    setBalAtDrain(vaultBal);
    try {
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
      setVerdict("blocked");
    } finally {
      setStepBusy(false);
    }
  }

  return (
    <div className="demo-path">
      <div className="demo-path-head">
        <div>
          <div className="section-kicker">Live proof · 4 taps</div>
          <h3>Get phished. Keep your funds.</h3>
          <p>
            Fund the vault, sign a malicious unlimited approval to the demo
            drainer, watch the drain fail, then slam every door.
          </p>
        </div>
        <a
          className="link"
          href={explorerAddress(DRAINER_ADDRESS)}
          target="_blank"
          rel="noreferrer"
        >
          {labelAddress(DRAINER_ADDRESS)} ↗
        </a>
      </div>

      <div className="demo-steps">
        <div className={`demo-step ${funded ? "done" : "active"}`}>
          <div className="n">01 · Fund</div>
          <h4>{funded ? "Vault funded" : "Mint & deposit"}</h4>
          <p>
            {funded
              ? `${fmtToken(vaultBal, decimals)} ${symbol} protected.`
              : `Mint testnet ${symbol}, then deposit so the vault owns approvals.`}
          </p>
          {!funded && (
            <>
              <button className="btn btn-ghost" onClick={onMint} disabled={working}>
                Mint 1,000 {symbol}
              </button>
              <button
                className="btn btn-primary"
                onClick={onDeposit}
                disabled={working || userBal === 0n}
              >
                {needsApprove ? "Approve deposit" : "Deposit into vault"}
              </button>
            </>
          )}
        </div>

        <div className={`demo-step ${note.includes("Quarantined") ? "done" : funded ? "active" : ""}`}>
          <div className="n">02 · Phish</div>
          <h4>Sign malicious approval</h4>
          <p>
            Unlimited approve for <b>{labelAddress(DRAINER_ADDRESS)}</b>. Deadbolt
            queues it instead of granting it.
          </p>
          <button className="btn btn-warn" onClick={phish} disabled={working || !funded || locked}>
            {stepBusy ? "Signing…" : "Sign phishing approval"}
          </button>
        </div>

        <div className={`demo-step ${verdict === "blocked" ? "done" : note ? "active" : ""}`}>
          <div className="n">03 · Drain</div>
          <h4>Fire the drainer</h4>
          <p>
            Attacker calls <span className="mono">drain()</span>. With allowance 0,
            the transfer cannot leave the vault.
          </p>
          <button className="btn btn-danger" onClick={fire} disabled={working || !funded}>
            {stepBusy ? "Firing…" : "Fire drain attempt"}
          </button>
        </div>

        <div className={`demo-step ${locked ? "done" : verdict === "blocked" ? "active" : ""}`}>
          <div className="n">04 · Panic</div>
          <h4>{locked ? "Vault locked" : "Slam every door"}</h4>
          <p>One signature revokes every live approval and locks new ones.</p>
          {locked ? (
            <button className="btn btn-ghost" onClick={onUnlock} disabled={working}>
              Unlock vault
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onPanic} disabled={working}>
              Panic — revoke all
            </button>
          )}
        </div>
      </div>

      {verdict === "blocked" && (
        <div className="proof-bar safe">
          Blocked. {labelAddress(DRAINER_ADDRESS)} got nothing — vault still holds{" "}
          {fmtToken(vaultBal, decimals)} {symbol}
          {balAtDrain !== null ? ` (was ${fmtToken(balAtDrain, decimals)} before drain)` : ""}.
        </div>
      )}
      {verdict === "drained" && (
        <div className="proof-bar danger">
          Drained. You executed a trusted path — this is what panic exists for.
        </div>
      )}
      {!verdict && note && <div className="proof-bar warn">{note}</div>}
    </div>
  );
}
