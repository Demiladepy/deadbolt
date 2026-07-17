import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Hero() {
  return (
    <section className="hero">
      <div className="eyebrow">
        <span className="dot" />
        Onchain approval firewall · Monad
      </div>
      <h1 className="hero-title">
        Sign anything,
        <br />
        <span className="amp">lose nothing.</span>
      </h1>
      <p className="hero-sub">
        Deadbolt puts a policy between your tokens and every approval. Phished
        signatures land in quarantine. Panic closes every door in one tx.
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

      <div className="flow-rail" aria-label="How Deadbolt works">
        <div className="flow-item">
          <div className="n">01</div>
          <h3>Allowlist</h3>
          <p>Trusted spenders execute instantly.</p>
        </div>
        <div className="flow-item">
          <div className="n">02</div>
          <h3>Timelock</h3>
          <p>Unknown approvals sit in cancelable quarantine.</p>
        </div>
        <div className="flow-item">
          <div className="n">03</div>
          <h3>Panic</h3>
          <p>One signature revokes every live approval.</p>
        </div>
      </div>
    </section>
  );
}
