import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { monadTestnet } from "./chain";

// Injected-only: connects to whatever extension wallet is installed
// (MetaMask, Rabby, OKX…) with no WalletConnect relay — so there's no
// projectId/allowlist dependency and connect works on any origin.
// To add mobile WalletConnect later, swap in getDefaultConfig with a real
// projectId from https://cloud.reown.com and that domain allowlisted.
const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [injectedWallet] }],
  { appName: "Deadbolt", projectId: "deadbolt" }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  ssr: false,
});
