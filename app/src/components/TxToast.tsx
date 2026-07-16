import { explorerTx } from "../config/chain";

type Props = {
  status: "idle" | "pending" | "mined" | "error";
  hash?: `0x${string}`;
  label?: string;
  error?: string;
};

export function TxToast({ status, hash, label, error }: Props) {
  if (status === "idle") return null;

  return (
    <div className="toast">
      {status === "pending" && <span className="spin" />}
      {status === "mined" && <span>✅</span>}
      {status === "error" && <span>⚠️</span>}
      <span>
        {status === "pending" && `${label ?? "Working"}…`}
        {status === "mined" && `${label ?? "Done"} — confirmed`}
        {status === "error" && (error ?? "Transaction failed")}
      </span>
      {hash && (
        <a className="link" href={explorerTx(hash)} target="_blank" rel="noreferrer">
          view ↗
        </a>
      )}
    </div>
  );
}
