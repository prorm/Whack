import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import {
  K, F, CL, OUT, INOUT, G, at, end, bs, spr, ramp, lerp, shake, Mono, Disp, Sans, Words, Bg, GridFloor, DotGrid, Sweep, Flash, Glitch, Wave,
  Panel, Chip, Src, DemoTag, Count, Draw, Person, Logo, Dust, Center,
} from "./kit";

// =====================================================================================================
// 01 FLOOD: 11,000 applications a minute -> 97 of 100 never reach an interview
// =====================================================================================================
const KEEP = new Set([23, 58, 81]);
export const Flood: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const c2 = bs(g, 1);
  const kill = at(g, 1, "will never");
  const rainO = interpolate(f, [c2 - 6, c2 + 10], [1, 0], CL);
  const speed = interpolate(f, [0, c2], [3, 16], CL);
  return (
    <AbsoluteFill style={{ backgroundColor: K.ink, overflow: "hidden" }}>
      <Bg tint="rgba(77,163,255,0.10)" tint2="rgba(255,59,48,0.05)" />
      {/* rain of applications */}
      <AbsoluteFill style={{ opacity: rainO, perspective: 1200 }}>
        {Array.from({ length: 170 }).map((_, i) => {
          const z = random(`z${i}`);
          const x = random(`x${i}`) * 2100 - 90;
          const y0 = random(`y${i}`) * 1400;
          const v = (0.5 + z) * speed;
          const y = ((y0 + f * v) % 1400) - 160;
          const sc = 0.35 + z * 0.9;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: 64 * sc, height: 84 * sc, borderRadius: 6 * sc, background: "rgba(244,243,238,0.9)", opacity: 0.12 + z * 0.55, transform: `rotate(${(random(`r${i}`) - 0.5) * 40 + f * (random(`w${i}`) - 0.5)}deg)`, filter: z < 0.35 ? "blur(2px)" : undefined, padding: 8 * sc }}>
              {[0.9, 0.6, 0.75, 0.5].map((w, k) => (
                <div key={k} style={{ height: 5 * sc, width: `${w * 100}%`, background: "rgba(0,0,0,0.25)", borderRadius: 3, marginTop: k ? 6 * sc : 0 }} />
              ))}
            </div>
          );
        })}
      </AbsoluteFill>
      <Center style={{ opacity: rainO }}>
        <Mono s={26} c={K.muted} style={{ marginBottom: 18 }}>Job applications sent</Mono>
        <Count to={11000} a={at(g, 0, "eleven") - 4} b={at(g, 0, "job applications")} s={300} style={{ textShadow: "0 0 80px rgba(77,163,255,0.5)" }} />
        <Mono s={30} c={K.text} style={{ marginTop: 14, opacity: ramp(f, at(g, 0, "minute") , at(g, 0, "minute") + 10) }}>Every minute · on LinkedIn</Mono>
      </Center>
      {/* 100 applications grid */}
      {f >= c2 - 8 ? (
        <AbsoluteFill>
          {Array.from({ length: 100 }).map((_, i) => {
            const col = i % 10, row = Math.floor(i / 10);
            const x = 250 + col * 64, y = 190 + row * 70;
            const pin = spr(f, c2 - 8 + (col + row) * 0.8, 14, 200);
            const keep = KEEP.has(i);
            const k = f - kill - (random(`k${i}`) * 14);
            const fall = keep ? 0 : Math.max(0, k);
            const dy = fall * fall * 0.9;
            const red = !keep && f > kill ? 1 : 0;
            const glow = keep ? ramp(f, kill + 6, kill + 20) : 0;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y + dy, width: 46, height: 58, borderRadius: 6, transform: `scale(${pin * (1 + glow * 0.18)}) rotate(${fall * (random(`q${i}`) - 0.5) * 3}deg)`,
                background: keep && glow > 0 ? K.signal : red ? "rgba(255,59,48,0.75)" : "rgba(244,243,238,0.85)", opacity: dy > 900 ? 0 : 1,
                boxShadow: keep && glow > 0 ? `0 0 ${40 * glow}px ${K.signal}` : undefined }} />
            );
          })}
          <div style={{ position: "absolute", left: 1040, top: 300 }}>
            <Disp s={250} c={K.signal} style={{ opacity: ramp(f, kill + 10, kill + 22), textShadow: `0 0 60px ${K.signal}66` }}>3<span style={{ color: K.dim }}>/100</span></Disp>
            <Mono s={30} c={K.text} style={{ marginTop: 24, opacity: ramp(f, kill + 16, kill + 28) }}>Reach an interview</Mono>
            <Mono s={30} c={K.noise} style={{ marginTop: 12, opacity: ramp(f, kill + 22, kill + 34) }}>97 never do</Mono>
          </div>
          <Src style={{ opacity: ramp(f, c2, c2 + 10) }}>LinkedIn Future of Talent 2026 · Greenhouse, Nov 2026</Src>
        </AbsoluteFill>
      ) : null}
      <Flash a={c2 - 2} c="#fff" o={0.25} len={8} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 02 AARAV
// =====================================================================================================
export const Aarav: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const pIn = spr(f, 0, 16, 120);
  const tDeg = at(g, 0, "four hundred"), tCert = at(g, 0, "system design"), tGit = at(g, 0, "three projects");
  const tPy = at(g, 1, "python"), tAi = at(g, 1, "uses ai"), tApp = at(g, 1, "has applied");
  const appP = ramp(f, tApp, end(g, 1), 0, 1);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(61,245,200,0.12)" />
      <DotGrid />
      <div style={{ position: "absolute", left: 150, top: 170, transform: `scale(${pIn}) translateY(${(1 - pIn) * 40}px)` }}>
        <Person s={330} ring={K.signal} />
      </div>
      <div style={{ position: "absolute", left: 560, top: 165, opacity: pIn }}>
        <Mono s={24} c={K.signal}>Meet</Mono>
        <Disp s={190} style={{ marginTop: 6 }}>Aarav.</Disp>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 18 }}>
          <Mono s={22}>Final-year B.Tech · Bengaluru</Mono>
          <DemoTag>Fictional learner</DemoTag>
        </div>
      </div>
      {/* credentials row */}
      <div style={{ position: "absolute", left: 150, top: 590, display: "flex", gap: 34, alignItems: "flex-start" }}>
        {/* leetcode-style stats (generic, no brand look) */}
        <Panel style={{ width: 330, height: 220, padding: 26, transform: `translateY(${(1 - spr(f, tDeg)) * 60}px)`, opacity: spr(f, tDeg) }}>
          <Mono s={18} c={K.muted}>Problems solved</Mono>
          <Count to={400} a={tDeg} b={tDeg + 24} s={78} c={K.signal} style={{ marginTop: 10 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[["Easy", 180, K.signal], ["Med", 170, K.amber], ["Hard", 50, K.noise]].map(([l, v, c]) => (
              <div key={l as string} style={{ flex: (v as number), height: 10, borderRadius: 5, background: c as string, opacity: ramp(f, tDeg + 10, tDeg + 24) }} />
            ))}
          </div>
        </Panel>
        {/* system design notes */}
        <div style={{ position: "relative", width: 330, height: 220, opacity: spr(f, tCert) }}>
          {["URL shortener", "Design Twitter", "Rate limiter", "Chat app", "News feed", "Uber"].map((t, k) => {
            const p = spr(f, tCert + k * 3, 14, 180);
            return (
              <div key={k} style={{ position: "absolute", left: 20 + k * 16, top: 10 + k * 9, width: 250, height: 170, borderRadius: 14, background: "#E8EEF9", border: "1px solid rgba(0,0,0,0.15)", transform: `rotate(${(k - 2.5) * 4 * p}deg) translateY(${(1 - p) * 80}px)`, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", padding: 16 }}>
                <Mono s={12} c="rgba(0,0,0,0.5)">System design notes</Mono>
                <Sans s={22} c={K.ink} w={700} style={{ marginTop: 8 }}>{t}</Sans>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>{[0, 1, 2].map((q) => <div key={q} style={{ width: 46, height: 28, borderRadius: 6, border: `2px solid ${K.blue}` }} />)}</div>
              </div>
            );
          })}
          <Mono s={20} c={K.text} style={{ position: "absolute", left: 20, top: 240 }}>System design · memorised</Mono>
        </div>
        {/* github grid */}
        <Panel style={{ width: 400, height: 220, padding: 24, opacity: spr(f, tGit), transform: `translateY(${(1 - spr(f, tGit)) * 60}px)` }}>
          <Mono s={18}>3 projects · GitHub</Mono>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: 5, marginTop: 18 }}>
            {Array.from({ length: 80 }).map((_, k) => {
              const on = f > tGit + k * 0.4 && random(`gh${k}`) > 0.35;
              return <div key={k} style={{ height: 16, borderRadius: 3, background: on ? `rgba(61,245,200,${0.25 + random(`ga${k}`) * 0.75})` : "rgba(255,255,255,0.06)" }} />;
            })}
          </div>
        </Panel>
        {/* skills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 10 }}>
          <div style={{ opacity: spr(f, tPy), transform: `scale(${spr(f, tPy)})` }}><Chip label="Python" st="proven" s={26} /></div>
          <div style={{ opacity: spr(f, tAi), transform: `scale(${spr(f, tAi)})` }}><Chip label="AI · every day" st="gap" s={26} icon="✦" /></div>
        </div>
      </div>
      {/* application counter */}
      <div style={{ position: "absolute", right: 120, top: 190, textAlign: "right", opacity: ramp(f, tApp - 4, tApp + 6) }}>
        <Mono s={22} c={K.muted}>Applications sent</Mono>
        <Count to={214} a={tApp} b={end(g, 1)} s={200} c={K.text} />
      </div>
      {/* paper planes streaking out */}
      {Array.from({ length: 24 }).map((_, k) => {
        const t0 = tApp + k * 1.6;
        const t = f - t0;
        if (t < 0 || appP <= 0) return null;
        const x = 1180 + t * 46;
        const y = 470 - t * (random(`py${k}`) * 6 - 2);
        return <div key={k} style={{ position: "absolute", left: x, top: y, width: 70, height: 3, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${K.signal})`, opacity: Math.max(0, 1 - t / 30) }} />;
      })}
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 03 MAYA (employer world = paper)
// =====================================================================================================
export const Maya: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const pIn = spr(f, 0, 16, 120);
  const n1 = at(g, 1, "work out"), n2 = at(g, 1, "fix it"), n3 = at(g, 1, "explain");
  const tPile = bs(g, 2), tNum = at(g, 2, "eleven hundred");
  const pile = interpolate(f, [tPile, end(g, 2) + 6], [0, 70], { ...CL, easing: OUT });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg light />
      <DotGrid light />
      <div style={{ position: "absolute", left: 120, top: 150, opacity: pIn, transform: `translateY(${(1 - pIn) * 30}px)` }}>
        <Mono s={24} c="#B07B00">Meet</Mono>
        <Disp s={190} c={K.ink} style={{ marginTop: 6 }}>Maya.</Disp>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 18 }}>
          <Mono s={22} c="rgba(0,0,0,0.6)">Payments engineering lead · Paylane</Mono>
          <DemoTag light>DEMO · fictional company</DemoTag>
        </div>
      </div>
      <div style={{ position: "absolute", right: 170, top: 120, transform: `scale(${pIn})`, opacity: 1 - ramp(f, tPile - 6, tPile + 8), transformOrigin: "top right" }}>
        <Person s={300} c="#2A2418" ring={K.amber} />
      </div>
      {/* the need */}
      <Panel light style={{ position: "absolute", left: 120, top: 470, width: 860, padding: "34px 40px", opacity: spr(f, bs(g, 1) - 4), transform: `translateY(${(1 - spr(f, bs(g, 1) - 4)) * 50}px)` }}>
        <Mono s={18} c="rgba(0,0,0,0.5)">Open role · Junior backend engineer · ×1</Mono>
        {[["01", "Work out why payments are failing", n1], ["02", "Fix it, without breaking anything", n2], ["03", "Explain what happened", n3]].map(([k, t, a]) => {
          const p = spr(f, a as number, 16, 200);
          return (
            <div key={k as string} style={{ display: "flex", gap: 22, alignItems: "baseline", marginTop: 22, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
              <Mono s={22} c="#B07B00" w={700}>{k}</Mono>
              <Sans s={40} c={K.ink} w={650}>{t}</Sans>
            </div>
          );
        })}
      </Panel>
      {/* the pile of applications */}
      <div style={{ position: "absolute", left: 1060, top: 470, width: 720, height: 560, perspective: 1400 }}>
        <div style={{ position: "absolute", inset: 0, transform: "rotateX(52deg) rotateZ(-28deg)", transformStyle: "preserve-3d" }}>
          {Array.from({ length: 70 }).map((_, k) => {
            if (k > pile) return null;
            const land = Math.min(1, pile - k);
            const z = k * 7 + (1 - land) * 500;
            return (
              <div key={k} style={{ position: "absolute", left: 160 + (random(`mx${k}`) - 0.5) * 40, top: 120 + (random(`my${k}`) - 0.5) * 40, width: 380, height: 260, borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", transform: `translateZ(${z}px) rotate(${(random(`mr${k}`) - 0.5) * 16}deg)`, boxShadow: "0 2px 6px rgba(0,0,0,0.08)", padding: 20, opacity: land }}>
                <div style={{ height: 14, width: "45%", background: "rgba(0,0,0,0.18)", borderRadius: 4 }} />
                {[0.9, 0.8, 0.85, 0.6].map((w, q) => <div key={q} style={{ height: 9, width: `${w * 100}%`, background: "rgba(0,0,0,0.08)", borderRadius: 4, marginTop: 14 }} />)}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", right: 110, top: 130, textAlign: "right", opacity: ramp(f, tNum - 6, tNum + 6) }}>
        <Count to={1100} a={tNum - 4} b={end(g, 2) + 4} s={170} c={K.ink} />
        <Mono s={22} c="rgba(0,0,0,0.6)">Applications · one role</Mono>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 04 APART: perfect match, never meet
// =====================================================================================================
export const Apart: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tL = at(g, 0, "aarav needs"), tR = at(g, 0, "maya needs");
  const tArc = bs(g, 1), tSlam = at(g, 2, "never");
  const arc = ramp(f, tArc, tArc + 26, 0, 1, INOUT);
  const slam = spr(f, tSlam - 6, 11, 260, 0.8);
  const broken = f >= tSlam;
  const d = "M 470 560 C 760 240, 1160 240, 1450 560";
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: shake(f, [tSlam], 26) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080 }}><AbsoluteFill><Bg /></AbsoluteFill></div>
      <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, overflow: "hidden" }}><Bg light /></div>
      <div style={{ position: "absolute", left: 330, top: 470 }}><Person s={280} ring={K.signal} /></div>
      <div style={{ position: "absolute", left: 1310, top: 470 }}><Person s={280} c="#2A2418" ring={K.amber} /></div>
      <Mono s={22} c={K.signal} style={{ position: "absolute", left: 330, top: 420 }}>Aarav</Mono>
      <Mono s={22} c="#B07B00" style={{ position: "absolute", left: 1310, top: 420 }}>Maya</Mono>
      <div style={{ position: "absolute", left: 110, top: 800, width: 740, textAlign: "center", opacity: spr(f, tL) }}>
        <Disp s={80}>Needs a job.</Disp>
      </div>
      <div style={{ position: "absolute", left: 1070, top: 800, width: 740, textAlign: "center", opacity: spr(f, tR) }}>
        <Disp s={80} c={K.ink}>Needs someone capable.</Disp>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        {!broken ? <Draw d={d} p={arc} c={K.signal} w={6} glow /> : (
          <>
            <g transform={`translate(${-(f - tSlam) * 3}, ${(f - tSlam) ** 2 * 0.5}) rotate(${(f - tSlam) * 0.6} 470 560)`} opacity={Math.max(0, 1 - (f - tSlam) / 30)}><path d="M 470 560 C 640 380, 820 300, 940 290" stroke={K.noise} strokeWidth={6} fill="none" /></g>
            <g transform={`translate(${(f - tSlam) * 3}, ${(f - tSlam) ** 2 * 0.5})`} opacity={Math.max(0, 1 - (f - tSlam) / 30)}><path d="M 980 290 C 1100 300, 1280 380, 1450 560" stroke={K.noise} strokeWidth={6} fill="none" /></g>
          </>
        )}
      </svg>
      <div style={{ position: "absolute", left: 960, top: 230, transform: "translateX(-50%)", opacity: arc * (broken ? 0 : 1) }}>
        <Chip label="Perfect match" st="proven" s={26} />
      </div>
      {/* the wall */}
      <div style={{ position: "absolute", left: 900, width: 120, top: -1100 + slam * 1100, height: 1080, background: "linear-gradient(90deg, #000, #15161c, #000)", boxShadow: "0 0 80px rgba(0,0,0,0.9)", borderLeft: `2px solid ${K.noise}`, borderRight: `2px solid ${K.noise}` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", opacity: ramp(f, tSlam + 2, tSlam + 8) }}>
        <div style={{ display: "inline-block", background: "#000", padding: "18px 44px" }}>
          <Glitch s={110} c={K.text} on={interpolate(f, [tSlam, tSlam + 14], [1, 0], CL)}>They will never meet.</Glitch>
        </div>
      </div>
      <Flash a={tSlam} c={K.noise} o={0.45} len={12} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 05 ARMS RACE
// =====================================================================================================
const FILTERS: [string, string][] = [["Degree required", "a degree"], ["3+ years experience", "three years"], ["Coding test", "a coding"], ["Take-home", "take-home"], ["One more interview", "one more"]];
const HACKS: [string, string][] = [["AI-rewritten résumé", "ai rewrites"], ["Keyword stuffing", "he stuffs"], ["Puzzle grind", "he grinds"], ["+100 applications", "he applies"]];
export const Race: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tF = FILTERS.map(([, p]) => at(g, 0, p));
  const tH = HACKS.map(([, p]) => at(g, 1, p));
  const tWork = at(g, 2, "both sides"), tTrue = at(g, 2, "neither side");
  const zoom = interpolate(f, [0, tTrue], [1, 0.86], { ...CL, easing: INOUT });
  const jitter = f > tWork ? shake(f, [tWork, tWork + 8, tWork + 16, tWork + 24], 6) : "";
  const noise = ramp(f, tTrue, tTrue + 24);
  const wallH = 160 + FILTERS.reduce((a, _, k) => a + (f > tF[k] ? 120 : 0), 0) + HACKS.reduce((a, _, k) => a + (f > tH[k] ? 30 : 0), 0);
  const brick = (label: string, t: number, k: number, side: "L" | "R") => {
    const p = spr(f, t - 3, 12, 240);
    const y = 880 - k * 118;
    const drop = (1 - p) * -700;
    return (
      <div key={label} style={{ position: "absolute", left: side === "R" ? 1010 : 400, top: y + drop, width: 510, height: 104, borderRadius: 12,
        background: side === "R" ? K.ink : "rgba(61,245,200,0.12)", border: side === "R" ? "none" : `2px solid ${K.signal}`,
        display: "flex", alignItems: "center", padding: "0 30px", gap: 20, opacity: p > 0.02 ? 1 : 0, boxShadow: "0 18px 40px rgba(0,0,0,0.25)" }}>
        <Mono s={18} c={side === "R" ? K.amber : K.signal} w={700}>{side === "R" ? "Filter" : "Hack"} {String(k + 1).padStart(2, "0")}</Mono>
        <Sans s={38} w={700} c={side === "R" ? K.paper : K.text}>{label}</Sans>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) ${jitter}` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080, overflow: "hidden" }}><Bg /></div>
        <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, overflow: "hidden" }}><Bg light /><DotGrid light /></div>
        <Mono s={26} c={K.signal} style={{ position: "absolute", left: 90, top: 90 }}>Aarav adapts</Mono>
        <Mono s={26} c="#B07B00" style={{ position: "absolute", right: 90, top: 90, textAlign: "right" }}>Maya adds filters</Mono>
        <div style={{ position: "absolute", left: 930, width: 60, bottom: 80, height: wallH, background: "linear-gradient(90deg,#000,#1a1b22,#000)", borderTop: `4px solid ${K.noise}`, transition: "none" }} />
        {FILTERS.map(([l], k) => (f > tF[k] - 4 ? brick(l, tF[k], k, "R") : null))}
        {HACKS.map(([l], k) => (f > tH[k] - 4 ? brick(l, tH[k], k, "L") : null))}
        <div style={{ position: "absolute", left: 90, top: 150, opacity: ramp(f, tH[3], tH[3] + 10) }}>
          <Count to={314} from={214} a={tH[3]} b={tH[3] + 30} s={90} c={K.text} />
          <Mono s={18}>Applications sent</Mono>
        </div>
      </AbsoluteFill>
      {/* static takes over */}
      <AbsoluteFill style={{ opacity: noise * 0.9, mixBlendMode: "screen" }}>
        <svg width="1920" height="1080">
          <filter id={`st${f % 5}`}><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed={f % 5} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="1920" height="1080" filter={`url(#st${f % 5})`} />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: `rgba(5,6,10,${noise * 0.55})` }} />
      <Center>
        <div style={{ opacity: ramp(f, tWork, tWork + 8), background: "rgba(0,0,0,0.8)", padding: "20px 40px", marginBottom: 30 }}>
          <Disp s={96}>More activity.</Disp>
        </div>
        <div style={{ opacity: ramp(f, tTrue + 6, tTrue + 14), background: "rgba(0,0,0,0.8)", padding: "20px 40px" }}>
          <Glitch s={110} c={K.noise} on={interpolate(f, [tTrue + 6, tTrue + 30], [1, 0.15], CL)}>Zero new truth.</Glitch>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 06 EVIDENCE: five stats, whip transitions
// =====================================================================================================
const StatFrame: React.FC<{ g: G; i: number; children: React.ReactNode; src: string; kicker: string }> = ({ g, i, children, src, kicker }) => {
  const f = useCurrentFrame();
  const a = bs(g, i);
  const b = i + 1 < g.beats.length ? bs(g, i + 1) : g.dur;
  if (f < a - 2 || f > b + 2) return null;
  const pin = ramp(f, a, a + 12);
  const pout = ramp(f, b - 6, b, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - pin) * 260 - pout * 340}px)`, opacity: pin * (1 - pout), filter: `blur(${(1 - pin) * 14 + pout * 14}px)` }}>
      <Mono s={22} c={K.amber} style={{ position: "absolute", left: 120, top: 120 }}>{kicker}</Mono>
      {children}
      <Src>{src}</Src>
    </AbsoluteFill>
  );
};
export const Evidence: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  // t1
  const a1 = at(g, 0, "eighty percent");
  // t2
  const a2 = at(g, 1, "rejected");
  // t3
  const a3a = at(g, 2, "eighty-five"), a3b = at(g, 2, "fewer than");
  // t4
  // t5
  const a5 = at(g, 3, "young graduates"), a5b = at(g, 3, "nearly nine");
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(255,59,48,0.08)" tint2="rgba(255,184,0,0.06)" />
      <DotGrid />
      <StatFrame g={g} i={0} kicker="Evidence 01 · The entry ramp is closing" src="Xpheno · mass fresher hiring, FY22 → FY25 (via India Today, 2026)">
        <div style={{ position: "absolute", left: 120, top: 250 }}>
          <Count from={0} to={80} a={a1 - 6} b={a1 + 20} s={330} c={K.noise} fmt={(n) => `−${Math.round(n)}%`} />
          <Mono s={30} c={K.text} style={{ marginTop: 10 }}>Mass fresher hiring in India</Mono>
          <Disp s={60} c={K.muted} style={{ marginTop: 24, opacity: ramp(f, a1 + 4, a1 + 14) }}>in three years</Disp>
        </div>
        <div style={{ position: "absolute", right: 200, bottom: 200, display: "flex", gap: 60, alignItems: "flex-end" }}>
          {[["FY22", 600, "rgba(255,255,255,0.3)"], ["FY25", 120, K.noise]].map(([y, v, c], k) => {
            const h = (v as number) * 0.95 * ramp(f, bs(g, 0) + 6 + k * 14, bs(g, 0) + 30 + k * 14);
            return (
              <div key={k} style={{ textAlign: "center" }}>
                <Disp s={46} c={c as string} style={{ marginBottom: 12 }}>~{v}K</Disp>
                <div style={{ width: 150, height: h, background: c as string, borderRadius: "10px 10px 0 0", boxShadow: k ? `0 0 50px ${K.noise}66` : undefined }} />
                <Mono s={20} style={{ marginTop: 12 }}>{y}</Mono>
              </div>
            );
          })}
        </div>
      </StatFrame>
      <StatFrame g={g} i={1} kicker="Evidence 02 · The trust collapse" src="Greenhouse survey of US employers, Nov 2026">
        <div style={{ position: "absolute", left: 120, top: 220 }}>
          <Disp s={260}>9<span style={{ color: K.dim }}>/10</span></Disp>
          <Sans s={46} w={650} style={{ marginTop: 16, maxWidth: 1300 }}>employers believe they rejected <span style={{ color: K.noise }}>real people</span> because the application looked fake.</Sans>
        </div>
        <div style={{ position: "absolute", left: 120, top: 700, display: "flex", gap: 40 }}>
          {Array.from({ length: 10 }).map((_, k) => {
            const stamp = k < 9 ? spr(f, a2 + k * 2.5, 10, 300) : 0;
            return (
              <div key={k} style={{ position: "relative" }}>
                <Person s={120} ring={k < 9 ? "rgba(244,243,238,0.55)" : K.signal} />
                {k < 9 ? <div style={{ position: "absolute", left: -6, top: 40, padding: "4px 10px", border: `4px solid ${K.noise}`, color: K.noise, fontFamily: F.mono, fontWeight: 700, fontSize: 24, transform: `rotate(-14deg) scale(${interpolate(stamp, [0, 1], [2.4, 1])})`, opacity: stamp, background: "rgba(5,6,10,0.7)" }}>FAKE?</div> : null}
              </div>
            );
          })}
        </div>
      </StatFrame>
      <StatFrame g={g} i={2} kicker="Evidence 03 · Skills-based hiring, in name only" src="Harvard Business School & Burning Glass Institute, 2024 · TestGorilla 2025">
        <div style={{ position: "absolute", left: 120, top: 230 }}>
          <Count to={85} a={a3a - 6} b={a3a + 14} s={250} fmt={(n) => `${Math.round(n)}%`} />
          <Mono s={28} c={K.text}>Say they hire for skills</Mono>
        </div>
        <div style={{ position: "absolute", left: 1040, top: 230, opacity: ramp(f, a3b - 4, a3b + 8) }}>
          <Disp s={250} c={K.noise}>0.14%</Disp>
          <Mono s={28} c={K.text}>Of hires actually changed · &lt; 1 in 700</Mono>
        </div>
        <div style={{ position: "absolute", left: 120, top: 700, width: 1680 }}>
          <div style={{ height: 70, width: `${85 * ramp(f, a3a, a3a + 20)}%`, background: "rgba(244,243,238,0.85)", borderRadius: 10 }} />
          <div style={{ height: 70, width: Math.max(6, 1680 * 0.0014) * ramp(f, a3b, a3b + 6), background: K.noise, borderRadius: 4, marginTop: 24, boxShadow: `0 0 30px ${K.noise}` }} />
          <Mono s={20} c={K.noise} style={{ marginTop: 14, opacity: ramp(f, a3b + 6, a3b + 14) }}>← that sliver is the real change</Mono>
        </div>
      </StatFrame>
      <StatFrame g={g} i={3} kicker="Evidence 04 · Degrees don't clear the market" src="ILO–IHD India Employment Report 2024 (2022 data) · youth unemployment by education">
        <div style={{ position: "absolute", left: 120, top: 230, width: 900 }}>
          <Sans s={52} w={650}>Young <span style={{ color: K.noise }}>graduates</span> were nearly</Sans>
          <Disp s={300} c={K.noise} style={{ opacity: ramp(f, a5b - 4, a5b + 6), textShadow: `0 0 60px ${K.noise}66` }}>9×</Disp>
          <Sans s={44} w={600} c={K.muted}>more likely to be unemployed than youth who cannot read or write.</Sans>
        </div>
        <div style={{ position: "absolute", right: 220, bottom: 200, display: "flex", gap: 80, alignItems: "flex-end" }}>
          {[["Graduates", 29.1, K.noise], ["Cannot read or write", 3.4, "rgba(255,255,255,0.4)"]].map(([l, v, c], k) => {
            const h = (v as number) * 18 * ramp(f, a5 + k * 6, a5 + 26 + k * 6);
            return (
              <div key={k} style={{ textAlign: "center", width: 220 }}>
                <Disp s={56} c={c as string} style={{ marginBottom: 12 }}>{v}%</Disp>
                <div style={{ width: 160, margin: "0 auto", height: h, background: c as string, borderRadius: "10px 10px 0 0" }} />
                <Mono s={18} style={{ marginTop: 12 }}>{l}</Mono>
              </div>
            );
          })}
        </div>
      </StatFrame>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 07 COLLAPSE
// =====================================================================================================
export const Collapse: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tS = at(g, 1, "signal");
  const n = ramp(f, tS - 4, tS + 10);
  const col = n > 0.5 ? K.noise : K.signal;
  return (
    <AbsoluteFill style={{ backgroundColor: K.ink, overflow: "hidden", transform: shake(f, [tS], 22) }}>
      <Bg tint={n > 0.5 ? "rgba(255,59,48,0.18)" : "rgba(61,245,200,0.1)"} />
      <Center style={{ top: 60 }}>
        <Wave h={360} noise={n} c={col} phase={f * 0.25} stroke={5} />
      </Center>
      <div style={{ position: "absolute", top: 180, width: "100%", textAlign: "center", opacity: spr(f, bs(g, 0)) }}>
        <Disp s={86} c={K.muted}>This isn't a talent shortage.</Disp>
      </div>
      <div style={{ position: "absolute", bottom: 170, width: "100%", display: "flex", justifyContent: "center", opacity: ramp(f, tS, tS + 4) }}>
        <Glitch s={200} c={K.noise} on={interpolate(f, [tS, tS + 40], [1.2, 0.2], CL)}>Signal collapse.</Glitch>
      </div>
      <Flash a={tS} c={K.noise} o={0.5} len={14} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 08 PIPELINE: every hand-off loses signal; nobody looks at the work
// =====================================================================================================
const STAGES: [string, string, string, string][] = [
  ["Syllabus", "Written years ago", "a syllabus", "College"],
  ["Résumé", "Self-reported", "into a résumé", "Student"],
  ["Keywords", "ATS software", "into keywords", "Vendor"],
  ["Interview", "Guesswork", "an interview", "Employer"],
];
export const Pipeline: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tS = STAGES.map(([, , p]) => at(g, 0, p));
  const tCo = at(g, 1, "different company"), tLoss = at(g, 1, "loses signal");
  const tWork = bs(g, 2);
  const lift = ramp(f, tWork - 4, tWork + 20, 0, 1, INOUT);
  const X = [110, 520, 930, 1340];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(77,163,255,0.08)" />
      <DotGrid />
      <AbsoluteFill style={{ transform: `translateY(${-lift * 150}px)` }}>
        {/* wave segments between stages */}
        {[0, 1, 2, 3, 4].map((k) => {
          const x0 = k === 0 ? 0 : X[k - 1] + 300;
          const x1 = k === 4 ? 1920 : X[k];
          const show = k === 0 ? 1 : ramp(f, tS[k - 1] + 4, tS[k - 1] + 18);
          return (
            <div key={k} style={{ position: "absolute", left: x0, top: 400, width: x1 - x0, height: 160, overflow: "hidden", opacity: show }}>
              <Wave w={1920} h={160} noise={Math.min(1, k * 0.26)} c={k < 2 ? K.signal : k < 4 ? K.amber : K.noise} phase={f * 0.3} stroke={3} amp={0.8} seed={k + 2} style={{ marginLeft: -x0 }} />
            </div>
          );
        })}
        {STAGES.map(([t, s, , co], k) => {
          const p = spr(f, tS[k] - 2, 15, 200);
          const coP = spr(f, tCo + k * 4, 14, 220);
          return (
            <div key={t} style={{ position: "absolute", left: X[k], top: 380, width: 300, opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
              <div style={{ opacity: coP, transform: `translateY(${(1 - coP) * 20}px)`, marginBottom: 14 }}>
                <Mono s={18} c={["#8B7CFF", "#4DA3FF", "#FFB800", "#FF7A59"][k]} w={700}>Company {String.fromCharCode(65 + k)} · {co}</Mono>
              </div>
              <Panel style={{ height: 180, padding: "28px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Disp s={58}>{t}</Disp>
                <Mono s={18} style={{ marginTop: 12 }}>{s}</Mono>
              </Panel>
            </div>
          );
        })}
        {/* signal loss markers */}
        {[0, 1, 2, 3].map((k) => {
          const p = spr(f, tLoss + k * 3, 10, 260);
          return <div key={k} style={{ position: "absolute", left: X[k] + 300 + 14, top: 640, opacity: p, transform: `scale(${interpolate(p, [0, 1], [1.8, 1])})` }}><Mono s={20} c={K.noise} w={700}>− signal</Mono></div>;
        })}
        <div style={{ position: "absolute", left: 1720, top: 420, width: 150, height: 150, borderRadius: "50%", border: `3px dashed ${K.noise}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: ramp(f, tS[3] + 8, tS[3] + 20) }}>
          <Disp s={46} c={K.noise}>Hire?</Disp>
        </div>
        {/* the work, never connected */}
        <div style={{ position: "absolute", left: 760, top: 900, width: 400, opacity: lift, transform: `scale(${0.8 + lift * 0.2})` }}>
          <div style={{ position: "absolute", inset: -40, borderRadius: 40, border: `3px dashed ${K.signal}`, opacity: 0.6 + Math.sin(f / 6) * 0.2 }} />
          <Panel glow={K.signal} style={{ padding: "34px 30px", textAlign: "center" }}>
            <Mono s={18} c={K.signal}>What the job actually is</Mono>
            <Disp s={84} c={K.signal} style={{ marginTop: 8 }}>The work</Disp>
          </Panel>
        </div>
        <svg width="1920" height="1300" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {X.map((x, k) => {
            const p = ramp(f, tWork + 6 + k * 4, tWork + 24 + k * 4);
            const sx = x + 150, sy = 570, ex = 960, ey = 890;
            const mx = lerp(sx, ex, 0.55 * p), my = lerp(sy, ey, 0.55 * p);
            return (
              <g key={k} opacity={p}>
                <line x1={sx} y1={sy} x2={mx} y2={my} stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="8 10" />
                <text x={mx} y={my + 10} fill={K.noise} fontFamily={F.mono} fontSize={36} fontWeight={700} textAnchor="middle">✕</text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", width: "100%", top: 90, textAlign: "center", opacity: ramp(f, tWork + 18, tWork + 30) }}>
        <Disp s={64}>Nobody looks at the work.</Disp>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 09 NEITHER + 39%
// =====================================================================================================
export const Neither: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const t2 = bs(g, 1);
  const out = ramp(f, t2 - 4, t2 + 12, 0, 1, INOUT);
  const t39 = at(g, 1, "thirty-nine");
  const lines: [string, string, number][] = [["Education starts with content.", "education", 0], ["Hiring starts with a résumé.", "hiring", 0], ["Neither starts with the work.", "neither", 1]];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <DotGrid />
      <div style={{ position: "absolute", left: 140, top: 230, opacity: 1 - out, transform: `translateY(${-out * 80}px)` }}>
        {lines.map(([t, p, hot], k) => {
          const a = at(g, 0, p);
          const q = spr(f, a - 2, 16, 200);
          return (
            <div key={k} style={{ opacity: q, transform: `translateX(${(1 - q) * -60}px)`, marginTop: k === 2 ? 70 : 24 }}>
              <Disp s={hot ? 150 : 96} c={hot ? K.signal : K.muted} style={hot ? { textShadow: `0 0 60px ${K.signal}55` } : undefined}>{t}</Disp>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ opacity: out }}>
        <div style={{ position: "absolute", left: 140, top: 230 }}>
          <Disp s={110}>The work won't</Disp>
          <Disp s={110} style={{ marginTop: 10 }}>sit <span style={{ color: K.amber, display: "inline-block", transform: `translate(${Math.sin(f / 2) * 6}px, ${Math.cos(f / 3) * 4}px) rotate(${Math.sin(f / 4) * 4}deg)` }}>still.</span></Disp>
          <div style={{ marginTop: 80, opacity: ramp(f, t39 - 4, t39 + 8) }}>
            <Count to={39} a={t39 - 4} b={t39 + 20} s={220} c={K.amber} fmt={(n) => `${Math.round(n)}%`} />
            <Mono s={28} c={K.text}>of core skills change by 2030</Mono>
          </div>
        </div>
        <div style={{ position: "absolute", left: 1080, top: 250, display: "grid", gridTemplateColumns: "repeat(10, 58px)", gap: 12 }}>
          {Array.from({ length: 100 }).map((_, k) => {
            const flip = random(`sk${k}`) < 0.39 ? ramp(f, t39 + random(`st${k}`) * 30, t39 + 10 + random(`st${k}`) * 30) : 0;
            return <div key={k} style={{ width: 58, height: 58, borderRadius: 10, background: flip > 0.5 ? K.amber : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", transform: `rotateY(${flip * 180}deg)`, boxShadow: flip > 0.5 ? `0 0 18px ${K.amber}88` : undefined }} />;
          })}
        </div>
        <Src>World Economic Forum · Future of Jobs Report 2025</Src>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 10 FLIP -> LOGO
// =====================================================================================================
export const Flip: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tLogo = bs(g, 1) + 2;
  const tWork = bs(g, 2);
  const rot = ramp(f, tLogo - 12, tLogo, 0, 180, INOUT);
  const lp = ramp(f, tLogo, tLogo + 28);
  return (
    <AbsoluteFill style={{ backgroundColor: K.ink, overflow: "hidden" }}>
      <Bg tint={`rgba(61,245,200,${0.08 + lp * 0.12})`} />
      <GridFloor opacity={lp * 0.45} />
      {f < tLogo ? (
        <Center style={{ perspective: 1200 }}>
          <div style={{ transform: `rotateX(${rot}deg)`, opacity: 1 - rot / 180 }}>
            <Disp s={170}>So we flipped it.</Disp>
          </div>
        </Center>
      ) : (
        <Center>
          <div style={{ transform: `scale(${1.15 - lp * 0.15})` }}><Logo p={lp} s={200} /></div>
          <div style={{ marginTop: 70, opacity: ramp(f, tWork, tWork + 10), transform: `translateY(${(1 - ramp(f, tWork, tWork + 14)) * 30}px)` }}>
            <Disp s={90}>We start with <span style={{ color: K.signal }}>the work.</span></Disp>
          </div>
        </Center>
      )}
      {/* burst */}
      {f >= tLogo ? Array.from({ length: 60 }).map((_, k) => {
        const a = random(`ba${k}`) * Math.PI * 2;
        const t = f - tLogo;
        const r = t * (8 + random(`bv${k}`) * 22);
        return <div key={k} style={{ position: "absolute", left: 960 + Math.cos(a) * r, top: 470 + Math.sin(a) * r, width: 4, height: 4, borderRadius: 2, background: K.signal, opacity: Math.max(0, 1 - t / 40), boxShadow: `0 0 10px ${K.signal}` }} />;
      }) : null}
      <Flash a={tLogo} c={K.signal} o={0.55} len={14} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 11 UNIT OF EXCHANGE
// =====================================================================================================
export const Unit: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const nots: [string, string][] = [["Courses", "not courses"], ["Résumés", "not résumés"], ["Job titles", "not job titles"]];
  const tV = at(g, 0, "verified capability"), tU = at(g, 0, "unit of exchange");
  const up = ramp(f, tV - 6, tV + 10, 0, 1, INOUT);
  const hp = spr(f, tV, 14, 120);
  const hex = (r: number) => Array.from({ length: 6 }).map((_, k) => `${(Math.cos((Math.PI / 3) * k - Math.PI / 2) * r).toFixed(1)},${(Math.sin((Math.PI / 3) * k - Math.PI / 2) * r).toFixed(1)}`).join(" ");
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <Dust n={50} o={0.35} />
      <div style={{ position: "absolute", width: "100%", top: interpolate(up, [0, 1], [400, 120]), display: "flex", justifyContent: "center", gap: 90, transform: `scale(${1 - up * 0.45})` }}>
        {nots.map(([t, p], k) => {
          const a = at(g, 0, p);
          const q = spr(f, a - 2, 15, 220);
          const cut = ramp(f, a + 8, a + 16);
          return (
            <div key={k} style={{ position: "relative", opacity: q }}>
              <Mono s={24} c={K.muted}>Not</Mono>
              <Disp s={120} c={K.muted}>{t}</Disp>
              <div style={{ position: "absolute", left: -10, right: -10, top: "62%", height: 12, background: K.noise, transform: `scaleX(${cut}) rotate(-3deg)`, transformOrigin: "left" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 960, top: 600, opacity: hp }}>
        <svg width="10" height="10" style={{ overflow: "visible", position: "absolute" }}>
          <g transform={`rotate(${f * 0.4}) scale(${hp})`}>
            <polygon points={hex(260)} fill="rgba(61,245,200,0.06)" stroke={K.signal} strokeWidth={3} style={{ filter: `drop-shadow(0 0 20px ${K.signal})` }} />
            <polygon points={hex(220)} fill="none" stroke="rgba(61,245,200,0.35)" strokeWidth={2} strokeDasharray="6 10" />
          </g>
        </svg>
        <div style={{ position: "absolute", left: -300, width: 600, top: -90, textAlign: "center" }}>
          <Mono s={22} c={K.signal}>Verified</Mono>
          <Disp s={92} style={{ marginTop: 8 }}>Capability</Disp>
          <Mono s={20} c={K.muted} style={{ marginTop: 14 }}>tied to real work</Mono>
        </div>
      </div>
      {/* exchange: learning <-> jobs */}
      <div style={{ opacity: ramp(f, tU - 6, tU + 8) }}>
        <div style={{ position: "absolute", left: 120, top: 560 }}><Disp s={80} c={K.muted}>Learning</Disp></div>
        <div style={{ position: "absolute", right: 120, top: 560 }}><Disp s={80} c={K.muted}>Jobs</Disp></div>
        {Array.from({ length: 8 }).map((_, k) => {
          const t = ((f - tU) * 0.012 + k / 8) % 1;
          const x = k % 2 ? lerp(1700, 220, t) : lerp(220, 1700, t);
          const dimm = Math.abs(x - 960) < 280 ? 0 : 1;
          return <div key={k} style={{ position: "absolute", left: x, top: 600 + (k % 2 ? 40 : -40), width: 18, height: 18, transform: "rotate(45deg)", background: K.signal, opacity: dimm * 0.9, boxShadow: `0 0 16px ${K.signal}` }} />;
        })}
        <div style={{ position: "absolute", width: "100%", bottom: 140, textAlign: "center" }}><Mono s={30} c={K.text}>The new unit of exchange</Mono></div>
      </div>
    </AbsoluteFill>
  );
};
