import type { Address } from "viem";
import { DRAINER_ADDRESS, DEMO_TOKEN_ADDRESS, FACTORY_ADDRESS } from "../config/contracts";
import { shorten } from "./format";

const KNOWN: Record<string, string> = {
  [DRAINER_ADDRESS.toLowerCase()]: "Demo drainer",
  [DEMO_TOKEN_ADDRESS.toLowerCase()]: "Demo token (dUSD)",
  [FACTORY_ADDRESS.toLowerCase()]: "Deadbolt factory",
};

/** Human label for known contracts; otherwise shortened address. */
export function labelAddress(addr: Address | string, size = 4): string {
  const key = addr.toLowerCase();
  return KNOWN[key] ?? shorten(addr, size);
}

export function isDemoDrainer(addr: Address | string): boolean {
  return addr.toLowerCase() === DRAINER_ADDRESS.toLowerCase();
}
