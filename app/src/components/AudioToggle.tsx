import { useState } from "react";
import { startAmbient, stopAmbient } from "../lib/audio";

export function AudioToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await stopAmbient();
        setOn(false);
      } else {
        await startAmbient();
        setOn(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`audio-toggle ${on ? "on" : ""}`}
      onClick={toggle}
      aria-label={on ? "Mute ambient sound" : "Play ambient sound"}
      title={on ? "Mute ambient" : "Ambient sound"}
    >
      {on ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
          <path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
          <path d="M17 9.5l4 5M21 9.5l-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
