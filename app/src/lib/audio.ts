// A tiny generated ambient pad — no audio file to ship or license.
// Built lazily on the first user gesture so browser autoplay rules are happy.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;

const TARGET = 0.1;

function build(context: AudioContext) {
  master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 620;
  filter.Q.value = 0.6;
  filter.connect(master);

  // soft minor pad
  const freqs = [110, 164.81, 220, 277.18];
  freqs.forEach((f, i) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    osc.detune.value = i % 2 === 0 ? -5 : 5;
    const g = context.createGain();
    g.gain.value = 0.32 / (i + 1);
    osc.connect(g);
    g.connect(filter);
    osc.start();
  });

  // slow breathing tremolo
  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();

  started = true;
}

export async function startAmbient() {
  if (!ctx) ctx = new AudioContext();
  if (!started) build(ctx);
  await ctx.resume();
  if (master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(TARGET, ctx.currentTime + 1.2);
  }
}

export async function stopAmbient() {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
}
