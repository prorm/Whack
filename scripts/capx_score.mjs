// Original score for the CAPABLE X film, synthesised from scratch (no samples, no licences) and timed to the
// narration manifest: dark -> tension -> collapse -> reveal bloom -> driving engines -> warm close.
//   node scripts/capx_score.mjs  -> outputs/capx/score_raw.wav, loudness-normalised to remotion/public/capx/score.wav
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const M = JSON.parse(fs.readFileSync(path.join(ROOT, "remotion/src/capx/capx.json"), "utf8"));
const SR = 48000;
const FPS = M.fps;
const TOTAL = M.totalFrames / FPS + 1.5;
const N = Math.ceil(TOTAL * SR);
const L = new Float32Array(N), R = new Float32Array(N);

// ---------- timeline from the manifest
const sceneStart = {}, chapStart = {}, beatAt = {};
for (const b of M.beats) {
  if (!(b.scene in sceneStart)) sceneStart[b.scene] = b.startFrame / FPS;
  if (!(b.chapter in chapStart)) chapStart[b.chapter] = b.startFrame / FPS;
  beatAt[b.id] = (b.startFrame + b.leadFrames) / FPS;
}
const T = {
  open: 0,
  race: sceneStart.race,
  collapse: sceneStart.collapse,
  signalHit: beatAt.t7 + 0.25,
  diag: sceneStart.pipeline,
  flip: sceneStart.flip,
  logo: beatAt.v2,
  machine: sceneStart.loop,
  aigap: sceneStart.aigap,
  aiwrong: beatAt.ag2 + 5.2,
  aipair: sceneStart.aipair,
  delta: sceneStart.delta,
  deltaHit: beatAt.y1 + 0.2,
  notagain: sceneStart.notagain,
  chain: sceneStart.chain,
  whynow: sceneStart.whynow,
  close: sceneStart.meet,
  mantra: sceneStart.mantra,
  end: sceneStart.end,
};

// ---------- helpers
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TBL = 4096;
const mkTable = (hs, pow) => {
  const t = new Float32Array(TBL + 1);
  for (let i = 0; i <= TBL; i++) {
    let v = 0;
    for (let h = 1; h <= hs; h++) v += Math.sin((2 * Math.PI * h * i) / TBL) / Math.pow(h, pow);
    t[i] = v;
  }
  let mx = 0; for (const v of t) mx = Math.max(mx, Math.abs(v));
  for (let i = 0; i <= TBL; i++) t[i] /= mx;
  return t;
};
const PAD = mkTable(10, 1.6), SAW = mkTable(14, 1.0), SINE = mkTable(1, 1);
const look = (tb, ph) => { const x = (ph - Math.floor(ph)) * TBL; const i = x | 0; return tb[i] + (tb[i + 1] - tb[i]) * (x - i); };
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const addS = (i, l, r) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; };

/** Sustained chord pad: notes (midi), from t0 to t1, with attack/release, soft low-pass. */
function pad(notes, t0, t1, gain = 0.08, cutoff = 1800, atk = 1.2, rel = 1.6, table = PAD) {
  const s0 = Math.floor(t0 * SR), s1 = Math.floor((t1 + rel) * SR);
  const voices = notes.flatMap((n) => [-0.06, 0.06].map((d) => ({ f: midi(n + d), ph: Math.random(), pan: d > 0 ? 0.35 : -0.35 })));
  let lpL = 0, lpR = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let i = s0; i < s1 && i < N; i++) {
    const t = i / SR;
    const env = Math.min(1, (t - t0) / atk) * (t > t1 ? Math.max(0, 1 - (t - t1) / rel) : 1);
    let l = 0, r = 0;
    for (const v of voices) {
      v.ph += v.f / SR;
      const s = look(table, v.ph);
      l += s * (1 - v.pan); r += s * (1 + v.pan);
    }
    lpL += a * (l - lpL); lpR += a * (r - lpR);
    addS(i, lpL * env * gain / Math.sqrt(voices.length), lpR * env * gain / Math.sqrt(voices.length));
  }
}
/** Plucked note (arp / bass). */
function pluck(n, t, dur, gain, cutoff = 2600, table = SAW, pan = 0) {
  const s0 = Math.floor(t * SR), s1 = Math.floor((t + dur + 0.3) * SR);
  const f = midi(n); let ph = 0, lp = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let i = s0; i < s1 && i < N; i++) {
    const tt = i / SR - t;
    const env = Math.min(1, tt / 0.004) * Math.exp(-tt / (dur * 0.6));
    ph += f / SR;
    lp += a * (look(table, ph) - lp);
    const v = lp * env * gain;
    addS(i, v * (1 - pan), v * (1 + pan));
  }
}
function kick(t, gain = 0.5) {
  const s0 = Math.floor(t * SR); let ph = 0;
  for (let i = 0; i < 0.45 * SR; i++) {
    const tt = i / SR;
    const f = 42 + 120 * Math.exp(-tt / 0.035);
    ph += f / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-tt / 0.16) * gain;
    addS(s0 + i, v, v);
  }
}
function hat(t, gain = 0.05) {
  const s0 = Math.floor(t * SR); let hp = 0, prev = 0;
  for (let i = 0; i < 0.06 * SR; i++) {
    const x = rnd(); hp = 0.85 * (hp + x - prev); prev = x;
    const v = hp * Math.exp(-i / SR / 0.018) * gain;
    addS(s0 + i, v * 0.8, v);
  }
}
function noiseSwell(t0, t1, gain = 0.12, up = true) {
  const s0 = Math.floor(t0 * SR), s1 = Math.floor(t1 * SR); let lp = 0;
  for (let i = s0; i < s1 && i < N; i++) {
    const u = (i - s0) / (s1 - s0);
    const env = up ? u * u : (1 - u) * (1 - u);
    const cut = up ? 300 + 6000 * u * u : 6000 * (1 - u) + 200;
    const a = 1 - Math.exp((-2 * Math.PI * cut) / SR);
    lp += a * (rnd() - lp);
    addS(i, lp * env * gain, lp * env * gain);
  }
}
function boom(t, gain = 0.7) {
  kick(t, gain);
  const s0 = Math.floor(t * SR); let lp = 0;
  for (let i = 0; i < 2.5 * SR; i++) {
    lp += 0.02 * (rnd() - lp);
    const v = (lp * 3 + Math.sin(2 * Math.PI * 38 * i / SR) * 0.6) * Math.exp(-i / SR / 0.7) * gain * 0.5;
    addS(s0 + i, v, v);
  }
}

// ---------- composition
const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4;
// chords as midi note lists (pad voicing) + bass root
const C = {
  Dm: { pad: [50, 57, 62, 65], root: 38, arp: [62, 65, 69, 74] },
  Bb: { pad: [46, 53, 58, 62], root: 34, arp: [58, 62, 65, 70] },
  F: { pad: [53, 57, 60, 65], root: 41, arp: [60, 65, 69, 72] },
  C: { pad: [48, 55, 60, 64], root: 36, arp: [60, 64, 67, 72] },
  D: { pad: [50, 57, 62, 66], root: 38, arp: [62, 66, 69, 74] },
  Bm: { pad: [47, 54, 59, 62], root: 35, arp: [59, 62, 66, 71] },
  G: { pad: [43, 50, 55, 59], root: 31, arp: [59, 62, 67, 71] },
  A: { pad: [45, 52, 57, 61], root: 33, arp: [57, 61, 64, 69] },
};
function section(t0, t1, prog, opt) {
  const { padGain = 0.08, cutoff = 1600, bass = 0, arp = 0, arpDiv = 4, kickPat = null, hats = 0, barsPer = 1, cutRamp = 0 } = opt;
  let k = 0;
  for (let t = t0; t < t1 - 0.05; t += BAR * barsPer, k++) {
    const ch = C[prog[k % prog.length]];
    const te = Math.min(t1, t + BAR * barsPer);
    const u = (t - t0) / Math.max(1, t1 - t0);
    pad(ch.pad, t, te, padGain, cutoff + cutRamp * u, k === 0 ? 1.5 : 0.25, 0.9);
    for (let b = 0; b < 4 * barsPer; b++) {
      const tb = t + b * BEAT;
      if (tb >= t1) break;
      if (bass) for (let e = 0; e < 2; e++) pluck(ch.root, tb + e * BEAT / 2, BEAT / 2.2, bass, 500, SAW);
      if (kickPat && kickPat.includes(b % 4)) kick(tb, 0.26);
      if (hats) { hat(tb + BEAT / 2, hats); }
      if (arp) for (let s = 0; s < arpDiv; s++) {
        const ts = tb + (s * BEAT) / arpDiv;
        if (ts >= t1) break;
        const n = ch.arp[(b * arpDiv + s) % ch.arp.length] + 12;
        pluck(n, ts, BEAT / arpDiv * 1.6, arp * 1.6, 3200 + 1500 * u, SAW, ((s % 2) - 0.5) * 0.5);
      }
    }
  }
}

// cold open + two people: dark, sparse
section(T.open, T.race, ["Dm", "Dm", "Bb", "C"], { padGain: 0.07, cutoff: 900, barsPer: 2 });
for (let t = 0.6; t < T.race; t += 1) hat(t, 0.018); // clock tick
boom(beatAt.q4 + 0.6, 0.35); // "Then AI learned to do the prep"
noiseSwell(beatAt.q6, beatAt.q6 + 2.4, 0.06, true);
boom(beatAt.q6 + 2.4, 0.3); // "...for free"
// arms race + evidence: tension, pulsing bass and heartbeat
section(T.race, T.collapse, ["Dm", "Bb", "Dm", "C"], { padGain: 0.07, cutoff: 900, cutRamp: 1600, bass: 0.07, kickPat: [0], barsPer: 1 });
noiseSwell(T.collapse - 6, T.signalHit, 0.08, true);
// collapse: hit then near silence
boom(T.signalHit, 0.5);
noiseSwell(T.signalHit, T.signalHit + 2.2, 0.06, false);
// diagnosis: cold, minimal
section(T.diag, T.flip, ["Dm", "Bb"], { padGain: 0.06, cutoff: 700, barsPer: 2 });
// reveal: riser -> bloom
noiseSwell(T.flip - 1.5, T.logo, 0.12, true);
boom(T.logo, 0.4);
pad([50, 57, 62, 66, 69, 74], T.logo, T.machine + 0.4, 0.11, 2400, 0.08, 2.0);
// the machine + engines: driving, major
section(T.machine, T.delta, ["D", "Bm", "G", "A"], { padGain: 0.065, cutoff: 1800, bass: 0.06, arp: 0.022, arpDiv: 4, kickPat: [0, 2], hats: 0.025 });
// delta: hit, rebuild
boom(T.deltaHit, 0.38);
boom(T.aiwrong, 0.3);
noiseSwell(T.aipair - 2.2, T.aipair, 0.08, true);
boom(T.aipair + 0.1, 0.32);
section(T.delta, T.chain, ["Bm", "G", "D", "A"], { padGain: 0.07, cutoff: 1400, cutRamp: 1400, bass: 0.06, arp: 0.02, arpDiv: 2, kickPat: [0] });
// why nobody: darker, no kick
section(T.chain, T.whynow, ["Bm", "G", "Bm", "A"], { padGain: 0.065, cutoff: 1100, bass: 0.05, arp: 0.014, arpDiv: 2 });
// why now + infrastructure: full drive
section(T.whynow, T.close, ["D", "Bm", "G", "A"], { padGain: 0.07, cutoff: 2000, cutRamp: 1200, bass: 0.065, arp: 0.024, arpDiv: 4, kickPat: [0, 1, 2, 3], hats: 0.03 });
noiseSwell(T.close - 2.5, T.close, 0.07, true);
// close: warm, no drums; lift on mantra
section(T.close, T.mantra, ["G", "D", "A", "Bm"], { padGain: 0.075, cutoff: 1300, arp: 0.012, arpDiv: 2 });
section(T.mantra, T.end, ["G", "A", "Bm", "D"], { padGain: 0.09, cutoff: 2200, bass: 0.05, arp: 0.02, arpDiv: 4 });
boom(T.end + 0.15, 0.3);
pad([38, 50, 57, 62, 66, 69], T.end + 0.15, TOTAL - 2.2, 0.12, 2600, 0.05, 2.0);

// ---------- reverb (Schroeder)
function reverb(x, mix = 0.22) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ b: new Float32Array(Math.round(d * SR / 44100)), i: 0, fb: 0.80 }));
  const aps = [225, 556].map((d) => ({ b: new Float32Array(Math.round(d * SR / 44100)), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) { const o = c.b[c.i]; c.b[c.i] = x[n] + o * c.fb; c.i = (c.i + 1) % c.b.length; s += o; }
    s *= 0.25;
    for (const a of aps) { const o = a.b[a.i]; const v = -s + o; a.b[a.i] = s + o * 0.5; a.i = (a.i + 1) % a.b.length; s = v; }
    y[n] = x[n] * (1 - mix) + s * mix;
  }
  return y;
}
const RL = reverb(L, 0.28), RR = reverb(R, 0.28);

// ---------- duck under the narration
const duck = new Float32Array(N).fill(1);
for (const b of M.beats) {
  const a = (b.startFrame + b.leadFrames) / FPS - 0.08, e = a + b.speech_s + 0.1;
  for (let i = Math.max(0, Math.floor(a * SR)); i < Math.min(N, e * SR); i++) duck[i] = 0.5;
}
let g = 1; const att = 1 - Math.exp(-1 / (0.06 * SR)), relc = 1 - Math.exp(-1 / (0.5 * SR));
for (let i = 0; i < N; i++) { g += (duck[i] < g ? att : relc) * (duck[i] - g); duck[i] = g; }

// ---------- master: normalise + soft clip, fade out
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(RL[i]), Math.abs(RR[i]));
const norm = 0.5 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 1.2));
  const l = Math.tanh(RL[i] * norm * duck[i] * 1.2) * fade, r = Math.tanh(RR[i] * norm * duck[i] * 1.2) * fade;
  buf.writeInt16LE(Math.round(l * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(r * 32000), 46 + i * 4);
}
const out = path.join(ROOT, "outputs/capx/score_raw.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
const fin = path.join(ROOT, "remotion/public/capx/score.wav");
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", out, "-af", "loudnorm=I=-24:TP=-2:LRA=14", "-ar", "48000", fin]);
console.log(`score ${TOTAL.toFixed(1)}s -> ${fin}`);
