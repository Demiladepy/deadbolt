import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import type { Abi, Address } from "viem";

type TxState = {
  status: "idle" | "pending" | "mined" | "error";
  hash?: `0x${string}`;
  label?: string;
  error?: string;
  ms?: number; // submit → mined latency (excludes wallet signing time)
};

export type TxResult = { ok: boolean; ms: number };

/**
 * Small helper around writeContract that waits for the receipt and exposes a
 * single status the UI can surface honestly — no fake success toasts.
 * It also times inclusion (hash → receipt) so the UI can show how fast Monad
 * confirms, without counting the seconds a human spends clicking "confirm".
 */
export function useTx(onDone?: () => void) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(
    async (args: {
      address: Address;
      abi: Abi | unknown;
      functionName: string;
      args?: unknown[];
      label: string;
    }): Promise<TxResult> => {
      setState({ status: "pending", label: args.label });
      try {
        const hash = await writeContractAsync({
          address: args.address,
          abi: args.abi as Abi,
          functionName: args.functionName,
          args: args.args ?? [],
        });
        // start timing only once the tx is in the mempool
        const t0 = performance.now();
        setState({ status: "pending", hash, label: args.label });
        await publicClient?.waitForTransactionReceipt({ hash });
        const ms = Math.round(performance.now() - t0);
        setState({ status: "mined", hash, label: args.label, ms });
        onDone?.();
        setTimeout(() => setState({ status: "idle" }), 4500);
        return { ok: true, ms };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setState({ status: "error", error: msg.split("\n")[0], label: args.label });
        setTimeout(() => setState({ status: "idle" }), 6000);
        return { ok: false, ms: 0 };
      }
    },
    [writeContractAsync, publicClient, onDone]
  );

  return { ...state, run, busy: state.status === "pending" };
}
