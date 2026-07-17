import { parseAbi } from "viem";

/** Minimal ERC-20 surface for scanning + revoking arbitrary tokens. */
export const ERC20 = parseAbi([
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
