import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import { FontFaces } from "../design-system";
import data from "./capx.json";
import { K, F, CL, G, LB, at, Grain, Vignette, Mark } from "./kit";
import { Flood, Aarav, Maya, Apart, Race, Evidence, Collapse, Pipeline, Neither, Flip, Unit } from "./scenesA";
import { Grind, AiWave, Reels, AiRoom, Money } from "./scenesC";
import { AiGap, AiPair } from "./scenesD";
import { Loop, Compiler, Graph, Gps, Lab, Unseen, Lanes, Receipt, Contrast, Exchange, Delta, NotAgain, Chain, Versus, WhyNow, Domains, Rail, Meet, Mantra, End } from "./scenesB";

type Beat = (typeof data.beats)[number];
export const CAPX_TOTAL = data.totalFrames;

const SCENES: Record<string, React.FC<{ g: G }>> = {
  grind: Grind, aiwave: AiWave, reels: Reels, airoom: AiRoom, money: Money, aigap: AiGap, aipair: AiPair,
  flood: Flood, aarav: Aarav, maya: Maya, apart: Apart, race: Race, evidence: Evidence, collapse: Collapse, pipeline: Pipeline, neither: Neither,
  flip: Flip, unit: Unit, loop: Loop, compiler: Compiler, graph: Graph, gps: Gps, lab: Lab, unseen: Unseen, lanes: Lanes, receipt: Receipt,
  contrast: Contrast, exchange: Exchange, delta: Delta, notagain: NotAgain, chain: Chain, versus: Versus, whynow: WhyNow, domains: Domains,
  rail: Rail, meet: Meet, mantra: Mantra, end: End,
};
const LIGHT = new Set(["maya", "exchange"]);

type Group = G & { start: number; chapter: string };
const GROUPS: Group[] = (() => {
  const out: Group[] = [];
  for (const b of data.beats as Beat[]) {
    const last = out[out.length - 1];
    if (!last || last.scene !== b.scene) out.push({ scene: b.scene, start: b.startFrame, dur: 0, beats: [], chapter: b.chapter });
    const g = out[out.length - 1];
    const lb: LB = { id: b.id, text: b.text, s: b.startFrame - g.start, lead: b.leadFrames, sp: b.speechFrames, d: b.durationInFrames };
    g.beats.push(lb);
    g.dur = b.startFrame + b.durationInFrames - g.start;
  }
  return out;
})();

// sound design: [scene, beat index, phrase | null, frame offset, file, volume]
const SFX: [string, number, string | null, number, string, number][] = [
  ["grind", 1, "grind leetcode", -3, "ad/sfx/impact.wav", 0.22],
  ["grind", 1, "memorise", -3, "ad/sfx/impact.wav", 0.22],
  ["grind", 1, "build the", -3, "ad/sfx/impact.wav", 0.22],
  ["grind", 1, "polish", -3, "ad/sfx/impact.wav", 0.22],
  ["aiwave", 0, "do the prep", 0, "ad/sfx/glitch.wav", 0.45],
  ["aiwave", 0, "do the prep", 8, "sfx/sfx_zap.m4a", 0.3],
  ["aiwave", 2, "for free", 0, "ad/sfx/impact.wav", 0.55],
  ["reels", 1, "day one", -2, "ad/sfx/tick.wav", 0.4],
  ["reels", 1, "three", -2, "ad/sfx/tick.wav", 0.4],
  ["reels", 1, "seven", -2, "ad/sfx/tick.wav", 0.4],
  ["reels", 1, "twenty-one", -2, "ad/sfx/tick.wav", 0.4],
  ["money", 2, null, -6, "ad/sfx/riser.wav", 0.25],
  ["aigap", 0, "almost nobody", 0, "ad/sfx/glitch.wav", 0.3],
  ["aigap", 1, "it's wrong", -1, "ad/sfx/impact.wav", 0.6],
  ["aigap", 1, "skips", 0, "ad/sfx/glitch.wav", 0.35],
  ["aigap", 2, "quietly", 0, "ad/sfx/glitch.wav", 0.5],
  ["aigap", 3, "nobody proves", -2, "ad/sfx/impact.wav", 0.65],
  ["aipair", 0, null, -8, "ad/sfx/riser.wav", 0.3],
  ["aipair", 1, "never the keys", -2, "ad/sfx/impact.wav", 0.35],
  ["aipair", 1, "never a customer", -2, "ad/sfx/impact.wav", 0.35],
  ["aipair", 2, "one of its", 0, "ad/sfx/tick.wav", 0.4],
  ["aipair", 3, "one swallows", -2, "ad/sfx/glitch.wav", 0.4],
  ["aipair", 3, "he ships", 0, "ad/sfx/impact.wav", 0.45],
  ["aipair", 4, "the switch reads", -1, "ad/sfx/tick.wav", 0.45],
  ["aipair", 4, "the lamp reads", -1, "ad/sfx/glitch.wav", 0.45],
  ["aipair", 5, "brief it", -2, "ad/sfx/impact.wav", 0.4],
  ["aipair", 5, "catch it", -2, "ad/sfx/impact.wav", 0.45],
  ["aipair", 5, "prove it", -2, "ad/sfx/impact.wav", 0.55],
  ["apart", 2, "never", 0, "ad/sfx/impact.wav", 0.75],
  ["race", 2, "neither side", 4, "ad/sfx/glitch.wav", 0.4],
  ["evidence", 1, null, -2, "ad/sfx/whoosh.wav", 0.25],
  ["evidence", 2, null, -2, "ad/sfx/whoosh.wav", 0.25],
  ["evidence", 3, null, -2, "ad/sfx/whoosh.wav", 0.25],
  ["collapse", 1, "signal", 0, "ad/sfx/glitch.wav", 0.6],
  ["pipeline", 1, "loses signal", 0, "ad/sfx/tick.wav", 0.4],
  ["flip", 0, null, 6, "ad/sfx/riser.wav", 0.35],
  ["compiler", 1, "four work", 0, "ad/sfx/tick.wav", 0.35],
  ["compiler", 2, "reading logs", -6, "ad/sfx/impact.wav", 0.3],
  ["graph", 1, "seven capabilities", 4, "ad/sfx/whoosh.wav", 0.3],
  ["gps", 1, "never sits", 10, "ad/sfx/impact.wav", 0.3],
  ["lab", 1, "ships the", 22, "sfx/sfx_powerup.m4a", 0.3],
  ["unseen", 0, "the server draws", 18, "ad/sfx/whoosh.wav", 0.35],
  ["lanes", 1, "awarded", 6, "sfx/sfx_wrong.m4a", 0.35],
  ["receipt", 0, "the conditions", 24, "ad/sfx/impact.wav", 0.45],
  ["receipt", 1, "revoke", 8, "ad/sfx/tick.wav", 0.5],
  ["exchange", 1, null, 4, "ad/sfx/whoosh.wav", 0.3],
  ["delta", 3, null, 0, "ad/sfx/tick.wav", 0.35],
  ["delta", 4, "awaiting", 0, "ad/sfx/tick.wav", 0.35],
  ["chain", 2, "nobody owns", 0, "ad/sfx/glitch.wav", 0.35],
  ["meet", 2, "capable asks", 8, "ad/sfx/whoosh.wav", 0.35],
];

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const b = (data.beats as Beat[]).find((x) => f >= x.startFrame && f < x.startFrame + x.durationInFrames);
  if (!b || b.scene === "end" || b.scene === "flip") return null;
  const local = f - b.startFrame;
  const o = interpolate(local, [0, 6, b.durationInFrames - 6, b.durationInFrames], [0, 1, 1, 0], CL);
  const prog = interpolate(local, [b.leadFrames, b.leadFrames + b.speechFrames], [0, 1], CL);
  const words = b.text.split(" ");
  const lit = Math.ceil(prog * words.length);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1500, padding: "10px 22px", borderRadius: 12, background: "rgba(5,6,10,0.72)", textAlign: "center", fontFamily: F.sans, fontSize: 27, fontWeight: 500, lineHeight: 1.35, letterSpacing: "-0.005em" }}>
        {words.map((w, k) => <span key={k} style={{ color: k < lit ? "rgba(244,243,238,0.96)" : "rgba(244,243,238,0.42)" }}>{w}{k < words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

const Hud: React.FC = () => {
  const f = useCurrentFrame();
  const g = GROUPS.find((x) => f >= x.start && f < x.start + x.dur);
  if (!g || g.scene === "end" || g.scene === "flood") return null;
  const light = LIGHT.has(g.scene);
  const c = light ? "rgba(0,0,0,0.55)" : "rgba(244,243,238,0.55)";
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${(f / CAPX_TOTAL) * 100}%`, background: K.signal, opacity: 0.7 }} />
      <div style={{ position: "absolute", left: 64, top: 40, fontFamily: F.mono, fontSize: 16, letterSpacing: "0.18em", color: c, textTransform: "uppercase" }}>{g.chapter}</div>
      <div style={{ position: "absolute", right: 64, top: 30, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 }}>
        <Mark s={30} p={1} c={light ? "#0FB894" : K.signal} />
        <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", color: light ? K.ink : K.text }}>CAPABLE</div>
      </div>
    </>
  );
};

// designed transitions that cover every hard cut between scenes
const TT = ["slab", "iris", "blinds", "slab", "blinds", "iris"] as const;
const NO_TT = new Set(["collapse", "flip", "notagain", "end", "contrast"]);
const Transitions: React.FC = () => {
  const f = useCurrentFrame();
  const k = GROUPS.findIndex((x, i) => i > 0 && Math.abs(f - x.start) <= 9);
  if (k < 0 || NO_TT.has(GROUPS[k].scene)) return null;
  const B = GROUPS[k].start;
  const u = (f - B + 9) / 18; // 0..1, covered at 0.5
  const type = TT[k % TT.length];
  const accent = [K.signal, K.amber, K.blue, K.violet][k % 4];
  if (type === "slab") {
    const x = interpolate(u, [0, 0.5, 1], [-3400, -700, 2000], CL);
    return (
      <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -300, bottom: -300, left: x, width: 3300, transform: "skewX(-16deg)", background: K.ink, boxShadow: `inset 30px 0 0 ${accent}, inset 60px 0 0 ${K.ink}, inset 72px 0 0 ${accent}` }} />
      </AbsoluteFill>
    );
  }
  if (type === "iris") {
    const r = u < 0.5 ? interpolate(u, [0, 0.5], [0, 1300], CL) : interpolate(u, [0.5, 1], [0, 1300], CL);
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {u < 0.5 ? (
          <div style={{ position: "absolute", left: 960 - r, top: 540 - r, width: r * 2, height: r * 2, borderRadius: "50%", background: K.ink, boxShadow: `0 0 0 10px ${accent}` }} />
        ) : (
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, transparent ${r}px, ${accent} ${r}px, ${accent} ${r + 10}px, ${K.ink} ${r + 10}px)` }} />
        )}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const d = i * 0.03;
        const a = interpolate(u, [d, 0.5], [0, 1], CL), b = interpolate(u, [0.5, 1 - (0.24 - d)], [0, 1], CL);
        return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * 120, height: 121, background: i % 3 === 1 ? accent : K.ink, transformOrigin: u < 0.5 ? "left" : "right", transform: `scaleX(${u < 0.5 ? a : 1 - b})` }} />;
      })}
    </AbsoluteFill>
  );
};

const Drift: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [1, 1.035], CL);
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

export const CapableX: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: K.ink }}>
      <FontFaces />
      {GROUPS.map((g) => {
        const S = SCENES[g.scene];
        return (
          <Sequence key={g.scene + g.start} from={g.start} durationInFrames={g.dur} name={g.scene}>
            <Drift dur={g.dur}><S g={g} /></Drift>
          </Sequence>
        );
      })}
      <Transitions />
      <Grain o={0.06} />
      <Vignette s={0.5} />
      <Hud />
      <Captions />
      {/* audio */}
      <Audio src={staticFile("capx/score.wav")} volume={0.7} />
      {(data.beats as Beat[]).map((b) => (
        <Sequence key={b.id} from={b.startFrame + b.leadFrames} durationInFrames={b.speechFrames + 30} name={`vo ${b.id}`}>
          <Audio src={staticFile(b.audio)} />
        </Sequence>
      ))}
      {GROUPS.slice(1).filter((x) => !NO_TT.has(x.scene)).map((x) => (
        <Sequence key={`tt${x.start}`} from={x.start - 10} durationInFrames={40} name={`tt ${x.scene}`}>
          <Audio src={staticFile("ad/sfx/whoosh.wav")} volume={0.2} />
        </Sequence>
      ))}
      {SFX.map(([sc, bi, ph, off, file, vol], k) => {
        const g = GROUPS.find((x) => x.scene === sc);
        if (!g || !g.beats[bi]) return null;
        const t = g.start + (ph ? at(g, bi, ph) : g.beats[bi].s) + off;
        return (
          <Sequence key={k} from={Math.max(0, t)} durationInFrames={90} name={`sfx ${sc}`}>
            <Audio src={staticFile(file)} volume={vol} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
