import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import type { Abi, Address } from "viem";
import { monadTestnet } from "../config/chain";

function cleanError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string };
  const raw = err?.shortMessage || err?.message || "Transaction failed";
  if (/insufficient funds/i.test(raw)) return "Insufficient MON for gas — get testnet MON from the faucet.";
  if (/user rejected|denied|rejected the request/i.test(raw)) return "Request rejected in wallet.";
  if (/chain|network/i.test(raw) && /mismatch|does not match|switch/i.test(raw))
    return "Wrong network — switch your wallet to Monad testnet.";
  return raw.split("\n")[0];
}

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
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
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
        // Make sure the wallet is on Monad testnet before sending, otherwise
        // the write reverts with a chain-mismatch the user can't act on.
        if (chainId !== monadTestnet.id) {
          await switchChainAsync({ chainId: monadTestnet.id });
        }
        const hash = await writeContractAsync({
          chainId: monadTestnet.id,
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
        setState({ status: "error", error: cleanError(e), label: args.label });
        setTimeout(() => setState({ status: "idle" }), 6000);
        return { ok: false, ms: 0 };
      }
    },
    [writeContractAsync, publicClient, onDone, chainId, switchChainAsync]
  );

  return { ...state, run, busy: state.status === "pending" };
}
