import { formatUnits } from "viem";

export function shorten(addr?: string, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function fmtToken(v: bigint, decimals = 18, max = 4) {
  const n = Number(formatUnits(v, decimals));
  if (n === 0) return "0";
  if (n >= 1e9) return "∞";
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

/** Countdown string from an eta (unix seconds). */
export function untilEta(eta: number, now: number) {
  const s = eta - now;
  if (s <= 0) return "ready";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${sec}s`;
}

export const MAX_UINT =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;
