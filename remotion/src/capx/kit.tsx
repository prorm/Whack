import React from "react";
import { AbsoluteFill, Easing, random, spring, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import { FONTS } from "../design-system";

// ---------------------------------------------------------------- palette
export const K = {
  ink: "#05060A",
  ink2: "#0B0D14",
  panel: "rgba(18,21,32,0.78)",
  line: "rgba(255,255,255,0.10)",
  paper: "#F4F3EE",
  paper2: "#E7E5DC",
  text: "#F4F3EE",
  muted: "rgba(244,243,238,0.56)",
  dim: "rgba(244,243,238,0.24)",
  signal: "#3DF5C8", // true signal / proven
  signalDeep: "#0FB894",
  noise: "#FF3B30", // noise / broken
  amber: "#FFB800", // change / attention
  violet: "#8B7CFF", // AI
  blue: "#4DA3FF",
} as const;
export const F = FONTS;
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);

// ---------------------------------------------------------------- scene timing
export type LB = { id: string; text: string; s: number; lead: number; sp: number; d: number };
export type G = { scene: string; dur: number; beats: LB[] };

/** Scene-local frame when `phrase` is spoken inside beat i (word-length weighted, punctuation adds pause). */
export function at(g: G, i: number, phrase?: string, fallback = 0): number {
  const b = g.beats[i];
  const s0 = b.s + b.lead;
  if (!phrase) return s0;
  const toks = b.text.split(/\s+/);
  const w = toks.map((t) => t.replace(/[^\p{L}\p{N}]/gu, "").length + 2.2 + (/[.?!:]$/.test(t) ? 5 : /[,;]$/.test(t) ? 2.5 : 0));
  const tot = w.reduce((a, c) => a + c, 0);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "");
  const want = norm(phrase);
  let cum = 0;
  for (let k = 0; k < toks.length; k++) {
    const rest = norm(toks.slice(k).join(" "));
    if (rest.startsWith(want)) return Math.round(s0 + (b.sp * cum) / tot);
    cum += w[k];
  }
  return Math.round(s0 + b.sp * fallback);
}
export const end = (g: G, i: number) => g.beats[i].s + g.beats[i].lead + g.beats[i].sp;
export const bs = (g: G, i: number) => g.beats[i].s;

// ---------------------------------------------------------------- motion helpers
export const spr = (f: number, d = 0, damping = 15, stiffness = 170, mass = 1) =>
  spring({ frame: f - d, fps: 30, config: { damping, stiffness, mass } });
export const ramp = (f: number, a: number, b: number, from = 0, to = 1, ease = OUT) =>
  interpolate(f, [a, b], [from, to], { ...CL, easing: ease });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Decaying shake from impact frames. */
export function shake(f: number, hits: number[], amp = 14) {
  let x = 0, y = 0, r = 0;
  for (const h of hits) {
    const t = f - h;
    if (t < 0 || t > 16) continue;
    const a = amp * Math.exp(-t / 3.4);
    x += a * Math.sin(t * 2.9 + h);
    y += a * Math.cos(t * 3.7 + h);
    r += (a / 20) * Math.sin(t * 2.1);
  }
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
}

/** 1D smooth value noise. */
export function vnoise(x: number, seed = 1) {
  const i = Math.floor(x);
  const fr = x - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  const t = fr * fr * (3 - 2 * fr);
  return a + (b - a) * t;
}

// ---------------------------------------------------------------- type
export const Mono: React.FC<{ children: React.ReactNode; c?: string; s?: number; w?: number; style?: React.CSSProperties }> = ({ children, c = K.muted, s = 20, w = 400, style }) => (
  <div style={{ fontFamily: F.mono, fontSize: s, fontWeight: w, letterSpacing: "0.14em", color: c, textTransform: "uppercase", ...style }}>{children}</div>
);
export const Disp: React.FC<{ children: React.ReactNode; s: number; c?: string; w?: number; style?: React.CSSProperties }> = ({ children, s, c = K.text, w = 900, style }) => (
  <div style={{ fontFamily: F.display, fontWeight: w, fontSize: s, lineHeight: 0.92, letterSpacing: "-0.045em", color: c, ...style }}>{children}</div>
);
export const Sans: React.FC<{ children: React.ReactNode; s: number; c?: string; w?: number; style?: React.CSSProperties }> = ({ children, s, c = K.text, w = 500, style }) => (
  <div style={{ fontFamily: F.sans, fontWeight: w, fontSize: s, lineHeight: 1.25, letterSpacing: "-0.01em", color: c, ...style }}>{children}</div>
);

/** Word-by-word reveal; each word lands at its spoken frame. */
export const Words: React.FC<{ g: G; i: number; text: string; s: number; c?: string; hot?: Record<string, string>; style?: React.CSSProperties; blur?: boolean; gap?: number; align?: "left" | "center" }> = ({ g, i, text, s, c = K.text, hot = {}, style, blur = true, gap = 0.26, align = "left" }) => {
  const f = useCurrentFrame();
  const ws = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${s * gap}px`, justifyContent: align === "center" ? "center" : "flex-start", ...style }}>
      {ws.map((w, k) => {
        const t0 = at(g, i, ws.slice(k, k + 2).join(" "), (k / ws.length) * 0.9);
        const p = spr(f, t0 - 2, 16, 220);
        const key = w.replace(/[^\p{L}\p{N}%$₹]/gu, "").toUpperCase();
        return (
          <Disp key={k} s={s} c={hot[key] ?? c} style={{ opacity: interpolate(p, [0, 0.3], [0, 1], CL), transform: `translateY(${(1 - p) * s * 0.35}px)`, filter: blur ? `blur(${(1 - p) * 10}px)` : undefined }}>
            {w}
          </Disp>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- backgrounds & overlays
export const Bg: React.FC<{ tint?: string; tint2?: string; light?: boolean }> = ({ tint = "rgba(61,245,200,0.10)", tint2 = "rgba(77,163,255,0.08)", light }) => {
  const f = useCurrentFrame();
  const x = 50 + Math.sin(f / 90) * 12;
  const y = 40 + Math.cos(f / 110) * 10;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: light ? K.paper : K.ink,
        backgroundImage: light
          ? `radial-gradient(ellipse at ${x}% ${y}%, rgba(255,184,0,0.10), transparent 60%)`
          : `radial-gradient(ellipse at ${x}% ${y}%, ${tint}, transparent 55%), radial-gradient(ellipse at ${100 - x}% ${100 - y}%, ${tint2}, transparent 60%)`,
      }}
    />
  );
};

export const GridFloor: React.FC<{ color?: string; speed?: number; opacity?: number; horizon?: number }> = ({ color = "rgba(61,245,200,0.5)", speed = 1, opacity = 0.35, horizon = 62 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ perspective: 900, overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute", left: "-50%", right: "-50%", top: `${horizon}%`, height: "120%",
          transform: "rotateX(76deg)", transformOrigin: "top center",
          backgroundImage: `linear-gradient(${color} 1.5px, transparent 1.5px), linear-gradient(90deg, ${color} 1.5px, transparent 1.5px)`,
          backgroundSize: "90px 90px", backgroundPosition: `0 ${(f * 2.2 * speed) % 90}px`,
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 25%, black 60%, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};

export const DotGrid: React.FC<{ light?: boolean; size?: number }> = ({ light, size = 48 }) => (
  <AbsoluteFill style={{ backgroundImage: `radial-gradient(${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.07)"} 1.4px, transparent 1.6px)`, backgroundSize: `${size}px ${size}px` }} />
);

export const Grain: React.FC<{ o?: number }> = ({ o = 0.07 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: o, mixBlendMode: "overlay" }}>
      <svg width="1920" height="1080">
        <filter id={`gn${f % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 6} stitchTiles="stitch" />
        </filter>
        <rect width="1920" height="1080" filter={`url(#gn${f % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};
export const Vignette: React.FC<{ s?: number }> = ({ s = 0.62 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 48%, rgba(0,0,0,${s}) 100%)` }} />
);
export const Scan: React.FC<{ o?: number }> = ({ o = 0.08 }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity: o, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)" }} />
);

/** Light sweep across the frame between frames a..b. */
export const Sweep: React.FC<{ a: number; b: number; c?: string; w?: number }> = ({ a, b, c = "rgba(255,255,255,0.18)", w = 380 }) => {
  const f = useCurrentFrame();
  if (f < a || f > b) return null;
  const x = interpolate(f, [a, b], [-600, 2400], { ...CL, easing: INOUT });
  return <div style={{ position: "absolute", top: -200, bottom: -200, left: x, width: w, transform: "skewX(-18deg)", background: `linear-gradient(90deg, transparent, ${c}, transparent)`, pointerEvents: "none" }} />;
};

/** Full-frame flash at frame a. */
export const Flash: React.FC<{ a: number; c?: string; len?: number; o?: number }> = ({ a, c = "#fff", len = 10, o = 0.8 }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [a, a + 1, a + len], [0, o, 0], CL);
  if (v <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: c, opacity: v, pointerEvents: "none" }} />;
};

// ---------------------------------------------------------------- glitch text (chromatic split + slices)
export const Glitch: React.FC<{ children: React.ReactNode; on: number; s: number; c?: string; style?: React.CSSProperties }> = ({ children, on, s, c = K.text, style }) => {
  const f = useCurrentFrame();
  const amt = on <= 0 ? 0 : on;
  const jx = (random(`gx${f}`) - 0.5) * 30 * amt;
  const jy = (random(`gy${f}`) - 0.5) * 8 * amt;
  const base: React.CSSProperties = { fontFamily: F.display, fontWeight: 900, fontSize: s, lineHeight: 0.92, letterSpacing: "-0.045em", whiteSpace: "nowrap", ...style };
  const cut = random(`gc${f}`) * 100;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ ...base, color: c, transform: `translate(${jx * 0.3}px, ${jy}px)` }}>{children}</div>
      {amt > 0 ? (
        <>
          <div style={{ ...base, position: "absolute", inset: 0, color: "rgba(255,40,60,0.85)", mixBlendMode: "screen", transform: `translate(${-8 * amt + jx}px, 0)`, clipPath: `inset(${cut}% 0 ${Math.max(0, 100 - cut - 22)}% 0)` }}>{children}</div>
          <div style={{ ...base, position: "absolute", inset: 0, color: "rgba(40,230,255,0.85)", mixBlendMode: "screen", transform: `translate(${8 * amt - jx}px, 0)`, clipPath: `inset(${Math.max(0, cut - 30)}% 0 ${Math.max(0, 70 - cut)}% 0)` }}>{children}</div>
        </>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- signal wave motif
/** Signal line. noise 0 = clean pulse train, 1 = static. */
export const Wave: React.FC<{ w?: number; h?: number; noise?: number; c?: string; phase?: number; amp?: number; stroke?: number; glow?: boolean; seed?: number; style?: React.CSSProperties }> = ({ w = 1920, h = 300, noise = 0, c = K.signal, phase = 0, amp = 1, stroke = 4, glow = true, seed = 3, style }) => {
  const f = useCurrentFrame();
  const n = 220;
  const pts: string[] = [];
  for (let k = 0; k <= n; k++) {
    const x = (k / n) * w;
    const u = k / n;
    const clean = Math.sin(u * Math.PI * 8 - phase) * 0.55 + Math.sin(u * Math.PI * 16 - phase * 2) * 0.12;
    const st = (random(`${seed}-${k}-${f % 9}`) * 2 - 1) * 1.2 + vnoise(u * 30 + f * 0.6, seed) * 0.6;
    const y = h / 2 - (clean * (1 - noise) + st * noise) * (h * 0.4) * amp;
    pts.push(`${k === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} style={{ overflow: "visible", ...style }}>
      <path d={pts.join(" ")} stroke={c} strokeWidth={stroke} fill="none" strokeLinejoin="round" style={glow ? { filter: `drop-shadow(0 0 10px ${c}) drop-shadow(0 0 24px ${c})` } : undefined} />
    </svg>
  );
};

// ---------------------------------------------------------------- UI atoms
export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; light?: boolean; glow?: string }> = ({ children, style, light, glow }) => (
  <div
    style={{
      background: light ? "rgba(255,255,255,0.9)" : K.panel,
      border: `1px solid ${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
      borderRadius: 22,
      boxShadow: glow ? `0 0 0 1px ${glow}, 0 0 60px ${glow}55, 0 30px 80px rgba(0,0,0,0.45)` : light ? "0 30px 60px rgba(0,0,0,0.12)" : "0 30px 80px rgba(0,0,0,0.45)",
      backdropFilter: "blur(14px)",
      ...style,
    }}
  >
    {children}
  </div>
);

export type ChipState = "idle" | "proven" | "gap" | "new" | "pending" | "missing" | "review" | "implied";
const CHIP: Record<ChipState, { bg: string; bd: string; fg: string; dash?: boolean }> = {
  idle: { bg: "rgba(255,255,255,0.06)", bd: "rgba(255,255,255,0.22)", fg: K.text },
  proven: { bg: "rgba(61,245,200,0.14)", bd: K.signal, fg: K.signal },
  gap: { bg: "rgba(77,163,255,0.14)", bd: K.blue, fg: "#CFE6FF" },
  new: { bg: "rgba(255,184,0,0.16)", bd: K.amber, fg: K.amber },
  pending: { bg: "rgba(255,255,255,0.03)", bd: "rgba(255,255,255,0.35)", fg: K.muted, dash: true },
  missing: { bg: "rgba(0,0,0,0.04)", bd: "rgba(0,0,0,0.25)", fg: "rgba(0,0,0,0.5)", dash: true },
  review: { bg: "rgba(255,184,0,0.14)", bd: "#C98F00", fg: "#8A6200" },
  implied: { bg: "rgba(255,184,0,0.10)", bd: K.amber, fg: K.amber, dash: true },
};
export const Chip: React.FC<{ label: string; st?: ChipState; s?: number; icon?: string; style?: React.CSSProperties }> = ({ label, st = "idle", s = 22, icon, style }) => {
  const c = CHIP[st];
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 10, padding: `${s * 0.45}px ${s * 0.8}px`, borderRadius: 999,
        background: c.bg, border: `2px ${c.dash ? "dashed" : "solid"} ${c.bd}`, color: c.fg,
        fontFamily: F.mono, fontSize: s, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
        boxShadow: st === "proven" ? `0 0 24px ${K.signal}44` : st === "new" ? `0 0 24px ${K.amber}44` : undefined, ...style,
      }}
    >
      {icon ? <span style={{ fontWeight: 700 }}>{icon}</span> : null}
      {label}
    </div>
  );
};

export const Src: React.FC<{ children: React.ReactNode; light?: boolean; style?: React.CSSProperties }> = ({ children, light, style }) => (
  <div style={{ position: "absolute", left: 80, bottom: 128, fontFamily: F.mono, fontSize: 17, letterSpacing: "0.1em", color: light ? "rgba(0,0,0,0.45)" : "rgba(244,243,238,0.4)", textTransform: "uppercase", ...style }}>
    Source · {children}
  </div>
);

export const DemoTag: React.FC<{ children?: React.ReactNode; light?: boolean; style?: React.CSSProperties }> = ({ children = "DEMO · fictional", light, style }) => (
  <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${light ? "rgba(0,0,0,0.35)" : "rgba(255,184,0,0.6)"}`, color: light ? "rgba(0,0,0,0.6)" : K.amber, fontFamily: F.mono, fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase", ...style }}>
    {children}
  </div>
);

/** Counting number. */
export const Count: React.FC<{ from?: number; to: number; a: number; b: number; s: number; c?: string; fmt?: (n: number) => string; style?: React.CSSProperties }> = ({ from = 0, to, a, b, s, c = K.text, fmt = (n) => Math.round(n).toLocaleString("en-US"), style }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [a, b], [from, to], { ...CL, easing: OUT });
  return <Disp s={s} c={c} style={{ fontVariantNumeric: "tabular-nums", ...style }}>{fmt(v)}</Disp>;
};

/** Stroke-drawn SVG path. */
export const Draw: React.FC<{ d: string; p: number; c?: string; w?: number; dash?: boolean; glow?: boolean; len?: number }> = ({ d, p, c = K.signal, w = 3, dash, glow, len = 3000 }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"
    strokeDasharray={dash ? "10 12" : `${len}`} strokeDashoffset={dash ? 0 : len * (1 - p)} opacity={dash ? p : 1}
    style={glow ? { filter: `drop-shadow(0 0 8px ${c})` } : undefined} />
);

/** Person glyph (abstract, no face). */
export const Person: React.FC<{ s?: number; c?: string; ring?: string; style?: React.CSSProperties }> = ({ s = 260, c = "#1C2233", ring = K.signal, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ width: s, height: s, position: "relative", ...style }}>
      <div style={{ position: "absolute", inset: -s * 0.08, borderRadius: "50%", border: `2px solid ${ring}`, opacity: 0.5, transform: `rotate(${f}deg)`, borderStyle: "dashed" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: `radial-gradient(circle at 50% 30%, ${ring}33, ${c} 70%)`, boxShadow: `0 0 60px ${ring}33` }}>
        <div style={{ position: "absolute", left: "34%", top: "18%", width: "32%", height: "32%", borderRadius: "50%", background: ring, opacity: 0.85 }} />
        <div style={{ position: "absolute", left: "16%", top: "56%", width: "68%", height: "60%", borderRadius: "50% 50% 0 0", background: ring, opacity: 0.85 }} />
      </div>
    </div>
  );
};

/** CAPABLE mark: rounded square, pulse-line that ends in a tick. */
export const Mark: React.FC<{ s?: number; p?: number; c?: string }> = ({ s = 120, p = 1, c = K.signal }) => (
  <svg width={s} height={s} viewBox="0 0 120 120">
    <rect x="6" y="6" width="108" height="108" rx="30" fill="none" stroke={c} strokeWidth="7" strokeDasharray="440" strokeDashoffset={440 * (1 - Math.min(1, p * 1.4))} />
    <path d="M22 66 L42 66 L50 50 L60 82 L70 58 L78 66 L84 66 L92 50" fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="160" strokeDashoffset={160 * (1 - Math.max(0, Math.min(1, p * 1.6 - 0.5)))} style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
  </svg>
);

export const Logo: React.FC<{ p: number; s?: number; c?: string }> = ({ p, s = 190, c = K.text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: s * 0.22 }}>
    <Mark s={s * 0.9} p={p} />
    <div style={{ display: "flex" }}>
      {"CAPABLE".split("").map((ch, i) => {
        const q = Math.max(0, Math.min(1, p * 2.2 - i * 0.12));
        return (
          <Disp key={i} s={s} c={c} style={{ opacity: q, transform: `translateY(${(1 - q) * 40}px)`, filter: `blur(${(1 - q) * 12}px)`, letterSpacing: "-0.03em" }}>
            {ch}
          </Disp>
        );
      })}
    </div>
  </div>
);

/** Particles drifting (deterministic). */
export const Dust: React.FC<{ n?: number; c?: string; speed?: number; seed?: string; size?: number; o?: number }> = ({ n = 70, c = K.signal, speed = 1, seed = "d", size = 3, o = 0.5 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }).map((_, i) => {
        const x = random(`${seed}x${i}`) * 1920;
        const y0 = random(`${seed}y${i}`) * 1080;
        const v = 0.2 + random(`${seed}v${i}`) * 0.8;
        const y = (y0 - f * v * speed + 1080 * 4) % 1080;
        const r = size * (0.5 + random(`${seed}r${i}`));
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 30 + i) * 10, top: y, width: r, height: r, borderRadius: "50%", background: c, opacity: o * (0.3 + random(`${seed}o${i}`) * 0.7), boxShadow: `0 0 ${r * 3}px ${c}` }} />;
      })}
    </AbsoluteFill>
  );
};

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...style }}>{children}</AbsoluteFill>
);
