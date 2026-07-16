import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Deadbolt",
  // Public WalletConnect demo project id. Swap for your own for production.
  projectId: "3fbb6bba6f1de962d911bb5b5c3dba68",
  chains: [monadTestnet],
  ssr: false,
});
