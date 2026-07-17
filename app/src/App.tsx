import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";
import { factoryAbi, FACTORY_ADDRESS } from "./config/contracts";
import { Hero } from "./components/Hero";
import { VaultDashboard } from "./components/VaultDashboard";
import { CreateVault } from "./components/CreateVault";
import { ApprovalScanner } from "./components/ApprovalScanner";
import { LockMark } from "./components/LockMark";
import { AudioToggle } from "./components/AudioToggle";

type Tab = "vault" | "scanner";

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("vault");

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
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <LockMark />
            Deadbolt
          </div>
          <div className="nav-links">
            <a href="https://github.com/Demiladepy/deadbolt" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">
              Faucet
            </a>
          </div>
          <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
        </nav>

        <Hero />

        {isConnected && address && (
          <>
            <div className="tabs">
              <button
                className={`tab ${tab === "vault" ? "active" : ""}`}
                onClick={() => setTab("vault")}
              >
                Guard vault
              </button>
              <button
                className={`tab ${tab === "scanner" ? "active" : ""}`}
                onClick={() => setTab("scanner")}
              >
                Approval scanner
              </button>
            </div>

            {tab === "vault" ? (
              vault ? (
                <VaultDashboard vault={vault} user={address} />
              ) : (
                <CreateVault onCreated={() => refetch()} />
              )
            ) : (
              <ApprovalScanner user={address} />
            )}
          </>
        )}

        <footer className="foot">
          <span>Deadbolt · Monad testnet · chain 10143</span>
          <span>Sign anything, lose nothing.</span>
        </footer>
      </div>
      <AudioToggle />
    </>
  );
}
