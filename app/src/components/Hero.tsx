import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Hero() {
  return (
    <section className="hero">
      <div className="eyebrow">
        <span className="dot" />
        Onchain approval firewall · Monad testnet
      </div>
      <h1 className="hero-title">
        Sign anything,
        <br />
        <span className="serif">lose nothing.</span>
      </h1>
      <p className="hero-sub">
        Wallet-drainer phishing is the #1 money-loss in crypto — the chain works
        fine, people just sign things they don't understand. Deadbolt puts a
        policy between your tokens and every approval, and wipes every risky one
        in a single signature.
      </p>
      <div className="hero-cta">
        <ConnectButton label="Connect wallet" />
        <a
          className="btn btn-ghost"
          href="https://github.com/Demiladepy/deadbolt"
          target="_blank"
          rel="noreferrer"
        >
          View the code ↗
        </a>
      </div>

      <div className="rail">
        <div className="rail-label">What the guard enforces</div>
        <div className="chips">
          <span className="chip">
            Allowlist <sup>INSTANT</sup>
          </span>
          <span className="chip">
            Timelock <sup>QUARANTINE</sup>
          </span>
          <span className="chip">
            Panic <sup>REVOKE-ALL</sup>
          </span>
          <span className="chip">
            Onchain <sup>UNSPOOFABLE</sup>
          </span>
          <span className="chip">
            One signature <sup>MONAD</sup>
          </span>
        </div>
      </div>
    </section>
  );
}
