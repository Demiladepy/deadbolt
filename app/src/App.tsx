import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";
import { factoryAbi, FACTORY_ADDRESS } from "./config/contracts";
import { Hero } from "./components/Hero";
import { VaultDashboard } from "./components/VaultDashboard";
import { CreateVault } from "./components/CreateVault";

export default function App() {
  const { address, isConnected } = useAccount();

  const { data: vaults, refetch } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi as never,
    functionName: "vaultsOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const vaultList = (vaults as Address[] | undefined) ?? [];
  const vault = vaultList.length ? vaultList[vaultList.length - 1] : undefined;

  return (
    <>
      <div className="aurora" />
      <div className="grain" />
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="lock">🔒</span>
            Deadbolt
          </div>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="https://github.com/Demiladepy/deadbolt" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
        </nav>

        <Hero />

        {isConnected && address && (
          <>
            {vault ? (
              <VaultDashboard vault={vault} user={address} />
            ) : (
              <CreateVault onCreated={() => refetch()} />
            )}
          </>
        )}

        <footer className="foot">
          <span>Deadbolt · onchain approval firewall · Monad testnet (10143)</span>
          <span>Sign anything, lose nothing.</span>
        </footer>
      </div>
    </>
  );
}
