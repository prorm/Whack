import React from "react";
import { AbsoluteFill, OffthreadVideo, random, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import {
  K, F, CL, INOUT, G, at, end, bs, spr, ramp, lerp, shake, Mono, Disp, Sans, Bg, GridFloor, DotGrid, Flash, Glitch,
  Panel, Chip, Src, Count, Draw, Person, Mark, Dust, Center,
} from "./kit";

// shared: a generic interview-puzzle card (no brand look)
const PROBLEM = ["def two_sum(nums, target):", "    seen = {}", "    for i, x in enumerate(nums):", "        if target - x in seen:", "            return [seen[target - x], i]", "        seen[x] = i"];
const Puzzle: React.FC<{ f: number; typeA: number; typeB: number; ai?: boolean; ok: number; w?: number }> = ({ f, typeA, typeB, ai, ok, w = 860 }) => {
  const total = PROBLEM.join("\n").length;
  const n = Math.round(interpolate(f, [typeA, typeB], [0, total], CL));
  let left = n;
  return (
    <Panel style={{ width: w, padding: 0, overflow: "hidden", borderColor: ai ? K.violet : undefined }} glow={ai && ok > 0 ? K.violet : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Mono s={16} c={K.text} w={700}>#1 · Two Sum</Mono>
        <Mono s={14} c={K.amber}>Medium</Mono>
        <div style={{ marginLeft: "auto" }}><Mono s={15} c={ai ? K.violet : K.muted}>{ai ? "AI · 00:04" : "You · 00:41:12"}</Mono></div>
      </div>
      <div style={{ padding: "18px 24px", fontFamily: F.mono, fontSize: 21, lineHeight: 1.6, minHeight: 250, background: "rgba(0,0,0,0.35)" }}>
        {PROBLEM.map((l, k) => {
          const take = Math.max(0, Math.min(l.length, left));
          left -= l.length + 1;
          return <div key={k} style={{ whiteSpace: "pre", color: "rgba(244,243,238,0.88)" }}>{l.slice(0, take)}{take > 0 && take < l.length ? <span style={{ color: ai ? K.violet : K.signal }}>▍</span> : null}</div>;
        })}
      </div>
      <div style={{ padding: "14px 24px", display: "flex", gap: 14, alignItems: "center", opacity: ok }}>
        <Chip label="Accepted" st="proven" s={17} />
        <Mono s={15} c={K.muted}>runtime beats 98%</Mono>
      </div>
    </Panel>
  );
};

// =====================================================================================================
// 00 GRIND: everyone runs the same drill
// =====================================================================================================
export const Grind: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const t1 = at(g, 1, "grind leetcode"), t2 = at(g, 1, "memorise"), t3 = at(g, 1, "build the"), t4 = at(g, 1, "polish");
  const tM = bs(g, 2), tPrep = at(g, 2, "the same prep"), tJobs = at(g, 2, "chasing");
  const phase = f < t1 - 3 ? 0 : f < t2 - 3 ? 1 : f < t3 - 3 ? 2 : f < t4 - 3 ? 3 : f < tM - 3 ? 4 : 5;
  const cutHits = [t1 - 3, t2 - 3, t3 - 3, t4 - 3, tM - 3];
  const Word: React.FC<{ a: string; b: string; t: number }> = ({ a, b, t }) => {
    const p = spr(f, t - 3, 13, 260);
    return (
      <div style={{ position: "absolute", left: 120, top: 330 }}>
        <div style={{ overflow: "hidden" }}><Disp s={150} style={{ transform: `translateY(${(1 - p) * 160}px)` }}>{a}</Disp></div>
        <div style={{ overflow: "hidden", marginTop: 8 }}><Disp s={150} c={K.signal} style={{ transform: `translateY(${(1 - spr(f, t + 1, 13, 260)) * 160}px)` }}>{b}</Disp></div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink, transform: shake(f, cutHits, 7) }}>
      {phase === 0 ? (
        <AbsoluteFill>
          <Bg tint="rgba(61,245,200,0.08)" />
          {/* faint scrolling code wall */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.09, fontFamily: F.mono, fontSize: 22, lineHeight: 1.5, color: K.signal, transform: `translateY(${-f * 3}px)`, padding: 60, whiteSpace: "pre" }}>
            {Array.from({ length: 60 }).map((_, k) => PROBLEM[k % PROBLEM.length]).join("\n")}
          </div>
          <div style={{ position: "absolute", left: 120, top: 360 }}>
            <Mono s={24} c={K.signal} style={{ opacity: spr(f, 2) }}>Day 1 · problem 1 · 02:14 AM</Mono>
            <Disp s={170} style={{ marginTop: 20, opacity: spr(f, at(g, 0, "you know") - 2), transform: `translateY(${(1 - spr(f, at(g, 0, "you know") - 2)) * 40}px)` }}>
              You know the drill<span style={{ color: K.signal, opacity: f % 18 < 9 ? 1 : 0 }}>_</span>
            </Disp>
          </div>
        </AbsoluteFill>
      ) : null}
      {phase === 1 ? (
        <AbsoluteFill>
          <Bg />
          <Word a="Grind" b="LeetCode." t={t1} />
          <div style={{ position: "absolute", right: 110, top: 210, transform: `perspective(1600px) rotateY(-14deg) scale(${0.95 + spr(f, t1) * 0.05})` }}>
            <Puzzle f={f} typeA={t1} typeB={t1 + 70} ok={ramp(f, t1 + 60, t1 + 66)} w={760} />
          </div>
          <div style={{ position: "absolute", right: 120, top: 720 }}>
            <Mono s={18}>Solved</Mono>
            <Count to={400} a={t1} b={t2 - 6} s={110} c={K.signal} />
          </div>
        </AbsoluteFill>
      ) : null}
      {phase === 2 ? (
        <AbsoluteFill>
          <Bg tint="rgba(77,163,255,0.12)" />
          <DotGrid />
          <Word a="Memorise" b="system design." t={t2} />
          <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
            {[["Client", 1100, 300], ["Load balancer", 1420, 300], ["API ×3", 1420, 500], ["Cache", 1180, 680], ["DB · shard", 1640, 680], ["Queue", 1700, 480]].map(([l, x, y], k) => {
              const p = spr(f, t2 + k * 4, 14, 220);
              return (
                <g key={k} opacity={p} transform={`translate(${x as number}, ${y as number}) scale(${p})`}>
                  <rect x={-110} y={-42} width={220} height={84} rx={14} fill="rgba(77,163,255,0.12)" stroke={K.blue} strokeWidth={2} />
                  <text x={0} y={8} textAnchor="middle" fill={K.text} fontFamily={F.sans} fontSize={24} fontWeight={650}>{l}</text>
                </g>
              );
            })}
            {[[1210, 300, 1310, 300], [1420, 342, 1420, 458], [1360, 542, 1230, 638], [1480, 542, 1600, 638], [1530, 500, 1590, 488]].map(([a, b, c, d], k) => (
              <Draw key={k} d={`M ${a} ${b} L ${c} ${d}`} p={ramp(f, t2 + 8 + k * 4, t2 + 20 + k * 4)} c={K.blue} w={3} />
            ))}
          </svg>
          <Mono s={20} c={K.blue} style={{ position: "absolute", left: 1100, top: 190 }}>Design a URL shortener · 45 min</Mono>
        </AbsoluteFill>
      ) : null}
      {phase === 3 ? (
        <AbsoluteFill>
          <Bg tint="rgba(255,184,0,0.08)" />
          <Word a="Build the" b="same 3 projects." t={t3} />
          <div style={{ position: "absolute", left: 1000, top: 140, width: 880, height: 800, overflow: "hidden" }}>
            {Array.from({ length: 48 }).map((_, k) => {
              const col = k % 6, row = Math.floor(k / 6);
              const label = ["To-do app", "Weather app", "Movie clone"][k % 3];
              const p = spr(f, t3 + (col + row) * 1.3, 15, 220);
              return (
                <div key={k} style={{ position: "absolute", left: col * 148, top: row * 100 - ((f - t3) * 1.5), width: 136, height: 88, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: `1.5px solid ${k < 3 ? K.amber : "rgba(255,255,255,0.14)"}`, padding: 10, opacity: p * (k < 3 ? 1 : 0.65), transform: `scale(${p})` }}>
                  <div style={{ height: 22, borderRadius: 5, background: k < 3 ? "rgba(255,184,0,0.35)" : "rgba(255,255,255,0.12)" }} />
                  <Mono s={12} c={k < 3 ? K.amber : K.muted} style={{ marginTop: 10 }}>{label}</Mono>
                </div>
              );
            })}
          </div>
          <Mono s={22} c={K.amber} style={{ position: "absolute", left: 120, top: 700, opacity: ramp(f, t3 + 14, t3 + 22) }}>× every portfolio in your batch</Mono>
        </AbsoluteFill>
      ) : null}
      {phase === 4 ? (
        <AbsoluteFill>
          <Bg light />
          <div style={{ position: "absolute", left: 120, top: 330 }}>
            <div style={{ overflow: "hidden" }}><Disp s={150} c={K.ink} style={{ transform: `translateY(${(1 - spr(f, t4 - 3, 13, 260)) * 160}px)` }}>Polish the</Disp></div>
            <div style={{ overflow: "hidden", marginTop: 8 }}><Disp s={150} c="#0FB894" style={{ transform: `translateY(${(1 - spr(f, t4 + 1, 13, 260)) * 160}px)` }}>same résumé.</Disp></div>
          </div>
          <div style={{ position: "absolute", right: 170, top: 130, width: 560, height: 800, background: "#fff", borderRadius: 10, boxShadow: "0 40px 90px rgba(0,0,0,0.18)", padding: 46, transform: `rotate(${3 - spr(f, t4) * 3}deg) translateY(${(1 - spr(f, t4)) * 200}px)` }}>
            <div style={{ height: 26, width: "55%", background: K.ink, borderRadius: 4 }} />
            {["Proficient in DSA", "Solved 400+ problems", "System design", "Team player", "Fast learner", "React · Node · Python"].map((t, k) => (
              <div key={t} style={{ marginTop: 34, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: K.ink }} />
                <Sans s={26} c={K.ink} w={500} style={{ background: f > t4 + 6 + k * 3 ? "rgba(255,184,0,0.45)" : "transparent" }}>{t}</Sans>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      ) : null}
      {phase === 5 ? (() => {
        const pull = ramp(f, tM - 3, tM + 40, 0, 1, INOUT);
        return (
          <AbsoluteFill>
            <Bg tint="rgba(61,245,200,0.06)" />
            <div style={{ position: "absolute", inset: 0, perspective: 900 }}>
              <div style={{ position: "absolute", left: -600, right: -600, top: 300, height: 1600, transform: `rotateX(64deg) scale(${1.6 - pull * 0.6})`, transformOrigin: "50% 0%" }}>
                {Array.from({ length: 900 }).map((_, k) => {
                  const col = k % 45, row = Math.floor(k / 45);
                  const march = ((f - tM) * 4 + row * 60) % 1300;
                  const x = col * 70 + (random(`gx${k}`) - 0.5) * 20;
                  const toward = (x - 1560) * (1 - march / 1300) * 0.0;
                  return <div key={k} style={{ position: "absolute", left: x - toward, top: 1300 - march, width: 30, height: 38, borderRadius: 4, background: "rgba(244,243,238,0.7)", opacity: Math.min(1, march / 200) * (0.25 + random(`go${k}`) * 0.6) }} />;
                })}
              </div>
            </div>
            {/* the same few jobs: a tiny glowing door on the horizon */}
            <div style={{ position: "absolute", left: 930, top: 420, width: 60, height: 92, borderRadius: "8px 8px 0 0", background: K.signal, boxShadow: `0 0 60px ${K.signal}, 0 0 160px ${K.signal}`, opacity: ramp(f, tJobs - 6, tJobs + 6) }} />
            <div style={{ position: "absolute", left: 120, top: 110 }}>
              {[["Millions of us.", tM], ["The same prep.", tPrep], ["Chasing the same few jobs.", tJobs]].map(([t, a], k) => {
                const p = spr(f, (a as number) - 3, 14, 240);
                return <div key={k} style={{ overflow: "hidden" }}><Disp s={k === 2 ? 84 : 84} c={k === 2 ? K.signal : K.text} style={{ transform: `translateY(${(1 - p) * 100}px)` }}>{t}</Disp></div>;
              })}
            </div>
            <div style={{ position: "absolute", right: 120, top: 120, textAlign: "right", opacity: ramp(f, tM + 6, tM + 16) }}>
              <Count to={15} a={tM + 6} b={tM + 30} s={110} fmt={(n) => `~${Math.round(n)} lakh`} />
              <Mono s={18}>engineering graduates · every year</Mono>
            </div>
            <Src>Economic Times / India Today graduate-output reporting, 2025–26</Src>
          </AbsoluteFill>
        );
      })() : null}
      <Flash a={t1 - 3} o={0.18} len={6} />
      <Flash a={t2 - 3} o={0.18} len={6} />
      <Flash a={t3 - 3} o={0.18} len={6} />
      <Flash a={t4 - 3} o={0.18} len={6} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 00b AI WAVE: the machine does the prep
// =====================================================================================================
export const AiWave: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tAi = at(g, 0, "do the prep"), tSol = at(g, 1, "it solves"), tRes = at(g, 1, "it writes"), tEight = at(g, 1, "eight in ten");
  const t6 = bs(g, 2), tFree = at(g, 2, "for free");
  const ph = f < tRes - 3 ? 0 : f < t6 - 3 ? 1 : 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink, transform: shake(f, [tAi, tFree], 16) }}>
      <Bg tint="rgba(139,124,255,0.16)" tint2="rgba(139,124,255,0.06)" />
      {ph === 0 ? (
        <AbsoluteFill>
          {/* grid of puzzles flipping to accepted in a radial wave */}
          {Array.from({ length: 96 }).map((_, k) => {
            const col = k % 12, row = Math.floor(k / 12);
            const x = 40 + col * 158, y = 40 + row * 128;
            const d = Math.hypot(col - 5.5, row - 3.5);
            const hit = f > tSol + 8 + d * 3;
            return <div key={k} style={{ position: "absolute", left: x, top: y, width: 140, height: 108, borderRadius: 12, border: `1.5px solid ${hit ? K.violet : "rgba(255,255,255,0.08)"}`, background: hit ? "rgba(139,124,255,0.16)" : "rgba(255,255,255,0.02)", opacity: 0.35 + (hit ? 0.5 : 0), transform: `scale(${hit ? 1 : 0.94})` }}>
              {hit ? <Mono s={12} c={K.violet} style={{ padding: 10 }}>Accepted · 4 s</Mono> : null}
            </div>;
          })}
          <Center>
            <div style={{ transform: `scale(${0.9 + spr(f, 0) * 0.1})` }}>
              <Puzzle f={f} typeA={tAi} typeB={tAi + 8} ai ok={ramp(f, tAi + 8, tAi + 12)} />
            </div>
            <div style={{ marginTop: 40, overflow: "hidden" }}>
              <Disp s={110} style={{ transform: `translateY(${(1 - spr(f, bs(g, 0) + 2, 13, 240)) * 120}px)` }}>Then <span style={{ color: K.violet }}>AI</span> learned the prep.</Disp>
            </div>
          </Center>
          <Flash a={tAi} c={K.violet} o={0.35} len={10} />
        </AbsoluteFill>
      ) : null}
      {ph === 1 ? (
        <AbsoluteFill>
          {/* hyperspeed résumé */}
          <div style={{ position: "absolute", left: 120, top: 140, width: 560, height: 780, background: "#fff", borderRadius: 10, padding: 40, boxShadow: `0 0 0 2px ${K.violet}, 0 0 80px ${K.violet}55`, transform: `translateY(${(1 - spr(f, tRes - 3)) * 120}px)` }}>
            <Mono s={14} c={K.violet} w={700}>Generated in 3.1 s</Mono>
            {Array.from({ length: 14 }).map((_, k) => {
              const on = f > tRes + k * 1.2;
              return <div key={k} style={{ height: k % 4 === 0 ? 18 : 11, width: `${60 + random(`rw${k}`) * 38}%`, marginTop: k % 4 === 0 ? 30 : 14, borderRadius: 4, background: k % 4 === 0 ? K.ink : "rgba(0,0,0,0.18)", opacity: on ? 1 : 0, boxShadow: on && f < tRes + k * 1.2 + 4 ? `0 0 16px ${K.violet}` : undefined }} />;
            })}
          </div>
          <div style={{ position: "absolute", left: 780, top: 160, opacity: ramp(f, tEight - 4, tEight + 6) }}>
            <Disp s={240}>8<span style={{ color: K.dim }}>/10</span></Disp>
            <Sans s={44} w={650} style={{ marginTop: 10, maxWidth: 1000 }}>candidates use AI on coding tests, <span style={{ color: K.violet }}>even when it's banned.</span></Sans>
          </div>
          <div style={{ position: "absolute", left: 780, top: 640, display: "flex", gap: 30 }}>
            {Array.from({ length: 10 }).map((_, k) => {
              const on = k < 8 && f > tEight + 6 + k * 2;
              return <div key={k} style={{ position: "relative" }}>
                <Person s={86} ring={on ? K.violet : "rgba(244,243,238,0.4)"} />
                {on ? <div style={{ position: "absolute", top: -14, right: -8 }}><Chip label="AI" st="gap" s={12} style={{ borderColor: K.violet, color: K.violet, background: "rgba(139,124,255,0.2)" }} /></div> : null}
              </div>;
            })}
          </div>
          <Src>Karat 2026, cited in industry reporting · CodeSignal: suspected cheating 16% → 35% (2024–25)</Src>
        </AbsoluteFill>
      ) : null}
      {ph === 2 ? (
        <AbsoluteFill>
          {/* the streak heatmap shatters */}
          {Array.from({ length: 26 * 7 }).map((_, k) => {
            const col = Math.floor(k / 7), row = k % 7;
            const x0 = 120 + col * 30, y0 = 560 + row * 30;
            const t = Math.max(0, f - tFree - random(`sh${k}`) * 8);
            const a = random(`sa${k}`) * Math.PI * 2;
            const v = 6 + random(`sv${k}`) * 16;
            return <div key={k} style={{ position: "absolute", left: x0 + Math.cos(a) * v * t, top: y0 + Math.sin(a) * v * t + t * t * 0.4, width: 24, height: 24, borderRadius: 5, background: random(`sc${k}`) > 0.3 ? `rgba(61,245,200,${0.3 + random(`sd${k}`) * 0.7})` : "rgba(255,255,255,0.07)", transform: `rotate(${t * (random(`sr${k}`) - 0.5) * 20}deg)`, opacity: Math.max(0, 1 - t / 40) }} />;
          })}
          <div style={{ position: "absolute", left: 120, top: 170 }}>
            <Mono s={22} c={K.signal}>You</Mono>
            <Disp s={140}>2 years of grinding.</Disp>
          </div>
          <div style={{ position: "absolute", left: 120, top: 830, display: "flex", gap: 30, alignItems: "baseline", opacity: ramp(f, tFree - 4, tFree + 4) }}>
            <Mono s={22} c={K.violet}>A machine</Mono>
            <Glitch s={140} c={K.violet} on={interpolate(f, [tFree, tFree + 30], [1, 0.1], CL)}>For free.</Glitch>
          </div>
          <Flash a={tFree} c={K.violet} o={0.4} len={12} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// =====================================================================================================
// REVISION REELS: mistakes come back on day 1, 3, 7, 21
// =====================================================================================================
export const Reels: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tMis = at(g, 0, "gets something"), tRem = at(g, 0, "remembers");
  const tDays = ["day one", "three", "seven", "twenty-one"].map((p) => at(g, 1, p));
  const tScroll = bs(g, 2), tHabit = at(g, 2, "now does");
  const phone = spr(f, 0, 16, 140);
  const reelStage = f < tMis + 10 ? 0 : f < tRem + 6 ? 1 : 2;
  const scroll = ramp(f, tScroll, tScroll + 30, 0, 1, INOUT);
  // memory curve: decays, jumps at each review, decays slower
  const X0 = 940, X1 = 1800, Y0 = 400, Y1 = 690;
  const days = [0, 1, 3, 7, 21];
  const xd = (d: number) => X0 + Math.sqrt(d / 24) * (X1 - X0);
  let path = "";
  const reveal = ramp(f, tDays[0] - 10, tDays[3] + 20);
  for (let s = 0; s <= 240; s++) {
    const d = Math.pow(s / 240, 2) * 24;
    if (s / 240 > reveal) break;
    let last = 0, k = 0;
    days.forEach((dd, i) => { if (d >= dd) { last = dd; k = i; } });
    const half = 0.8 * Math.pow(2.6, k);
    const m = Math.exp(-(d - last) / half);
    const y = Y1 - (Y1 - Y0) * (0.25 + 0.75 * m);
    path += `${s === 0 ? "M" : "L"} ${xd(d).toFixed(1)} ${y.toFixed(1)} `;
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(255,184,0,0.08)" tint2="rgba(61,245,200,0.08)" />
      <DotGrid />
      {/* phone */}
      <div style={{ position: "absolute", left: 220, top: 100, width: 430, height: 860, borderRadius: 56, background: "#000", border: "10px solid #1b1d26", boxShadow: "0 50px 120px rgba(0,0,0,0.6)", overflow: "hidden", transform: `translateY(${(1 - phone) * 300}px) rotate(${(1 - phone) * -8}deg)` }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-scroll * 860}px)` }}>
          {/* reel 1: Aarav's mistake */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 410, height: 840, background: reelStage === 2 ? "linear-gradient(180deg,#2a0d10,#05060a)" : "linear-gradient(180deg,#0f1630,#05060a)", padding: 34 }}>
            <Mono s={13} c={K.amber}>Revise · due today</Mono>
            {reelStage === 0 ? (
              <div style={{ marginTop: 160 }}>
                <Disp s={52}>The gateway retries.</Disp>
                <Sans s={26} c={K.muted} style={{ marginTop: 20 }}>Same event. Second delivery.</Sans>
              </div>
            ) : reelStage === 1 ? (
              <div style={{ marginTop: 160 }}>
                <Disp s={52}>Credited twice?</Disp>
                <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
                  {["Yes", "No"].map((t, k) => <div key={t} style={{ flex: 1, padding: "18px 0", textAlign: "center", borderRadius: 16, border: `2px solid ${k === 1 && f > tMis + 18 ? K.noise : "rgba(255,255,255,0.3)"}`, background: k === 1 && f > tMis + 18 ? "rgba(255,59,48,0.2)" : "transparent" }}><Sans s={30} w={700}>{t}</Sans></div>)}
                </div>
                <Mono s={14} style={{ marginTop: 20 }}>Forced prediction · before the answer</Mono>
              </div>
            ) : (
              <div style={{ marginTop: 140 }}>
                <Disp s={72} c={K.noise}>Twice.</Disp>
                <Sans s={30} w={650} style={{ marginTop: 16 }}>₹499 × 2</Sans>
                <Panel style={{ marginTop: 40, padding: 20 }}>
                  <Mono s={13} c={K.signal}>The fix</Mono>
                  <div style={{ fontFamily: F.mono, fontSize: 18, color: K.signal, marginTop: 8 }}>if seen(event.id): ignore</div>
                </Panel>
                <Mono s={13} c={K.amber} style={{ marginTop: 26 }}>Your mistake · comes back on day 3</Mono>
              </div>
            )}
            <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}>
              <div style={{ width: `${ramp(f, 0, tScroll) * 100}%`, height: "100%", background: K.amber, borderRadius: 2 }} />
            </div>
          </div>
          {/* reel 2: real product footage from the solar track */}
          <div style={{ position: "absolute", left: 0, top: 860, width: 410, height: 840, overflow: "hidden", background: "#000" }}>
            <div style={{ position: "absolute", left: -478, top: 0, width: 1494, height: 840 }}>
              <OffthreadVideo src={staticFile("captures/02_flux_reels_mistake.mp4")} muted startFrom={30 * 9} style={{ width: 1494, height: 840 }} />
            </div>
            <div style={{ position: "absolute", left: 20, top: 20 }}><Chip label="Real product · solar track" st="new" s={12} /></div>
          </div>
        </div>
      </div>
      {/* review ladder + memory curve */}
      <div style={{ position: "absolute", left: 940, top: 150, opacity: ramp(f, tRem - 6, tRem + 6) }}>
        <Mono s={20} c={K.amber}>CAPABLE remembers</Mono>
        <Disp s={64} style={{ marginTop: 8 }}>Your exact mistake. Back on schedule.</Disp>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} y1={Y1 + 10} x2={X1} y2={Y1 + 10} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
        <path d={path} fill="none" stroke={K.signal} strokeWidth={5} style={{ filter: `drop-shadow(0 0 10px ${K.signal})` }} />
      </svg>
      {days.slice(1).map((d, k) => {
        const p = spr(f, tDays[k] - 2, 11, 260);
        return (
          <div key={d} style={{ position: "absolute", left: xd(d), top: Y1 + 34, transform: `translateX(-50%) scale(${p})`, opacity: p, textAlign: "center" }}>
            <div style={{ width: 64, height: 84, borderRadius: 10, margin: "0 auto", background: "linear-gradient(180deg,#0f1630,#05060a)", border: `2px solid ${K.amber}`, boxShadow: `0 0 24px ${K.amber}66` }} />
            <Mono s={18} c={K.text} w={700} style={{ marginTop: 10 }}>Day {d}</Mono>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 940, top: 880, opacity: ramp(f, tHabit - 6, tHabit + 6) }}>
        <Disp s={60}>The scroll habit <span style={{ color: K.signal }}>does the revision.</span></Disp>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// AI IN THE ROOM
// =====================================================================================================
export const AiRoom: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tA = at(g, 0, "reading"), tB = at(g, 0, "fixing"), tC = at(g, 0, "explaining");
  const tests: [string, string, number, string][] = [["Read a system", "you've never seen", tA, K.blue], ["Fix it", "without breaking anything", tB, K.signal], ["Explain it", "to a human", tC, K.amber]];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(139,124,255,0.12)" />
      <GridFloor color="rgba(139,124,255,0.4)" opacity={0.25} />
      {/* the AI orb */}
      <div style={{ position: "absolute", left: 1500, top: 250, width: 260, height: 260 }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ position: "absolute", inset: -k * 40, borderRadius: "50%", border: `2px solid ${K.violet}`, opacity: 0.5 - k * 0.14, transform: `rotateX(70deg) rotate(${f * (1.2 + k * 0.7)}deg)` }} />
        ))}
        <div style={{ position: "absolute", inset: 60, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #c9c0ff, ${K.violet} 55%, #2b2270)`, boxShadow: `0 0 80px ${K.violet}, 0 0 160px ${K.violet}88`, transform: `scale(${1 + Math.sin(f / 8) * 0.04})` }} />
        <Mono s={18} c={K.violet} style={{ position: "absolute", top: 290, width: 260, textAlign: "center" }}>AI · in the room</Mono>
      </div>
      <div style={{ position: "absolute", left: 120, top: 150, width: 1200 }}>
        <div style={{ overflow: "hidden" }}><Disp s={92} style={{ transform: `translateY(${(1 - spr(f, 2, 14, 220)) * 110}px)` }}>We don't pretend AI</Disp></div>
        <div style={{ overflow: "hidden" }}><Disp s={92} c={K.violet} style={{ transform: `translateY(${(1 - spr(f, 6, 14, 220)) * 110}px)` }}>isn't in the room.</Disp></div>
        <Mono s={22} style={{ marginTop: 26, opacity: ramp(f, at(g, 0, "we test") - 4, at(g, 0, "we test") + 6) }}>We test what still matters when it is</Mono>
      </div>
      <div style={{ position: "absolute", left: 120, top: 560, display: "flex", gap: 34 }}>
        {tests.map(([a, b, t, c], k) => {
          const p = spr(f, t - 4, 14, 200);
          return (
            <div key={a} style={{ width: 520, height: 300, borderRadius: 24, padding: 34, border: `2px solid ${c}`, background: `linear-gradient(160deg, ${c}26, rgba(5,6,10,0.4))`, boxShadow: `0 0 50px ${c}33`, opacity: p, transform: `translateY(${(1 - p) * 120}px) perspective(1200px) rotateX(${(1 - p) * 30}deg)` }}>
              <Mono s={18} c={c} w={700}>Test {k + 1}</Mono>
              <Disp s={64} style={{ marginTop: 18 }}>{a}</Disp>
              <Sans s={32} c={K.muted} w={500} style={{ marginTop: 12 }}>{b}</Sans>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// BUSINESS MODEL + MOAT
// =====================================================================================================
const STREAMS: [string, string, string, string][] = [["Employers", "Per verified shortlist", "employers pay", K.signal], ["Enterprises", "Verification API + AI Pair seats", "enterprises", K.blue], ["Colleges & ITIs", "Outcome data", "colleges", K.amber]];
export const Money: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tFree = at(g, 0, "learners never"), tFee = at(g, 1, "fifteen"), tMoat = bs(g, 2), tM2 = at(g, 2, "that's the moat");
  const wheel = ramp(f, tMoat - 6, tMoat + 18, 0, 1, INOUT);
  const cx = 960, cy = 560;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(61,245,200,0.1)" />
      <DotGrid />
      <AbsoluteFill style={{ opacity: 1 - wheel, transform: `scale(${1 - wheel * 0.2})` }}>
        {/* core */}
        <div style={{ position: "absolute", left: cx - 110, top: cy - 110, width: 220, height: 220, borderRadius: 40, background: "rgba(61,245,200,0.08)", border: `3px solid ${K.signal}`, boxShadow: `0 0 80px ${K.signal}55`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <Mark s={90} p={1} />
          <Mono s={16} c={K.text} style={{ marginTop: 8 }}>CAPABLE</Mono>
        </div>
        {/* learners: free */}
        <div style={{ position: "absolute", left: 120, top: 150, opacity: spr(f, tFree - 4), transform: `translateX(${(1 - spr(f, tFree - 4)) * -80}px)` }}>
          <Mono s={20} c={K.signal}>Learners</Mono>
          <Disp s={110}>Free. Forever.</Disp>
          <Sans s={28} c={K.muted} w={500} style={{ marginTop: 10 }}>Nobody pays to prove what they can do.</Sans>
        </div>
        {/* revenue streams flowing into the core */}
        {STREAMS.map(([t, s, p, c], k) => {
          const a = at(g, 1, p);
          const q = spr(f, a - 4, 14, 200);
          const x = 1420, y = 330 + k * 230;
          return (
            <React.Fragment key={t}>
              <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
                <Draw d={`M ${x} ${y + 50} C ${x - 220} ${y + 50}, ${cx + 260} ${cy}, ${cx + 112} ${cy}`} p={ramp(f, a, a + 18)} c={c} w={3} glow />
                {f > a + 18 ? Array.from({ length: 4 }).map((_, j) => {
                  const u = (((f - a) * 0.025 + j / 4) % 1);
                  const bx = Math.pow(1 - u, 3) * x + 3 * Math.pow(1 - u, 2) * u * (x - 220) + 3 * (1 - u) * u * u * (cx + 260) + u * u * u * (cx + 112);
                  const by = Math.pow(1 - u, 3) * (y + 50) + 3 * Math.pow(1 - u, 2) * u * (y + 50) + 3 * (1 - u) * u * u * cy + u * u * u * cy;
                  return <circle key={j} cx={bx} cy={by} r={7} fill={c} style={{ filter: `drop-shadow(0 0 8px ${c})` }} />;
                }) : null}
              </svg>
              <div style={{ position: "absolute", left: x, top: y, width: 440, opacity: q, transform: `translateX(${(1 - q) * 80}px)` }}>
                <Panel style={{ padding: "20px 26px", borderColor: c }}>
                  <Mono s={16} c={c} w={700}>{t}</Mono>
                  <Sans s={32} w={700} style={{ marginTop: 6 }}>{s}</Sans>
                </Panel>
              </div>
            </React.Fragment>
          );
        })}
        {/* recruiter fee comparison */}
        <div style={{ position: "absolute", left: 120, top: 640, width: 620, opacity: ramp(f, tFee - 4, tFee + 8) }}>
          <Mono s={18} c={K.muted}>Recruiter fee today</Mono>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
            <div style={{ height: 44, width: 480 * ramp(f, tFee, tFee + 20), background: "linear-gradient(90deg,#8a1d17,#FF3B30)", borderRadius: 8 }} />
            <Disp s={44} c={K.noise} style={{ whiteSpace: "nowrap" }}>15–30%</Disp>
          </div>
          <Mono s={16} style={{ marginTop: 10 }}>of first-year salary, per hire</Mono>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26 }}>
            <div style={{ height: 44, width: 90 * ramp(f, tFee + 16, tFee + 30), background: K.signal, borderRadius: 8, boxShadow: `0 0 24px ${K.signal}` }} />
            <Sans s={28} w={650}>CAPABLE · a fraction, per verified shortlist</Sans>
          </div>
        </div>
        <Src>Staffing fee benchmarks 2026 (permanent placement 15–30% of first-year salary)</Src>
      </AbsoluteFill>
      {/* flywheel */}
      <AbsoluteFill style={{ opacity: wheel }}>
        <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
          <g transform={`rotate(${f * 0.6} ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={300} fill="none" stroke={K.signal} strokeWidth={4} strokeDasharray="40 20" style={{ filter: `drop-shadow(0 0 12px ${K.signal})` }} />
          </g>
        </svg>
        {["More employers", "Sharper graph", "Receipts worth more", "More learners"].map((t, k) => {
          const a = -Math.PI / 2 + (k / 4) * Math.PI * 2 + f * 0.0105;
          const p = spr(f, tMoat + k * 4, 14, 200);
          return (
            <div key={t} style={{ position: "absolute", left: cx + Math.cos(a) * 300, top: cy + Math.sin(a) * 300, transform: `translate(-50%,-50%) scale(${p})` }}>
              <Chip label={t} st="proven" s={22} style={{ background: K.ink }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <Disp s={120} c={K.signal} style={{ opacity: ramp(f, tM2 - 4, tM2 + 6), textShadow: `0 0 60px ${K.signal}66` }}>The moat.</Disp>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
