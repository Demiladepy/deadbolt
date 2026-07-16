import { useState } from "react";
import { factoryAbi, FACTORY_ADDRESS } from "../config/contracts";
import { useTx } from "../hooks/useTx";
import { TxToast } from "./TxToast";

const PRESETS = [
  { label: "5 min", value: 300 },
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
];

export function CreateVault({ onCreated }: { onCreated: () => void }) {
  const [delay, setDelay] = useState(300);
  const tx = useTx(onCreated);

  return (
    <section className="gate">
      <div className="card pad-lg">
        <h3>Deploy your firewall</h3>
        <p>
          This creates your personal vault contract on Monad testnet. Tokens you
          deposit sit behind its approval policy.
        </p>
        <div className="field">
          <label>Timelock for unknown spenders</label>
          <div className="row" style={{ justifyContent: "center" }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`btn btn-sm ${delay === p.value ? "btn-violet" : "btn-ghost"}`}
                onClick={() => setDelay(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn-violet"
          disabled={tx.busy}
          onClick={() =>
            tx.run({
              address: FACTORY_ADDRESS,
              abi: factoryAbi,
              functionName: "createVault",
              args: [delay],
              label: "Deploy vault",
            })
          }
          style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
        >
          Deploy vault →
        </button>
      </div>
      <TxToast status={tx.status} hash={tx.hash} label={tx.label} error={tx.error} />
    </section>
  );
}
