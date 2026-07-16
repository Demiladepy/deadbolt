import { defineChain } from "viem";

/// Single source of truth for Monad testnet. Never hardcode these elsewhere.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const EXPLORER = monadTestnet.blockExplorers.default.url;

export function explorerAddress(addr: string) {
  return `${EXPLORER}/address/${addr}`;
}

export function explorerTx(hash: string) {
  return `${EXPLORER}/tx/${hash}`;
}
