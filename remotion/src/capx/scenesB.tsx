import React from "react";
import { AbsoluteFill, Img, random, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import {
  K, F, CL, INOUT, G, at, end, bs, spr, ramp, lerp, shake, Mono, Disp, Sans, Bg, GridFloor, DotGrid, Sweep, Flash, Glitch, Wave,
  Panel, Chip, ChipState, Src, DemoTag, Count, Draw, Person, Logo, Mark, Dust, Center, Scan,
} from "./kit";

const NAME: Record<string, string> = {
  programming: "Programming", "http-apis": "HTTP APIs", "log-analysis": "Log analysis", "api-debugging": "API debugging",
  "regression-testing": "Regression testing", "payments-idempotency": "Payment idempotency", "incident-response": "Incident response",
  "incident-report": "Incident report", sql: "SQL", git: "Git", retries: "Retries & timeouts", spreadsheets: "Spreadsheets",
  reconciliation: "Reconciliation", "customer-communication": "Customer comms", linux: "Linux", containers: "Containers", "ci-cd": "CI/CD",
};

// =====================================================================================================
// 12 THE LOOP
// =====================================================================================================
const LOOP: [string, string, string][] = [
  ["01", "Work Compiler", "compile the demand"],
  ["02", "Shared Graph", "map it"],
  ["03", "Career GPS", "find each"],
  ["04", "Labs + Reels", "practise"],
  ["05", "Unseen Proof", "prove it"],
  ["06", "Opportunity", "carry that"],
  ["07", "Market Delta", "and when"],
];
export const Loop: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const draw = ramp(f, bs(g, 0), at(g, 0, "one closed") + 20, 0, 1, INOUT);
  const tN = LOOP.map(([, , p]) => at(g, 1, p));
  const cx = 960, cy = 560, R = 330;
  const active = tN.reduce((a, t, k) => (f >= t - 2 ? k : a), -1);
  const ang = (k: number) => -Math.PI / 2 + (k / LOOP.length) * Math.PI * 2;
  const comet = active >= 0 ? interpolate(f, [tN[Math.max(0, active)], (tN[active + 1] ?? end(g, 1)) ], [active, active + 1], CL) : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <GridFloor opacity={0.18} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={K.signal} strokeWidth={4} strokeDasharray={2 * Math.PI * R} strokeDashoffset={2 * Math.PI * R * (1 - draw)} transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 10px ${K.signal})` }} />
        {active >= 0 ? (() => {
          const a = -Math.PI / 2 + (comet / LOOP.length) * Math.PI * 2;
          return <circle cx={cx + Math.cos(a) * R} cy={cy + Math.sin(a) * R} r={14} fill="#fff" style={{ filter: `drop-shadow(0 0 18px ${K.signal}) drop-shadow(0 0 40px ${K.signal})` }} />;
        })() : null}
      </svg>
      <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)", textAlign: "center", opacity: draw }}>
        <Mark s={120} p={draw} />
        <Mono s={22} c={K.text} style={{ marginTop: 14 }}>One closed loop</Mono>
      </div>
      {LOOP.map(([n, t], k) => {
        const a = ang(k);
        const x = cx + Math.cos(a) * (R + 10), y = cy + Math.sin(a) * (R + 10);
        const on = f >= tN[k] - 2;
        const p = spr(f, tN[k] - 2, 14, 220);
        const right = Math.cos(a) > 0.2, left = Math.cos(a) < -0.2;
        const delta = k === 6;
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: on ? (delta ? K.amber : K.signal) : "rgba(255,255,255,0.15)", boxShadow: on ? `0 0 30px ${delta ? K.amber : K.signal}` : undefined, transform: `scale(${1 + p * 0.3})`, opacity: draw }} />
            <div style={{ position: "absolute", top: right || left ? -18 : y < cy ? -92 : 50, left: right ? 60 : left ? undefined : -200, right: left ? 60 : undefined, width: right || left ? 380 : 400, textAlign: right ? "left" : left ? "right" : "center", opacity: interpolate(p, [0, 1], [0.25, 1]) * draw }}>
              <Mono s={18} c={on ? (delta ? K.amber : K.signal) : K.dim} w={700}>{n}</Mono>
              <Disp s={48} c={on ? K.text : K.dim}>{t}</Disp>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 13 WORK COMPILER
// =====================================================================================================
const REQ = "Our junior backend developers should be capable of investigating failed payment transactions, identifying API errors, fixing bugs without introducing regressions and writing an incident report. We work in JavaScript with REST APIs and SQL.";
const HL = ["investigating failed payment transactions", "identifying API errors", "fixing bugs without introducing regressions", "writing an incident report", "JavaScript", "REST APIs", "SQL"];
const TASKS = ["Investigate failed payment transactions", "Identify API errors", "Fix bugs without regressions", "Write an incident report"];
const CAPS: [string, string, ChipState][] = [
  ["programming", "CodeLab", "idle"], ["http-apis", "CodeLab", "idle"], ["api-debugging", "Unseen CodeLab", "idle"], ["regression-testing", "Hidden tests", "idle"],
  ["payments-idempotency", "Payments lab", "idle"], ["incident-response", "Unseen incident", "idle"], ["incident-report", "Human review", "idle"], ["sql", "Awaiting validation", "pending"],
];
export const Compiler: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const typeA = bs(g, 0) + 6, typeB = end(g, 0) + 4;
  const nChars = Math.round(interpolate(f, [typeA, typeB], [0, REQ.length], CL));
  const tTasks = at(g, 1, "four work"), tCaps = at(g, 1, "eight capabilities"), tEv = at(g, 1, "evidence");
  const tImp = at(g, 2, "reading logs");
  const tCur = bs(g, 3);
  const cur = ramp(f, tCur - 4, tCur + 16, 0, 1, INOUT);
  const scan = ramp(f, bs(g, 1), tTasks + 6);
  // highlighted text
  const parts: React.ReactNode[] = [];
  let i = 0;
  const shown = REQ.slice(0, nChars);
  while (i < shown.length) {
    const hit = HL.map((h) => ({ h, j: REQ.indexOf(h, i) })).filter((x) => x.j === i)[0];
    if (hit) {
      const seg = shown.slice(i, i + hit.h.length);
      const k = HL.indexOf(hit.h);
      const on = f > tTasks - 8 + k * 3;
      parts.push(<span key={i} style={{ background: on ? (k < 4 ? "rgba(255,184,0,0.35)" : "rgba(61,245,200,0.28)") : "transparent", borderRadius: 6, padding: "0 4px", transition: "none" }}>{seg}</span>);
      i += seg.length;
    } else {
      const nextHit = Math.min(...HL.map((h) => { const j = REQ.indexOf(h, i); return j < 0 ? 1e9 : j; }));
      const seg = shown.slice(i, Math.min(shown.length, nextHit));
      parts.push(<span key={i}>{seg}</span>);
      i += seg.length;
    }
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(255,184,0,0.08)" />
      <DotGrid />
      <AbsoluteFill style={{ transform: `scale(${1 - cur * 0.12}) translateY(${cur * -40}px)`, filter: `blur(${cur * 6}px)`, opacity: 1 - cur * 0.6 }}>
        <Panel light style={{ position: "absolute", left: 90, top: 160, width: 760, padding: "34px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Mono s={17} c="rgba(0,0,0,0.55)">Maya · in her own words</Mono>
            <DemoTag light>Paylane · DEMO</DemoTag>
          </div>
          <Sans s={36} c={K.ink} w={500} style={{ marginTop: 22, lineHeight: 1.45 }}>
            {parts}
            <span style={{ opacity: f % 20 < 10 && nChars < REQ.length ? 1 : 0, color: K.ink }}>▍</span>
          </Sans>
        </Panel>
        {/* compile beam */}
        <div style={{ position: "absolute", left: 850, top: 160, width: 120, height: 620, opacity: scan > 0 && scan < 1 ? 1 : 0 }}>
          {Array.from({ length: 10 }).map((_, k) => <div key={k} style={{ position: "absolute", left: ((f * 14 + k * 30) % 120), top: 40 + k * 60, width: 50, height: 3, background: K.amber, boxShadow: `0 0 12px ${K.amber}` }} />)}
        </div>
        {/* tasks */}
        <div style={{ position: "absolute", left: 990, top: 150 }}>
          <Mono s={20} c={K.amber} style={{ opacity: ramp(f, tTasks - 4, tTasks + 4) }}>Work tasks · 4</Mono>
          {TASKS.map((t, k) => {
            const p = spr(f, tTasks + k * 4, 15, 200);
            return (
              <div key={k} style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14, opacity: p, transform: `translateX(${(1 - p) * -120}px)` }}>
                <Mono s={18} c={K.amber} w={700}>T{k + 1}</Mono>
                <Sans s={30} w={600}>{t}</Sans>
              </div>
            );
          })}
        </div>
        {/* capabilities */}
        <div style={{ position: "absolute", left: 990, top: 450, width: 860 }}>
          <Mono s={20} c={K.signal} style={{ opacity: ramp(f, tCaps - 4, tCaps + 4) }}>Capabilities · 8 · each with its evidence</Mono>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px", marginTop: 16 }}>
            {CAPS.map(([id, ev, st], k) => {
              const p = spr(f, tCaps + k * 2.5, 14, 220);
              const e = ramp(f, tEv + k * 2, tEv + 8 + k * 2);
              return (
                <div key={id} style={{ opacity: p, transform: `scale(${0.6 + p * 0.4})`, transformOrigin: "left center", display: "flex", flexDirection: "column", gap: 6 }}>
                  <Chip label={NAME[id]} st={st} s={20} />
                  <Mono s={14} c={st === "pending" ? K.amber : K.muted} style={{ opacity: e, paddingLeft: 18 }}>↳ {ev}</Mono>
                </div>
              );
            })}
          </div>
        </div>
        {/* implied prerequisite */}
        <div style={{ position: "absolute", left: 90, top: 720, opacity: spr(f, tImp - 6, 10, 240), transform: `translateY(${(1 - spr(f, tImp - 6, 10, 240)) * -200}px) rotate(${(1 - spr(f, tImp - 6)) * -6}deg)` }}>
          <Chip label="Log analysis" st="implied" s={30} icon="+" />
          <Mono s={18} c={K.amber} style={{ marginTop: 12 }}>Prerequisite she never wrote down</Mono>
        </div>
      </AbsoluteFill>
      {/* curriculum punchline */}
      <Center style={{ opacity: cur }}>
        <div style={{ position: "relative", height: 200, width: 420, marginBottom: 60 }}>
          {Array.from({ length: 5 }).map((_, k) => (
            <div key={k} style={{ position: "absolute", left: k * 10, top: 120 - k * 26, width: 400, height: 70, borderRadius: 12, background: k === 4 ? K.signal : "rgba(61,245,200,0.15)", border: `2px solid ${K.signal}`, transform: `translateY(${(1 - spr(f, tCur + k * 3)) * 80}px)`, display: "flex", alignItems: "center", paddingLeft: 24 }}>
              {k === 4 ? <Mono s={20} c={K.ink} w={700}>Curriculum · compiled</Mono> : null}
            </div>
          ))}
        </div>
        <Disp s={96} style={{ textAlign: "center" }}>A job description just</Disp>
        <Disp s={96} c={K.signal} style={{ textAlign: "center", marginTop: 8 }}>became a curriculum.</Disp>
      </Center>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 14 SHARED GRAPH
// =====================================================================================================
const SHARED = ["programming", "http-apis", "log-analysis", "api-debugging", "regression-testing", "payments-idempotency", "incident-response"];
const EMP = [
  { n: "Paylane", r: "Junior Backend Engineer", x: 330, y: 330, own: ["incident-report", "sql"] },
  { n: "KiranaCart", r: "Backend Developer Intern", x: 1590, y: 330, own: ["git"] },
  { n: "Metro Ledger", r: "Payments Support Engineer", x: 960, y: 190, own: ["retries", "reconciliation", "spreadsheets", "customer-communication"] },
];
const fpos = (k: number) => {
  const a = -Math.PI / 2 + (k / SHARED.length) * Math.PI * 2;
  return [960 + Math.cos(a) * 250, 640 + Math.sin(a) * 170];
};
export const Graph: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tE = [at(g, 0, "two more") - 30, at(g, 0, "two more"), at(g, 0, "different titles")];
  const tMerge = at(g, 1, "seven capabilities"), tFound = at(g, 1, "shared foundation"), tBranch = at(g, 1, "own branch");
  const tNet = bs(g, 2), tDoors = at(g, 2, "one capability");
  const net = ramp(f, tNet, tNet + 40);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(61,245,200,0.08)" />
      <DotGrid />
      {/* network effect: many employers */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: net }}>
        {Array.from({ length: 26 }).map((_, k) => {
          const a = random(`na${k}`) * Math.PI * 2;
          const r = 620 + random(`nr${k}`) * 300;
          const x = 960 + Math.cos(a) * r * 1.2, y = 600 + Math.sin(a) * r * 0.6;
          const p = ramp(f, tNet + k * 1.5, tNet + 14 + k * 1.5);
          const pulse = ((f - tNet - k * 3) % 40) / 40;
          return (
            <g key={k} opacity={p}>
              <line x1={x} y1={y} x2={960} y2={640} stroke="rgba(61,245,200,0.18)" strokeWidth={1.5} />
              <circle cx={lerp(x, 960, pulse)} cy={lerp(y, 640, pulse)} r={3} fill={K.signal} />
              <circle cx={x} cy={y} r={9} fill="rgba(255,255,255,0.5)" />
            </g>
          );
        })}
      </svg>
      {/* foundation glow */}
      <div style={{ position: "absolute", left: 960 - 360, top: 640 - 250, width: 720, height: 500, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(61,245,200,${0.22 * ramp(f, tFound - 6, tFound + 10)}), transparent 70%)` }} />
      <div style={{ position: "absolute", left: 960, top: 640, transform: "translate(-50%,-50%)", textAlign: "center", opacity: ramp(f, tFound - 4, tFound + 8) }}>
        <Disp s={86} c={K.signal}>7</Disp>
        <Mono s={18} c={K.text}>Shared foundation</Mono>
      </div>
      {/* employers */}
      {EMP.map((e, k) => {
        const p = spr(f, tE[k], 15, 180);
        return (
          <div key={e.n} style={{ position: "absolute", left: e.x, top: e.y, transform: `translate(-50%,-50%) scale(${p})`, opacity: p }}>
            <Panel style={{ padding: "18px 24px", textAlign: "center", minWidth: 330 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}><Disp s={36}>{e.n}</Disp><DemoTag style={{ fontSize: 12, padding: "3px 8px" }}>DEMO</DemoTag></div>
              <Mono s={16} style={{ marginTop: 8 }}>{e.r}</Mono>
            </Panel>
          </div>
        );
      })}
      {/* shared chips: three copies converge into one */}
      {EMP.map((e, ek) => SHARED.map((id, k) => {
        const appear = spr(f, tE[ek] + 6 + k * 1.5, 15, 200);
        const sa = (k / SHARED.length) * Math.PI * 2 + ek;
        const sx = e.x + Math.cos(sa) * 210, sy = e.y + (ek === 2 ? 190 : 120) + Math.sin(sa) * 60;
        const [fx, fy] = fpos(k);
        const m = ramp(f, tMerge + k * 2, tMerge + 22 + k * 2, 0, 1, INOUT);
        const x = lerp(sx, fx, m), y = lerp(sy, fy, m);
        const hide = ek > 0 && m >= 1 ? 0 : 1;
        if (appear <= 0.01) return null;
        return (
          <div key={`${ek}${id}`} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${appear * (0.75 + m * 0.2)})`, opacity: appear * hide * (ek > 0 ? 1 - m * 0.4 : 1) }}>
            <Chip label={NAME[id]} st={m > 0.95 ? "proven" : "idle"} s={17} />
          </div>
        );
      }))}
      {/* employer branches */}
      {EMP.map((e, ek) => e.own.map((id, k) => {
        const appear = spr(f, tE[ek] + 14 + k * 2, 15, 200);
        const hl = ramp(f, tBranch, tBranch + 10);
        const x = ek === 2 ? e.x + (k - 1.5) * 215 : e.x;
        const y = ek === 2 ? e.y + 100 : e.y - 100 - k * 52;
        return (
          <div key={`b${ek}${id}`} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: appear }}>
            <Chip label={NAME[id]} st={hl > 0.5 ? "gap" : "idle"} s={16} />
          </div>
        );
      }))}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {EMP.map((e, k) => <Draw key={k} d={`M ${e.x} ${e.y + 50} Q ${(e.x + 960) / 2} ${(e.y + 640) / 2 + 60} 960 ${640 - 40}`} p={ramp(f, tFound + k * 4, tFound + 24 + k * 4)} c="rgba(61,245,200,0.6)" w={2} />)}
      </svg>
      <div style={{ position: "absolute", width: "100%", bottom: 140, textAlign: "center", opacity: ramp(f, tDoors - 4, tDoors + 8) }}>
        <Disp s={64}>One capability. <span style={{ color: K.signal }}>Many doors.</span></Disp>
      </div>
      <div style={{ position: "absolute", left: 80, top: 520, width: 360, opacity: ramp(f, tNet + 10, tNet + 22) }}>
        <Mono s={18} c={K.signal}>Network effect</Mono>
        <Sans s={30} w={600} style={{ marginTop: 8 }}>Every employer who joins sharpens the graph for everyone.</Sans>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 15 CAREER GPS
// =====================================================================================================
const ROUTE: [string, number, number][] = [
  ["programming", 200, 720], ["http-apis", 470, 560], ["log-analysis", 760, 700], ["api-debugging", 1040, 520], ["payments-idempotency", 1320, 690], ["incident-response", 1580, 520],
];
export const Gps: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tProven = at(g, 0, "already proven"), tSkip = at(g, 1, "never sits"), tGap = at(g, 2, "real gap"), tRoute = at(g, 2, "the shortest");
  const route = ramp(f, tGap, end(g, 2), 0, 1, INOUT);
  const pts = [...ROUTE.map(([, x, y]) => [x, y]), [1790, 700]];
  const d = pts.map(([x, y], k) => (k === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const proven = new Set(["programming", "http-apis"]);
  const seg = route * (pts.length - 1);
  const si = Math.min(pts.length - 2, Math.floor(seg));
  const car = [lerp(pts[si][0], pts[si + 1][0], seg - si), lerp(pts[si][1], pts[si + 1][1], seg - si)];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(77,163,255,0.10)" />
      {/* map texture */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        {Array.from({ length: 40 }).map((_, k) => {
          const x1 = random(`mx1${k}`) * 1920, y1 = random(`my1${k}`) * 1080;
          return <line key={k} x1={x1} y1={y1} x2={x1 + (random(`mx2${k}`) - 0.5) * 900} y2={y1 + (random(`my2${k}`) - 0.5) * 300} stroke="rgba(255,255,255,0.12)" strokeWidth={random(`mw${k}`) * 6 + 1} strokeLinecap="round" />;
        })}
      </svg>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <Draw d={d} p={route} c={K.blue} w={10} glow len={2400} />
      </svg>
      {ROUTE.map(([id, x, y], k) => {
        const p = spr(f, bs(g, 0) + 6 + k * 3, 15, 200);
        const isP = proven.has(id) && f > tProven + k * 4;
        const isGap = !proven.has(id) && f > tGap + 6;
        return (
          <div key={id} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${p})` }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", margin: "0 auto", background: isP ? K.signal : isGap ? K.blue : "rgba(255,255,255,0.4)", boxShadow: isP ? `0 0 30px ${K.signal}` : isGap ? `0 0 26px ${K.blue}` : undefined }} />
            <div style={{ position: "absolute", left: "50%", top: k % 2 ? 40 : -70, transform: "translateX(-50%)" }}>
              <Chip label={NAME[id]} st={isP ? "proven" : isGap ? "gap" : "idle"} s={18} icon={isP ? "✓" : undefined} />
            </div>
          </div>
        );
      })}
      {/* destination */}
      <div style={{ position: "absolute", left: 1790, top: 700, transform: "translate(-50%,-50%)", opacity: spr(f, bs(g, 0) + 24) }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: K.amber, boxShadow: `0 0 40px ${K.amber}`, transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center", width: 260 }}>
          <Mono s={16} c={K.amber} w={700}>Destination</Mono>
          <Sans s={24} w={650}>Paylane · Junior Backend</Sans>
        </div>
      </div>
      {/* you are here / car */}
      <div style={{ position: "absolute", left: car[0], top: car[1], transform: "translate(-50%,-50%)" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", boxShadow: `0 0 0 8px rgba(77,163,255,0.35), 0 0 40px ${K.blue}` }} />
        <Mono s={15} c="#fff" style={{ position: "absolute", top: 40, left: -30, whiteSpace: "nowrap", opacity: route < 0.05 ? 1 : 0 }}>Aarav · here</Mono>
      </div>
      {/* skipped lesson */}
      <div style={{ position: "absolute", left: 90, top: 150, opacity: spr(f, tSkip - 8), transform: `translateY(${(1 - spr(f, tSkip - 8)) * -40}px)` }}>
        <Panel style={{ padding: "20px 26px", width: 520, position: "relative" }}>
          <Mono s={16}>Course · module 1</Mono>
          <Sans s={34} w={650} c={K.muted} style={{ marginTop: 6 }}>Intro to programming · 20 h</Sans>
          <div style={{ position: "absolute", left: 16, right: 16, top: "58%", height: 6, background: K.noise, transform: `scaleX(${ramp(f, tSkip + 4, tSkip + 12)})`, transformOrigin: "left" }} />
          <div style={{ position: "absolute", right: -20, top: -24, padding: "6px 14px", border: `3px solid ${K.signal}`, color: K.signal, fontFamily: F.mono, fontWeight: 700, fontSize: 20, transform: `rotate(8deg) scale(${interpolate(spr(f, tSkip + 10, 10, 300), [0, 1], [2.2, 1])})`, opacity: spr(f, tSkip + 10, 10, 300), background: K.ink }}>SKIPPED · PROVEN</div>
        </Panel>
      </div>
      {/* HUD */}
      <Panel style={{ position: "absolute", right: 90, top: 150, padding: "20px 28px", opacity: ramp(f, tRoute - 10, tRoute) }}>
        <Mono s={16} c={K.blue}>Route · shortest credible path</Mono>
        <Disp s={52} style={{ marginTop: 8 }}>4 capabilities to prove</Disp>
        <Mono s={15} style={{ marginTop: 8 }}>Starting where the demand is</Mono>
      </Panel>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 16 WORK LAB (practice incident)
// =====================================================================================================
const LOGS = [
  ["12:04:11", "POST /webhooks/gateway  evt_6yl payment.captured  ORD-7069  → 200", 0],
  ["12:04:11", "ledger credit ORD-7069  49900", 0],
  ["12:05:18", "POST /webhooks/gateway  evt_6yl payment.captured  ORD-7069  → 200", 1],
  ["12:05:18", "ledger credit ORD-7069  49900", 1],
  ["12:13:14", "ALERT reconciliation: ORD-7069 credited 2× vs 1 capture", 2],
] as const;
const CODE = [
  "function handleWebhook(event, db) {",
  "  if (event.type === 'payment.captured') {",
  "    const paise = Math.round(Number(event.amount) * 100)",
  "    db.ledger.push({ orderId: event.orderId, paise })",
  "    db.processed.add(event.id)",
  "    return { status: 200, body: 'ok' }",
  "  }",
];
const FIX = "  if (db.processed.has(event.id)) return { status: 200 }";
export const Lab: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tInc = at(g, 0, "he gets"), tLogs = at(g, 1, "reads the"), tTests = at(g, 1, "runs the"), tFix = at(g, 1, "ships the");
  const pIn = spr(f, 0, 16, 140);
  const fixN = Math.round(interpolate(f, [tFix - 6, tFix + 18], [0, FIX.length], CL));
  const pass = f > tFix + 22;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(61,245,200,0.07)" />
      <div style={{ position: "absolute", width: "100%", top: 80, textAlign: "center", opacity: 1 - ramp(f, tInc - 6, tInc) }}>
        <Disp s={90} c={K.muted}>No video about debugging.</Disp>
      </div>
      <div style={{ position: "absolute", left: 90, top: 150, right: 90, bottom: 150, transform: `translateY(${(1 - pIn) * 60}px) perspective(2000px) rotateX(${(1 - ramp(f, tInc - 10, tInc + 20)) * 18}deg)`, opacity: ramp(f, tInc - 12, tInc) }}>
        <Panel style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 26 }}>
          <div style={{ height: 66, display: "flex", alignItems: "center", gap: 20, padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
            <Mono s={17} c={K.text}>CodeLab · practice incident</Mono>
            <div style={{ marginLeft: "auto" }}><Chip label="Orders credited twice" st="new" s={16} /></div>
          </div>
          <div style={{ position: "absolute", left: 28, top: 110, width: 740, opacity: ramp(f, tInc - 4, tInc + 6) * (1 - ramp(f, tLogs - 24, tLogs - 16)) }}>
            <Mono s={16} c={K.amber}>Ticket · finance</Mono>
            <Sans s={38} w={650} style={{ marginTop: 14 }}>Reconciliation failed overnight. Some orders appear twice in our ledger, but each customer was charged once.</Sans>
            <Mono s={16} style={{ marginTop: 20 }}>Find out why. Fix it without breaking anything else.</Mono>
          </div>
          {/* logs */}
          <div style={{ position: "absolute", left: 28, top: 96, width: 760, opacity: ramp(f, tLogs - 20, tLogs - 12) }}>
            <Mono s={16} c={K.muted}>Production log</Mono>
            {LOGS.map(([t, l, k], q) => {
              const show = f > tLogs - 20 + q * 5;
              const hot = k > 0 && f > tLogs + 10;
              return (
                <div key={q} style={{ fontFamily: F.mono, fontSize: 19, lineHeight: 1.5, marginTop: 10, color: hot ? (k === 2 ? K.noise : K.amber) : "rgba(244,243,238,0.75)", opacity: show ? 1 : 0, background: hot && k === 1 ? "rgba(255,184,0,0.12)" : hot ? "rgba(255,59,48,0.12)" : undefined, padding: "2px 8px", borderRadius: 6 }}>
                  <span style={{ color: K.dim }}>{t}</span> {l}
                </div>
              );
            })}
            <Mono s={16} c={K.amber} style={{ marginTop: 18, opacity: ramp(f, tLogs + 12, tLogs + 20) }}>↑ same event id, delivered twice (gateway retry)</Mono>
          </div>
          {/* code */}
          <div style={{ position: "absolute", left: 830, top: 96, right: 28 }}>
            <Mono s={16} c={K.muted}>payments.js</Mono>
            <div style={{ marginTop: 10, background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: "18px 20px", fontFamily: F.mono, fontSize: 20, lineHeight: 1.6 }}>
              {[CODE[0], ...(fixN > 0 ? [FIX.slice(0, fixN)] : []), ...CODE.slice(1)].map((l, q) => {
                const isFix = fixN > 0 && q === 1;
                return (
                  <div key={q} style={{ whiteSpace: "pre", color: isFix ? K.signal : "rgba(244,243,238,0.85)", background: isFix ? "rgba(61,245,200,0.1)" : undefined, borderLeft: isFix ? `3px solid ${K.signal}` : "3px solid transparent", paddingLeft: 8 }}>
                    <span style={{ color: K.dim, marginRight: 16 }}>{String(q + 1).padStart(2, " ")}</span>{l}
                  </div>
                );
              })}
            </div>
            {/* tests */}
            <div style={{ marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap", opacity: ramp(f, tTests - 4, tTests + 4) }}>
              {Array.from({ length: 8 }).map((_, q) => {
                const fail = !pass && q === 1;
                const ok = pass || (q !== 1 && f > tTests + q * 2);
                return <div key={q} style={{ width: 92, height: 44, borderRadius: 10, background: fail ? "rgba(255,59,48,0.2)" : ok ? "rgba(61,245,200,0.18)" : "rgba(255,255,255,0.06)", border: `2px solid ${fail ? K.noise : ok ? K.signal : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 16, color: fail ? K.noise : ok ? K.signal : K.dim }}>{fail ? "FAIL" : ok ? "PASS" : "···"}</div>;
              })}
            </div>
            <Disp s={56} c={pass ? K.signal : K.noise} style={{ marginTop: 18, opacity: ramp(f, tTests, tTests + 6) }}>{pass ? "8 / 8 practice checks" : "7 / 8 · retried delivery credited twice"}</Disp>
          </div>
        </Panel>
      </div>
      <Flash a={tFix + 22} c={K.signal} o={0.25} len={10} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 17 UNSEEN PROOF
// =====================================================================================================
export const Unseen: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tDraw = at(g, 0, "the server draws"), tSeed = at(g, 0, "its answer");
  const tBox = bs(g, 1), tChecks = at(g, 1, "six hidden"), tSame = at(g, 1, "same code");
  const out = ramp(f, tBox - 6, tBox + 14, 0, 1, INOUT);
  const flip = ramp(f, tDraw + 18, tDraw + 30, 0, 180, INOUT);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(139,124,255,0.10)" />
      <GridFloor color="rgba(139,124,255,0.45)" opacity={0.25} />
      {/* card shuffle */}
      <AbsoluteFill style={{ opacity: 1 - out, transform: `translateX(${-out * 500}px) scale(${1 - out * 0.3})`, perspective: 1600 }}>
        <Mono s={22} c={K.violet} style={{ position: "absolute", left: 120, top: 130 }}>The real test</Mono>
        {[0, 1, 2, 3].map((k) => {
          const sh = Math.sin((f - tDraw) / 3 + k * 1.7) * 220 * ramp(f, tDraw - 10, tDraw, 1, 0) * (f < tDraw ? 1 : 0);
          const chosen = k === 2;
          const pick = chosen ? ramp(f, tDraw + 4, tDraw + 18, 0, 1, INOUT) : 0;
          const x = 960 + (k - 1.5) * 260 + sh * 0.6 - pick * ((k - 1.5) * 260);
          const y = 470 - pick * 40;
          const sc = 1 + pick * 0.55;
          const r = chosen ? flip : 0;
          return (
            <div key={k} style={{ position: "absolute", left: x, top: y, width: 230, height: 320, marginLeft: -115, marginTop: -160, transform: `scale(${sc}) rotateY(${r}deg)`, transformStyle: "preserve-3d", opacity: chosen ? 1 : 1 - ramp(f, tDraw + 4, tDraw + 14), zIndex: chosen ? 2 : 1 }}>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 20, background: "linear-gradient(135deg,#1d1a3a,#0e0d1c)", border: `2px solid ${K.violet}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${K.violet}44` }}>
                <Disp s={110} c={K.violet}>?</Disp>
              </div>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 20, background: K.paper, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Mono s={13} c="rgba(0,0,0,0.5)">Unseen incident</Mono>
                <Sans s={27} c={K.ink} w={750}>Refunds larger than the payment</Sans>
                <Mono s={12} c="#B07B00">Drawn by the server</Mono>
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 960, top: 820, transform: "translateX(-50%)", display: "flex", gap: 18, alignItems: "center", opacity: ramp(f, tSeed - 4, tSeed + 8) }}>
          <svg width="40" height="46" viewBox="0 0 40 46"><rect x="4" y="20" width="32" height="24" rx="6" fill={K.violet} /><path d="M11 20 V13 a9 9 0 0 1 18 0 V20" stroke={K.violet} strokeWidth="5" fill="none" /></svg>
          <Mono s={24} c={K.text}>Seed + answer key · server only</Mono>
        </div>
      </AbsoluteFill>
      {/* sandbox */}
      <AbsoluteFill style={{ opacity: out }}>
        <div style={{ position: "absolute", left: 300, top: 470, perspective: 1400 }}>
          <div style={{ width: 340, height: 340, position: "relative", transformStyle: "preserve-3d", transform: `rotateX(-22deg) rotateY(${35 + f * 0.4}deg)` }}>
            {[["0,0,170", 0, 0], ["0,0,-170", 0, 180], ["170,0,0", 90, 0], ["-170,0,0", -90, 0]].map(([, ry, rr], k) => (
              <div key={k} style={{ position: "absolute", inset: 0, transform: `rotateY(${(ry as number) + (rr as number)}deg) translateZ(170px)`, border: `2px solid ${K.signal}`, background: "rgba(61,245,200,0.06)", boxShadow: `inset 0 0 40px rgba(61,245,200,0.15)` }} />
            ))}
            <div style={{ position: "absolute", inset: 0, transform: "rotateX(90deg) translateZ(170px)", border: `2px solid ${K.signal}`, background: "rgba(61,245,200,0.1)" }} />
          </div>
          <div style={{ position: "absolute", left: 170, top: 170, transform: "translate(-50%,-50%)" }}>
            <svg width="70" height="80" viewBox="0 0 40 46"><rect x="4" y="20" width="32" height="24" rx="6" fill={K.signal} /><path d="M11 20 V13 a9 9 0 0 1 18 0 V20" stroke={K.signal} strokeWidth="5" fill="none" /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", left: 140, top: 150 }}>
          <Mono s={20} c={K.signal}>Locked sandbox</Mono>
          <Mono s={16} style={{ marginTop: 10 }}>Separate process · no network · no code generation · 4 s kill</Mono>
        </div>
        <div style={{ position: "absolute", left: 880, top: 280 }}>
          <Mono s={20} c={K.text}>Hidden checks</Mono>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 280px)", gap: 18, marginTop: 20 }}>
            {["Valid refund accepted", "Over-refund rejected · 422", "Partial refunds add up", "Capture still credited once", "Retries stay idempotent", "Nothing else regressed"].map((t, k) => {
              const on = f > tChecks + 6 + k * 5;
              return (
                <div key={k} style={{ height: 120, borderRadius: 16, padding: 18, border: `2px solid ${on ? K.signal : "rgba(255,255,255,0.18)"}`, background: on ? "rgba(61,245,200,0.12)" : "rgba(255,255,255,0.03)", boxShadow: on ? `0 0 30px ${K.signal}33` : undefined }}>
                  <Mono s={15} c={on ? K.signal : K.dim} w={700}>Check {k + 1} {on ? "· pass" : ""}</Mono>
                  <Sans s={22} w={600} c={on ? K.text : K.dim} style={{ marginTop: 10 }}>{t}</Sans>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 40, opacity: ramp(f, tSame - 4, tSame + 6) }}>
            <Disp s={70}>Same code → <span style={{ color: K.signal }}>same result.</span></Disp>
            <Mono s={18} style={{ marginTop: 12 }}>Deterministic · reproducible · re-graded by the server</Mono>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 18 THREE LANES: AI teaches, code verifies, humans judge
// =====================================================================================================
const LANES: [string, string, string, string][] = [["AI", "Teaches & explains", K.violet, "ai teaches"], ["Code", "Verifies what can be measured", K.signal, "code verifies"], ["Humans", "Judge what needs judgement", K.amber, "humans judge"]];
export const Lanes: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tNo = bs(g, 1), tAward = at(g, 1, "awarded");
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink }}>
      <Mono s={22} c={K.muted} style={{ position: "absolute", left: 120, top: 110, opacity: spr(f, 0) }}>Our rule</Mono>
      {LANES.map(([t, s, c, p], k) => {
        const a = at(g, 0, p);
        const on = spr(f, a - 4, 16, 160);
        return (
          <div key={t} style={{ position: "absolute", left: 120 + k * 570, top: 180, width: 540, height: 640, borderRadius: 26, border: `2px solid ${on > 0.5 ? c : "rgba(255,255,255,0.1)"}`, background: `linear-gradient(180deg, ${c}${on > 0.5 ? "22" : "05"}, transparent)`, padding: 40, opacity: 0.35 + on * 0.65, boxShadow: on > 0.5 ? `0 0 60px ${c}33` : undefined }}>
            <Disp s={130} c={c}>{t}</Disp>
            <Sans s={44} w={650} style={{ marginTop: 26 }}>{s}</Sans>
            <div style={{ position: "absolute", left: 40, right: 40, bottom: 40 }}>
              {k === 1 ? <Mono s={17} c={c}>The only lane that can award a capability</Mono> : k === 0 ? <Mono s={17} c={c}>Never the judge</Mono> : <Mono s={17} c={c}>Incident reports · hazardous practicals</Mono>}
            </div>
          </div>
        );
      })}
      {/* AI tries to award: blocked */}
      {f > tAward - 10 ? (() => {
        const p = ramp(f, tAward - 10, tAward + 6);
        const x = 120 + 270 + p * 340;
        const blocked = f > tAward + 6;
        return (
          <>
            <div style={{ position: "absolute", left: x, top: 470, width: 160, height: 160, marginLeft: -80, borderRadius: "50%", border: `4px solid ${K.violet}`, background: "rgba(139,124,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", transform: blocked ? shake(f, [tAward + 6], 12) : undefined }}>
              <Mono s={18} c={K.text} w={700}>Award?</Mono>
            </div>
            <div style={{ position: "absolute", left: 120 + 540 + 15 - 8, top: 380, width: 16, height: 340, background: K.noise, opacity: blocked ? 1 : 0, boxShadow: `0 0 40px ${K.noise}` }} />
          </>
        );
      })() : null}
      <div style={{ position: "absolute", width: "100%", bottom: 150, textAlign: "center", opacity: ramp(f, tNo, tNo + 8) }}>
        <Disp s={60}>No capability is ever awarded by <span style={{ color: K.noise }}>an AI's opinion.</span></Disp>
      </div>
      <Flash a={tAward + 6} c={K.noise} o={0.3} len={10} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 19 SIGNED RECEIPT + CONSENT
// =====================================================================================================
const RECEIPT: [string, string, string][] = [
  ["Capability", "API debugging · incident response", "signed capability"],
  ["Task version", "codelab/payments · unseen · v3", "task version"],
  ["Submission", "sha256 9f2c 81d0 … a41e", "his submission"],
  ["Checks", "6 / 6 hidden checks passed", "every check"],
  ["Conditions", "sandbox · 4 s limit · no network", "the conditions"],
];
export const Receipt: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tSig = at(g, 0, "the conditions") + 24;
  const tOwn = bs(g, 1), tChoose = at(g, 1, "chooses"), tRev = at(g, 1, "revoke");
  const pIn = spr(f, 0, 16, 140);
  const seal = spr(f, tSig, 10, 260);
  const revoked = f > tRev + 8;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(61,245,200,0.09)" />
      <Dust n={40} o={0.25} />
      <div style={{ position: "absolute", left: 150, top: 140, width: 820, transform: `translateY(${(1 - pIn) * 80}px) rotate(${(1 - pIn) * -3}deg)`, opacity: pIn }}>
        <div style={{ background: K.paper, borderRadius: 18, padding: "40px 46px 50px", boxShadow: "0 40px 100px rgba(0,0,0,0.5)", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Mono s={18} c="rgba(0,0,0,0.6)" w={700}>Capability receipt</Mono>
            <Mono s={16} c="rgba(0,0,0,0.45)">Holder · Aarav (DEMO)</Mono>
          </div>
          <div style={{ height: 2, background: "rgba(0,0,0,0.12)", margin: "20px 0" }} />
          {RECEIPT.map(([k, v, p], q) => {
            const a = at(g, 0, p);
            const o = spr(f, a - 3, 16, 220);
            return (
              <div key={k} style={{ display: "flex", gap: 24, padding: "12px 0", borderBottom: "1px dashed rgba(0,0,0,0.15)", opacity: o, transform: `translateX(${(1 - o) * -30}px)` }}>
                <Mono s={17} c="rgba(0,0,0,0.5)" style={{ width: 210 }}>{k}</Mono>
                <div style={{ fontFamily: F.mono, fontSize: 22, color: q === 3 ? K.signalDeep : K.ink, fontWeight: q === 3 ? 700 : 400 }}>{v}</div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 24, padding: "16px 0 0", opacity: ramp(f, tSig - 6, tSig + 2) }}>
            <Mono s={17} c="rgba(0,0,0,0.5)" style={{ width: 210 }}>Signature</Mono>
            <div style={{ fontFamily: F.mono, fontSize: 22, color: K.ink }}>Ed25519 · 3b7e 0c19 … 5fd2 ✓</div>
          </div>
          <Mono s={13} c="rgba(0,0,0,0.45)" style={{ marginTop: 18, letterSpacing: "0.06em", opacity: ramp(f, tSig, tSig + 10) }}>The signature proves the assessment record. It does not prove identity.</Mono>
          {/* seal */}
          <div style={{ position: "absolute", right: -50, bottom: -70, width: 170, height: 170, borderRadius: "50%", border: `6px solid ${K.signalDeep}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", transform: `rotate(-12deg) scale(${interpolate(seal, [0, 1], [2.6, 1])})`, opacity: seal, background: K.paper, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <Mono s={16} c={K.signalDeep} w={700}>Signed</Mono>
            <Disp s={44} c={K.signalDeep}>6/6</Disp>
            <Mono s={12} c={K.signalDeep}>Server verified</Mono>
          </div>
        </div>
      </div>
      {/* consent phone */}
      <div style={{ position: "absolute", right: 170, top: 150, width: 520, opacity: spr(f, tOwn - 4), transform: `translateY(${(1 - spr(f, tOwn - 4)) * 80}px)` }}>
        <Panel style={{ padding: 32, borderRadius: 40 }}>
          <Mono s={18} c={K.signal}>Aarav's proof · his control</Mono>
          <Disp s={44} style={{ marginTop: 14 }}>Who can see it</Disp>
          {[["Paylane", true], ["Metro Ledger", true], ["KiranaCart", false]].map(([n, on], k) => {
            const tg = on && f > tChoose + k * 6;
            const off = revoked && k === 1;
            const active = tg && !off;
            return (
              <div key={n as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Sans s={30} w={600}>{n} <span style={{ fontSize: 16, color: K.amber, fontFamily: F.mono }}>DEMO</span></Sans>
                <div style={{ width: 82, height: 44, borderRadius: 22, background: active ? K.signal : "rgba(255,255,255,0.15)", position: "relative" }}>
                  <div style={{ position: "absolute", top: 5, left: active ? 43 : 5, width: 34, height: 34, borderRadius: 17, background: "#fff" }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 28, display: "flex", gap: 16, alignItems: "center", opacity: ramp(f, tRev - 6, tRev) }}>
            <div style={{ padding: "12px 22px", borderRadius: 12, border: `2px solid ${K.noise}`, color: K.noise, fontFamily: F.mono, fontSize: 18, fontWeight: 700, transform: `scale(${f > tRev && f < tRev + 6 ? 0.92 : 1})` }}>REVOKE</div>
            <Mono s={17} c={revoked ? K.noise : K.muted}>{revoked ? "Link → 410 Gone" : "Metro Ledger link"}</Mono>
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 20 CONTRAST
// =====================================================================================================
export const Contrast: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const t2 = at(g, 0, "this shows");
  const sw = ramp(f, t2 - 4, t2 + 12, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <div style={{ position: "absolute", left: 120, top: 210, width: 780, opacity: 1 - sw * 0.6, filter: `blur(${sw * 5}px) grayscale(${sw})` }}>
        <Mono s={22} c={K.muted}>The résumé said</Mono>
        <Panel light style={{ marginTop: 20, padding: "40px 44px" }}>
          <Sans s={40} c={K.ink} w={500}>• Strong debugging skills</Sans>
          <Sans s={40} c={K.ink} w={500} style={{ marginTop: 10 }}>• Team player, fast learner</Sans>
          <Sans s={40} c={K.ink} w={500} style={{ marginTop: 10 }}>• Python, JavaScript, SQL</Sans>
        </Panel>
        <Mono s={20} c={K.noise} style={{ marginTop: 20 }}>Unverifiable · AI can write it in 3 seconds</Mono>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 210, width: 800, opacity: sw, transform: `translateX(${(1 - sw) * 120}px) scale(${0.94 + sw * 0.06})` }}>
        <Mono s={22} c={K.signal}>The work showed</Mono>
        <Panel glow={K.signal} style={{ marginTop: 20, padding: "40px 44px" }}>
          <Sans s={40} w={650}>Fixed an incident he had never seen</Sans>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <Chip label="6/6 hidden checks" st="proven" s={20} />
            <Chip label="Signed receipt" st="proven" s={20} />
            <Chip label="Report · human review" st="new" s={20} />
          </div>
        </Panel>
      </div>
      <div style={{ position: "absolute", width: "100%", bottom: 160, textAlign: "center", opacity: ramp(f, t2 + 6, t2 + 16) }}>
        <Disp s={70}>Claims vs. <span style={{ color: K.signal }}>what actually happened.</span></Disp>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 21 EXCHANGE (employer seat, paper)
// =====================================================================================================
const REQROWS: [string, "evidenced" | "review" | "missing" | "pending", string][] = [
  ["programming", "evidenced", "CodeLab work sample"], ["http-apis", "evidenced", "CodeLab work sample"], ["api-debugging", "evidenced", "Unseen repair · 6/6"],
  ["regression-testing", "evidenced", "Hidden regression suite"], ["incident-response", "evidenced", "Unseen incident"], ["incident-report", "review", "With a trainer"],
  ["payments-idempotency", "missing", "Not attempted yet"], ["sql", "pending", "Awaiting validation"],
];
export const Exchange: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tRows = at(g, 0, "she sees"), tShare = bs(g, 1), tOnce = at(g, 1, "prove once");
  const shift = ramp(f, tShare - 4, tShare + 18, 0, 1, INOUT);
  const done = REQROWS.filter((r, k) => r[1] === "evidenced" && f > tRows + k * 4).length;
  const col = { evidenced: K.signalDeep, review: "#B07B00", missing: "rgba(0,0,0,0.4)", pending: "rgba(0,0,0,0.4)" };
  const lab = { evidenced: "Proven", review: "In review", missing: "Missing", pending: "Awaiting validation" };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg light />
      <DotGrid light />
      <div style={{ position: "absolute", left: 100, top: 120, width: 1100, transform: `translateX(${-shift * 60}px) scale(${1 - shift * 0.12})`, transformOrigin: "left top" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Mono s={18} c="rgba(0,0,0,0.55)">Maya's seat · Junior backend engineer</Mono>
          <DemoTag light>Paylane · DEMO</DemoTag>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 18 }}>
          <Disp s={64} c={K.ink}>Candidate 7F3A</Disp>
          <Chip label="Shared with consent" st="proven" s={16} style={{ background: "rgba(15,184,148,0.12)", color: K.signalDeep, borderColor: K.signalDeep }} />
        </div>
        <Panel light style={{ marginTop: 26, padding: "10px 30px" }}>
          {REQROWS.map(([id, st, ev], k) => {
            const o = spr(f, tRows + k * 4 - 6, 16, 220);
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 20, padding: "13px 0", borderBottom: k < 7 ? "1px solid rgba(0,0,0,0.08)" : "none", opacity: o }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: st === "evidenced" ? K.signalDeep : "transparent", border: `2.5px ${st === "evidenced" ? "solid" : "dashed"} ${col[st]}`, color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{st === "evidenced" ? "✓" : ""}</div>
                <Sans s={28} c={K.ink} w={650} style={{ width: 360 }}>{NAME[id]}</Sans>
                <Mono s={16} c={col[st]} w={700} style={{ width: 250 }}>{lab[st]}</Mono>
                <Mono s={15} c="rgba(0,0,0,0.5)">{ev}</Mono>
              </div>
            );
          })}
        </Panel>
      </div>
      {/* coverage ring */}
      <div style={{ position: "absolute", left: 1300, top: 220, opacity: 1 - shift }}>
        <svg width="400" height="400">
          <circle cx="200" cy="200" r="160" stroke="rgba(0,0,0,0.08)" strokeWidth="30" fill="none" />
          <circle cx="200" cy="200" r="160" stroke={K.signalDeep} strokeWidth="30" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 160} strokeDashoffset={2 * Math.PI * 160 * (1 - done / 8)} transform="rotate(-90 200 200)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Disp s={110} c={K.ink}>{done}/8</Disp>
          <Mono s={16} c="rgba(0,0,0,0.55)">Requirements proven</Mono>
        </div>
        <Mono s={16} c="rgba(0,0,0,0.55)" style={{ textAlign: "center", marginTop: 10 }}>No hidden score · every line has evidence</Mono>
      </div>
      {/* proof travels */}
      <AbsoluteFill style={{ opacity: shift }}>
        {[["Paylane", 230], ["KiranaCart", 470], ["Metro Ledger", 710]].map(([n, y], k) => {
          const p = ramp(f, tShare + 10 + k * 10, tShare + 30 + k * 10);
          return (
            <div key={n as string} style={{ position: "absolute", left: 1330, top: y as number, width: 470 }}>
              <Panel light style={{ padding: "22px 28px", border: `2px solid ${p > 0.9 ? K.signalDeep : "rgba(0,0,0,0.1)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Sans s={32} w={700} c={K.ink}>{n}</Sans>
                  <Mono s={13} c="rgba(0,0,0,0.5)">DEMO</Mono>
                </div>
                <Mono s={16} c={p > 0.9 ? K.signalDeep : "rgba(0,0,0,0.4)"} style={{ marginTop: 8 }}>{p > 0.9 ? "✓ Same receipts count here" : "…"}</Mono>
              </Panel>
            </div>
          );
        })}
        {[230, 470, 710].map((y, k) => {
          const p = ramp(f, tShare + 6 + k * 10, tShare + 22 + k * 10, 0, 1, INOUT);
          return <div key={k} style={{ position: "absolute", left: lerp(1150, 1320, p), top: lerp(560, (y as number) + 50, p), width: 26, height: 26, transform: "rotate(45deg)", background: K.signalDeep, opacity: p > 0 && p < 1 ? 1 : 0, boxShadow: `0 0 20px ${K.signal}` }} />;
        })}
        <div style={{ position: "absolute", left: 100, bottom: 140, opacity: ramp(f, tOnce - 4, tOnce + 8) }}>
          <Disp s={80} c={K.ink}>Prove once. <span style={{ color: K.signalDeep }}>Apply everywhere.</span></Disp>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 22 MARKET DELTA
// =====================================================================================================
const PROVEN = [["programming", 480, 620], ["http-apis", 720, 470], ["api-debugging", 960, 620], ["regression-testing", 720, 770], ["incident-response", 1180, 470]] as const;
const DELTA = [["linux", 1300, 760, "linux"], ["containers", 1530, 600, "containers"], ["ci-cd", 1700, 420, "c i c d"]] as const;
export const Delta: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tHit = bs(g, 0) + 6, tReq = at(g, 1, "docker"), tRe = at(g, 2, "recompiles"), tDl = at(g, 2, "the delta");
  const tKeep = bs(g, 3), tPend = at(g, 4, "awaiting");
  const ripple = f - tHit;
  const scan = ramp(f, tRe - 4, tRe + 30);
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: shake(f, [tHit], 24) }}>
      <Bg tint="rgba(255,184,0,0.10)" />
      <DotGrid />
      {/* shockwave */}
      {ripple > 0 && ripple < 50 ? [0, 8, 16].map((d) => {
        const r = Math.max(0, ripple - d) * 60;
        return <div key={d} style={{ position: "absolute", left: 960 - r, top: 540 - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `3px solid ${K.amber}`, opacity: Math.max(0, 1 - (ripple - d) / 30) }} />;
      }) : null}
      {/* alert */}
      <div style={{ position: "absolute", left: 100, top: 110, display: "flex", gap: 20, alignItems: "center", opacity: ramp(f, tHit, tHit + 6) }}>
        <div style={{ padding: "10px 18px", background: K.amber, color: K.ink, fontFamily: F.mono, fontWeight: 700, fontSize: 20, letterSpacing: "0.12em", opacity: f % 16 < 10 ? 1 : 0.6 }}>MARKET UPDATE</div>
        <Sans s={30} w={600} style={{ opacity: ramp(f, tReq - 8, tReq) }}>“…ship the service in <span style={{ color: K.amber }}>Docker containers</span> through a <span style={{ color: K.amber }}>CI/CD pipeline</span>.”</Sans>
      </div>
      {/* edges */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        {[[0, 1], [1, 2], [0, 3], [2, 4], [1, 4]].map(([a, b], k) => <line key={k} x1={PROVEN[a][1]} y1={PROVEN[a][2]} x2={PROVEN[b][1]} y2={PROVEN[b][2]} stroke="rgba(61,245,200,0.4)" strokeWidth={3} />)}
        <Draw d={`M ${DELTA[0][1]} ${DELTA[0][2]} L ${DELTA[1][1]} ${DELTA[1][2]} L ${DELTA[2][1]} ${DELTA[2][2]}`} p={ramp(f, at(g, 2, "linux") + 4, at(g, 2, "linux") + 30)} c={K.amber} w={4} dash={f > tPend} />
        <Draw d={`M ${PROVEN[4][1]} ${PROVEN[4][2]} Q 1400 380 ${DELTA[2][1]} ${DELTA[2][2]}`} p={ramp(f, at(g, 2, "linux") + 10, at(g, 2, "linux") + 36)} c="rgba(255,184,0,0.5)" w={2} dash />
      </svg>
      {PROVEN.map(([id, x, y], k) => {
        const keep = spr(f, tKeep + k * 3, 12, 260);
        return (
          <div key={id} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)" }}>
            <Chip label={NAME[id]} st="proven" s={20} icon="✓" />
            <div style={{ position: "absolute", left: "50%", top: -42, transform: `translateX(-50%) scale(${keep})`, opacity: keep, whiteSpace: "nowrap" }}>
              <Mono s={14} c={K.signal} w={700}>🔒 Still counts</Mono>
            </div>
          </div>
        );
      })}
      {DELTA.map(([id, x, y, p], k) => {
        const a = at(g, 2, p as string);
        const s = spr(f, a, 11, 240);
        const pend = f > tPend + k * 4;
        return (
          <div key={id} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: s }}>
            <Chip label={NAME[id]} st={pend ? "pending" : "new"} s={22} icon="+" />
            {pend ? <Mono s={14} c={K.amber} style={{ position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>Awaiting validation</Mono> : null}
          </div>
        );
      })}
      {/* recompile scan + diff */}
      {scan > 0 && scan < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: scan * 1920, width: 6, background: K.amber, boxShadow: `0 0 40px ${K.amber}` }} /> : null}
      <Panel style={{ position: "absolute", left: 100, top: 250, padding: "22px 28px", width: 420, opacity: ramp(f, tRe, tRe + 10) }}>
        <Mono s={16} c={K.amber}>Recompiled · diff</Mono>
        {["+ linux", "+ containers", "+ ci-cd"].map((t, k) => <div key={t} style={{ fontFamily: F.mono, fontSize: 26, color: K.amber, marginTop: 10, opacity: ramp(f, tDl + k * 6, tDl + 6 + k * 6) }}>{t}</div>)}
        <div style={{ fontFamily: F.mono, fontSize: 26, color: K.signal, marginTop: 10, opacity: ramp(f, tDl + 20, tDl + 26) }}>− nothing he proved</div>
      </Panel>
      <div style={{ position: "absolute", width: "100%", bottom: 140, textAlign: "center", opacity: ramp(f, tPend + 10, tPend + 20) }}>
        <Disp s={58}>It never <span style={{ color: K.amber }}>invents competence.</span></Disp>
        <Mono s={16} style={{ marginTop: 10 }}>InfraLab is planned · until it's validated, these can't be awarded</Mono>
      </div>
      <Flash a={tHit} c={K.amber} o={0.35} len={12} />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 23 NOT AGAIN
// =====================================================================================================
export const NotAgain: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const L: [string, string, string][] = [["The market changed.", "the market", K.muted], ["The pathway changed.", "the pathway", K.muted], ["The learner didn't start again.", "the learner", K.signal]];
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink }}>
      <Bg />
      <div style={{ position: "absolute", left: 140, top: 240 }}>
        {L.map(([t, p, c], k) => {
          const a = at(g, 0, p);
          const q = spr(f, a - 2, 14, 240);
          return <div key={k} style={{ opacity: q, transform: `translateY(${(1 - q) * 50}px)`, marginTop: k === 2 ? 50 : 16 }}><Disp s={k === 2 ? 128 : 100} c={c} style={k === 2 ? { textShadow: `0 0 60px ${K.signal}55` } : undefined}>{t}</Disp></div>;
        })}
      </div>
      <Sweep a={at(g, 0, "the learner")} b={at(g, 0, "the learner") + 26} c="rgba(61,245,200,0.18)" />
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 24 CHAIN: nobody owns the loop
// =====================================================================================================
const LINKS: [string, string, string][] = [["Course platforms", "completions", "course platforms"], ["Job boards", "listings", "job boards"], ["Screening software", "filters", "screening"], ["Staffing agencies", "churn", "staffing"]];
export const Chain: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tBreak = at(g, 2, "nobody owns");
  const brk = ramp(f, tBreak - 6, tBreak + 14, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(255,59,48,0.07)" />
      <DotGrid />
      <div style={{ position: "absolute", width: "100%", top: 130, textAlign: "center", opacity: spr(f, 0) * (1 - ramp(f, bs(g, 1), bs(g, 1) + 10) * 0.5) }}>
        <Disp s={86}>Why doesn't this exist?</Disp>
      </div>
      {LINKS.map(([t, sells, p], k) => {
        const a = at(g, 1, p);
        const q = spr(f, a - 3, 14, 200);
        const x = 130 + k * 420 + (k - 1.5) * brk * 60;
        const y = 420 + (k % 2 ? 30 : -30) * brk + Math.sin(k * 2 + f / 10) * brk * 8;
        return (
          <div key={t} style={{ position: "absolute", left: x, top: y, width: 400, opacity: q, transform: `translateY(${(1 - q) * 60}px) rotate(${brk * (k - 1.5) * 4}deg)` }}>
            <div style={{ height: 190, borderRadius: 95, border: `12px solid ${brk > 0.5 ? K.noise : "rgba(244,243,238,0.85)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,6,10,0.6)" }}>
              <Sans s={32} w={700}>{t}</Sans>
              <Mono s={18} c={K.amber} style={{ marginTop: 8 }}>sells {sells}</Mono>
            </div>
          </div>
        );
      })}
      <Mono s={17} c={K.muted} style={{ position: "absolute", left: 1390, top: 660, opacity: ramp(f, at(g, 1, "staffing") + 8, at(g, 1, "staffing") + 16), width: 400 }}>US staffing average: 4.75 hires per seat per year</Mono>
      {/* the unowned loop */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: brk }}>
        <ellipse cx="960" cy="560" rx="880" ry="230" fill="none" stroke={K.noise} strokeWidth={3} strokeDasharray="14 18" transform={`rotate(${f * 0.03} 960 560)`} />
      </svg>
      <div style={{ position: "absolute", width: "100%", bottom: 150, textAlign: "center", opacity: brk }}>
        <Disp s={74}>Each optimises its link. <span style={{ color: K.noise }}>Nobody owns the loop.</span></Disp>
      </div>
      <Src style={{ opacity: ramp(f, at(g, 1, "staffing") + 8, at(g, 1, "staffing") + 16) * (1 - brk) }}>Industry staffing benchmarks (Wonderkind 2026)</Src>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 25 VERSUS
// =====================================================================================================
export const Versus: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tR = at(g, 0, "capable generates");
  const L = ["Self-reported skills", "AI-scored videos", "Static badges", "Start over when jobs change"];
  const R = ["Compiled from real demand", "Unseen work, graded by code", "Signed, revocable receipts", "Only the delta changes"];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <div style={{ position: "absolute", left: 120, top: 150, width: 780 }}>
        <Mono s={20} c={K.muted}>Everyone else</Mono>
        <Disp s={74} c={K.muted} style={{ marginTop: 12 }}>Verifies what people claim.</Disp>
        {L.map((t, k) => <div key={t} style={{ marginTop: 24, opacity: spr(f, bs(g, 0) + 6 + k * 4) }}><Sans s={34} w={500} c={K.muted}>✕ {t}</Sans></div>)}
      </div>
      <div style={{ position: "absolute", left: 960, top: 120, bottom: 160, width: 2, background: "rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", left: 1020, top: 150, width: 800, opacity: ramp(f, tR - 6, tR + 6), transform: `translateX(${(1 - ramp(f, tR - 6, tR + 10)) * 60}px)` }}>
        <Mono s={20} c={K.signal}>CAPABLE</Mono>
        <Disp s={74} style={{ marginTop: 12 }}>Generates the work. <span style={{ color: K.signal }}>Lets it speak.</span></Disp>
        {R.map((t, k) => <div key={t} style={{ marginTop: 24, opacity: spr(f, tR + 6 + k * 4) }}><Sans s={34} w={600}><span style={{ color: K.signal }}>✓</span> {t}</Sans></div>)}
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 26 WHY NOW
// =====================================================================================================
export const WhyNow: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tFake = at(g, 0, "ai made faking"), tGen = at(g, 0, "it also"), tBroke = at(g, 0, "the technology"), tJudge = at(g, 0, "never the judge");
  const c1 = ramp(f, tFake, tFake + 40, 0, 1, INOUT), c2 = ramp(f, tGen, tGen + 40, 0, 1, INOUT);
  const out = ramp(f, tBroke - 4, tBroke + 14);
  const X0 = 200, X1 = 1300, Y0 = 260, Y1 = 760;
  const curve = (drop: number) => `M ${X0} ${Y0 + 20} C ${X0 + 400} ${Y0 + 30}, ${X0 + 600} ${Y1 - drop}, ${X1} ${Y1 - 10}`;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(139,124,255,0.09)" />
      <Mono s={22} c={K.violet} style={{ position: "absolute", left: 120, top: 120 }}>Why now</Mono>
      <AbsoluteFill style={{ opacity: 1 - out * 0.85, filter: `blur(${out * 6}px)` }}>
        <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
          <line x1={X0} y1={Y1} x2={X1 + 40} y2={Y1} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
          <line x1={X0} y1={Y0 - 20} x2={X0} y2={Y1} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
          <Draw d={curve(40)} p={c1} c={K.noise} w={6} glow len={1600} />
          <Draw d={`M ${X0} ${Y0 + 120} C ${X0 + 500} ${Y0 + 140}, ${X0 + 700} ${Y1 - 160}, ${X1} ${Y1 - 140}`} p={c2} c={K.signal} w={6} glow len={1600} />
        </svg>
        <Mono s={18} style={{ position: "absolute", left: X0, top: Y1 + 16 }}>2022</Mono>
        <Mono s={18} style={{ position: "absolute", left: X1 - 40, top: Y1 + 16 }}>2026</Mono>
        <div style={{ position: "absolute", left: X1 + 60, top: Y1 - 60, opacity: c1 }}><Mono s={20} c={K.noise} w={700}>Cost to fake a signal → ~0</Mono></div>
        <div style={{ position: "absolute", left: X1 + 60, top: Y1 - 190, opacity: c2 }}><Mono s={20} c={K.signal} w={700}>Cost to compile demand &amp; generate real work ↓</Mono></div>
      </AbsoluteFill>
      <Center style={{ opacity: out }}>
        <Disp s={84} style={{ textAlign: "center" }}>The technology that broke the signal</Disp>
        <Disp s={84} c={K.signal} style={{ textAlign: "center", marginTop: 10 }}>can rebuild it.</Disp>
        <div style={{ marginTop: 50, opacity: ramp(f, tJudge - 6, tJudge + 6), display: "flex", gap: 18, alignItems: "center" }}>
          <Chip label="As long as it's never the judge" st="new" s={28} />
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 27 DOMAINS: same graph for every kind of work
// =====================================================================================================
const TILES: [string, string, string, string][] = [["codelab.png", "CodeLab", "Software engineers", "this isn't"], ["datalab.png", "DataLab", "Data analysts", "data analysts"], ["solar.png", "Solar Forge · FLUX", "Solar technicians", "solar technicians"], ["arena.png", "Practical Arena", "Electricians", "electricians"]];
export const Domains: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tOff = at(g, 0, "built offline-first");
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <GridFloor opacity={0.2} />
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Mono s={20} c={K.signal}>Real labs · running today</Mono>
        <Disp s={70} style={{ marginTop: 10 }}>Not only software.</Disp>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", justifyContent: "center", gap: 30, perspective: 1800 }}>
        {TILES.map(([img, lab, who, p], k) => {
          const a = at(g, 0, p);
          const q = spr(f, a - 4, 15, 160);
          return (
            <div key={img} style={{ width: 410, opacity: q, transform: `translateY(${(1 - q) * 120}px) rotateY(${(k - 1.5) * -8 + Math.sin(f / 40) * 2}deg)` }}>
              <div style={{ height: 290, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
                <Img src={staticFile(`capx/img/${img}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.08 - q * 0.08})` }} />
              </div>
              <Mono s={16} c={K.signal} style={{ marginTop: 16 }}>{lab}</Mono>
              <Sans s={34} w={700} style={{ marginTop: 4 }}>{who}</Sans>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", width: "100%", bottom: 140, display: "flex", justifyContent: "center", gap: 20, opacity: ramp(f, tOff - 6, tOff + 6) }}>
        <Chip label="One graph" st="proven" s={22} />
        <Chip label="One receipt format" st="proven" s={22} />
        <Chip label="Offline-first · basic phone" st="gap" s={22} />
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 28 RAIL: infrastructure for every stakeholder
// =====================================================================================================
const STATIONS: [string, string, string][] = [["Enterprises", "Auditable, name-blind verification", "auditable"], ["Small businesses", "Hiring in a box · no HR needed", "hiring in"], ["Frontline workers", "Voice-first proof, own language", "voice-first"], ["Colleges & ITIs", "Curricula synced to live demand", "and curricula"]];
export const Rail: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tInf = at(g, 0, "infrastructure");
  const line = ramp(f, tInf - 4, at(g, 0, "next") + 10, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <div style={{ position: "absolute", width: "100%", top: 130, textAlign: "center", opacity: ramp(f, tInf - 6, tInf + 4) }}>
        <Mono s={20} c={K.muted}>That makes CAPABLE</Mono>
        <Disp s={110} c={K.signal} style={{ marginTop: 10, textShadow: `0 0 60px ${K.signal}44` }}>Infrastructure.</Disp>
      </div>
      <div style={{ position: "absolute", left: 150, right: 150, top: 560, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${line * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${K.signal}, ${K.blue})`, boxShadow: `0 0 30px ${K.signal}` }} />
        {/* train pulses */}
        {Array.from({ length: 5 }).map((_, k) => <div key={k} style={{ position: "absolute", top: -4, left: `${((f * 0.6 + k * 20) % 100) * line}%`, width: 40, height: 16, borderRadius: 8, background: "#fff", opacity: line > 0.9 ? 0.7 : 0, boxShadow: `0 0 20px ${K.signal}` }} />)}
      </div>
      <Mono s={18} c={K.amber} style={{ position: "absolute", left: 150, top: 500, opacity: ramp(f, at(g, 0, "next") - 4, at(g, 0, "next") + 6) }}>Next on the rail</Mono>
      {STATIONS.map(([t, s, p], k) => {
        const a = at(g, 0, p);
        const q = spr(f, a - 4, 15, 200);
        const x = 150 + 180 + k * 440;
        return (
          <div key={t} style={{ position: "absolute", left: x, top: 564, transform: "translate(-50%,-50%)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: q > 0.5 ? K.signal : K.ink, border: `4px solid ${K.signal}`, boxShadow: q > 0.5 ? `0 0 30px ${K.signal}` : undefined, opacity: line > k / 4 ? 1 : 0.2 }} />
            <div style={{ position: "absolute", top: 70, left: "50%", transform: `translateX(-50%) translateY(${(1 - q) * 30}px)`, width: 380, textAlign: "center", opacity: q }}>
              <Disp s={44}>{t}</Disp>
              <Sans s={26} c={K.muted} w={500} style={{ marginTop: 10 }}>{s}</Sans>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 29 MEET: both questions arrive too late -> asked first
// =====================================================================================================
export const Meet: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const tLate = at(g, 2, "both questions"), tFirst = at(g, 2, "capable asks");
  const join = ramp(f, tFirst - 2, tFirst + 26, 0, 1, INOUT);
  const arc = ramp(f, tFirst + 8, tFirst + 30, 0, 1, INOUT);
  const lx = 330 + join * 220, rx = 1310 - join * 220;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 960 + join * 0, height: 1080, overflow: "hidden" }}><Bg /></div>
      <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, overflow: "hidden", opacity: 1 - join }}><Bg light /></div>
      <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, opacity: join }}><Bg /></div>
      <div style={{ position: "absolute", left: lx, top: 360 }}><Person s={260} ring={K.signal} /></div>
      <div style={{ position: "absolute", left: rx, top: 360 }}><Person s={260} c="#2A2418" ring={K.amber} /></div>
      {/* f1, f2 */}
      <div style={{ position: "absolute", left: 90, top: 140, width: 800, opacity: spr(f, bs(g, 0)) * (1 - join) }}>
        <Mono s={20} c={K.signal}>Aarav, today</Mono>
        <Sans s={42} w={650} style={{ marginTop: 10 }}>Years of credentials. <span style={{ color: K.muted }}>Then: do they matter?</span></Sans>
      </div>
      <div style={{ position: "absolute", left: 1050, top: 140, width: 800, opacity: spr(f, bs(g, 1)) * (1 - join) }}>
        <Mono s={20} c="#B07B00">Maya, today</Mono>
        <Sans s={42} w={650} c={K.ink} style={{ marginTop: 10 }}>Months of filtering. <span style={{ color: "rgba(0,0,0,0.5)" }}>Still: can they do it?</span></Sans>
      </div>
      <div style={{ position: "absolute", width: "100%", top: 720, textAlign: "center", opacity: ramp(f, tLate - 4, tLate + 6) * (1 - join) }}>
        <div style={{ display: "inline-block", background: "#000", padding: "14px 36px" }}><Disp s={84} c={K.noise}>Both questions arrive too late.</Disp></div>
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <Draw d={`M ${lx + 260} 490 C ${lx + 420} 330, ${rx - 160} 330, ${rx} 490`} p={arc} c={K.signal} w={6} glow />
      </svg>
      {arc > 0.05 ? <div style={{ position: "absolute", left: lerp(lx + 260, rx, arc) - 14, top: 380 - Math.sin(arc * Math.PI) * 40, width: 28, height: 28, transform: "rotate(45deg)", background: K.signal, boxShadow: `0 0 30px ${K.signal}` }} /> : null}
      <div style={{ position: "absolute", width: "100%", top: 730, textAlign: "center", opacity: ramp(f, tFirst + 4, tFirst + 16) }}>
        <Mono s={22} c={K.signal}>Matched on evidence</Mono>
        <Disp s={96} style={{ marginTop: 12 }}>CAPABLE asks them <span style={{ color: K.signal }}>first.</span></Disp>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 30 MANTRA
// =====================================================================================================
const MANTRA: [string, string][] = [["The job description", "becomes the curriculum."], ["The work", "becomes the proof."], ["The proof", "becomes opportunity."], ["And when the world changes,", "the pathway changes with it."]];
export const Mantra: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink }}>
      <Bg />
      <div style={{ position: "absolute", right: -260, top: 40, opacity: 0.16, transform: `rotate(${f * 0.3}deg)` }}>
        <svg width="1000" height="1000"><circle cx="500" cy="500" r="440" fill="none" stroke={K.signal} strokeWidth="3" strokeDasharray="20 16" /><circle cx="500" cy="500" r="360" fill="none" stroke={K.signal} strokeWidth="2" /></svg>
      </div>
      <div style={{ position: "absolute", left: 130, top: 170 }}>
        {MANTRA.map(([a, b], k) => {
          const t0 = bs(g, k) + 2;
          const q = spr(f, t0, 15, 220);
          const tb = at(g, k, b.split(" ")[0] + " " + b.split(" ")[1]);
          const qb = spr(f, tb - 2, 15, 220);
          const past = k < 3 && f > bs(g, k + 1) ? 1 : 0;
          return (
            <div key={k} style={{ marginTop: k === 3 ? 56 : 22, opacity: q * (past ? 0.4 : 1), transform: `translateY(${(1 - q) * 40}px)` }}>
              <Disp s={k === 3 ? 76 : 76}>
                {a} <span style={{ color: k === 3 ? K.amber : K.signal, opacity: qb }}>{b}</span>
              </Disp>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// 31 END
// =====================================================================================================
export const End: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const p = ramp(f, bs(g, 0), bs(g, 0) + 36);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: K.ink }}>
      <Bg tint={`rgba(61,245,200,${0.06 + p * 0.1})`} />
      <Center style={{ top: -40 }}>
        <Logo p={p} s={210} />
        <div style={{ marginTop: 60, opacity: ramp(f, bs(g, 0) + 30, bs(g, 0) + 46) }}>
          <Wave w={900} h={90} noise={0} amp={0.6} phase={f * 0.2} stroke={3} />
        </div>
      </Center>
      <div style={{ position: "absolute", width: "100%", bottom: 70, textAlign: "center", opacity: ramp(f, bs(g, 0) + 40, bs(g, 0) + 60) }}>
        <Mono s={15} c={K.dim}>Aarav, Maya and every organization shown are fictional (DEMO). Statistics cite their sources on screen.</Mono>
      </div>
    </AbsoluteFill>
  );
};
