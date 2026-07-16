import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import type { Abi, Address } from "viem";

type TxState = {
  status: "idle" | "pending" | "mined" | "error";
  hash?: `0x${string}`;
  label?: string;
  error?: string;
};

/**
 * Small helper around writeContract that waits for the receipt and exposes a
 * single status the UI can surface honestly — no fake success toasts.
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
    }) => {
      setState({ status: "pending", label: args.label });
      try {
        const hash = await writeContractAsync({
          address: args.address,
          abi: args.abi as Abi,
          functionName: args.functionName,
          args: args.args ?? [],
        });
        setState({ status: "pending", hash, label: args.label });
        await publicClient?.waitForTransactionReceipt({ hash });
        setState({ status: "mined", hash, label: args.label });
        onDone?.();
        setTimeout(() => setState({ status: "idle" }), 4000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setState({ status: "error", error: msg.split("\n")[0], label: args.label });
        setTimeout(() => setState({ status: "idle" }), 6000);
      }
    },
    [writeContractAsync, publicClient, onDone]
  );

  return { ...state, run, busy: state.status === "pending" };
}
