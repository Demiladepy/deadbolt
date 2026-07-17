import { explorerTx } from "../config/chain";

type Props = {
  status: "idle" | "pending" | "mined" | "error";
  hash?: `0x${string}`;
  label?: string;
  error?: string;
  ms?: number;
};

const dot = (color: string) => (
  <span
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      flex: "none",
    }}
  />
);

export function TxToast({ status, hash, label, error, ms }: Props) {
  if (status === "idle") return null;

  return (
    <div className="toast">
      {status === "pending" && <span className="spin" />}
      {status === "mined" && dot("var(--safe)")}
      {status === "error" && dot("var(--danger)")}
      <span>
        {status === "pending" && `${label ?? "Working"}…`}
        {status === "mined" &&
          `${label ?? "Done"} — confirmed${ms ? ` in ${(ms / 1000).toFixed(2)}s on Monad` : ""}`}
        {status === "error" && (error ?? "Transaction failed")}
      </span>
      {hash && (
        <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
          view ↗
        </a>
      )}
    </div>
  );
}
