import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, random, staticFile, useCurrentFrame } from "remotion";
import { interpolate } from "../safe-interpolate";
import { K, F, CL, INOUT, G, at, bs, spr, ramp, lerp, shake, Mono, Disp, Sans, Bg, GridFloor, DotGrid, Flash, Glitch, Panel, Chip, Dust, Mark } from "./kit";

// window helper: 0 → 1 → 0 across [a, b]
const win = (f: number, a: number, b: number, fade = 10) => Math.min(ramp(f, a - fade, a + fade * 0.4), 1 - ramp(f, b - fade, b + 2));
const Rise: React.FC<{ f: number; t: number; s: number; c?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ f, t, s, c = K.text, children, style }) => (
  <div style={{ overflow: "hidden", paddingBottom: s * 0.12, ...style }}><Disp s={s} c={c} style={{ transform: `translateY(${(1 - spr(f, t, 14, 230)) * s * 1.15}px)` }}>{children}</Disp></div>
);

/** The AI assistant: a violet orb with tilted rings. */
const Orb: React.FC<{ f: number; s?: number; c?: string; calm?: boolean }> = ({ f, s = 240, c = K.violet, calm }) => (
  <div style={{ position: "relative", width: s, height: s }}>
    {[0, 1, 2].map((k) => (
      <div key={k} style={{ position: "absolute", inset: -k * s * 0.16, borderRadius: "50%", border: `2px solid ${c}`, opacity: 0.55 - k * 0.15, transform: `rotateX(70deg) rotate(${f * (calm ? 0.6 : 1.3 + k * 0.7)}deg)` }} />
    ))}
    <div style={{ position: "absolute", inset: s * 0.22, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #d9d2ff, ${c} 55%, #2b2270)`, boxShadow: `0 0 ${s * 0.35}px ${c}, 0 0 ${s * 0.7}px ${c}77`, transform: `scale(${1 + Math.sin(f / 7) * 0.04})` }} />
  </div>
);

/** Hazard stripes band. */
const Hazard: React.FC<{ w: number; h: number; f: number }> = ({ w, h, f }) => (
  <div style={{ width: w, height: h, backgroundImage: `repeating-linear-gradient(-45deg, ${K.amber} 0 18px, #111 18px 36px)`, backgroundPosition: `${f * 2}px 0`, borderRadius: 6 }} />
);

/** Simplified lighting-circuit schematic as seen through a phone camera. */
const Board: React.FC<{ f: number; scan: number; hot?: "switch" | "lamp" | null; bad?: number }> = ({ f, scan, hot, bad = 0 }) => {
  const sw = hot === "switch", lp = hot === "lamp";
  return (
    <svg width="380" height="520" viewBox="0 0 380 520">
      <rect x="20" y="20" width="340" height="480" rx="18" fill="#1A1E28" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <path d="M70 90 H310 M310 90 V250 M310 250 H190 M190 250 V400 M190 400 H70 M70 400 V90" fill="none" stroke="#C99A3B" strokeWidth="5" opacity="0.8" />
      {/* fuse */}
      <rect x="120" y="72" width="80" height="36" rx="8" fill="#2A2F3C" stroke="#d9d6ca" strokeWidth="2" />
      <text x="160" y="96" fontFamily="monospace" fontSize="15" fill="#d9d6ca" textAnchor="middle">FUSE</text>
      {/* switch */}
      <rect x="275" y="150" width="70" height="70" rx="10" fill="#2A2F3C" stroke={sw ? K.violet : "#d9d6ca"} strokeWidth={sw ? 5 : 2} style={sw ? { filter: `drop-shadow(0 0 12px ${K.violet})` } : undefined} />
      <rect x="296" y="164" width="28" height="42" rx="5" fill="#d9d6ca" opacity="0.8" />
      <path d="M302 172 L318 196" stroke="#1A1E28" strokeWidth="2" opacity={sw ? 0.9 : 0} />
      {/* lamp */}
      <circle cx="190" cy="330" r="42" fill="#2A2F3C" stroke={lp ? K.noise : "#d9d6ca"} strokeWidth={lp ? 5 : 2} style={lp ? { filter: `drop-shadow(0 0 14px ${K.noise})` } : undefined} />
      <path d="M162 302 L218 358 M218 302 L162 358" stroke={lp ? K.noise : "#d9d6ca"} strokeWidth="3" opacity="0.8" />
      {/* neutral joint */}
      <circle cx="70" cy="250" r="12" fill="#2A2F3C" stroke="#d9d6ca" strokeWidth="2" />
      <text x="190" y="470" fontFamily="monospace" fontSize="14" fill="rgba(217,214,202,0.6)" textAnchor="middle">LIGHTING CIRCUIT · DEAD</text>
      {/* scan line */}
      <rect x="20" y={20 + scan * 470} width="340" height="3" fill={K.violet} opacity={0.8 * (1 - bad)} style={{ filter: `drop-shadow(0 0 8px ${K.violet})` }} />
      <rect x="20" y="20" width="340" height="480" rx="18" fill="none" stroke={K.violet} strokeWidth="2" strokeDasharray="30 420" strokeDashoffset={-f * 6} opacity={0.6 * (1 - bad)} />
    </svg>
  );
};

const FIELDS = ["⚡ Electrician", "</> Developer", "▤ Analyst", "✚ Nurse", "⚙ Mechanic", "☀ Solar tech", "☎ Support", "✎ Designer"];

// =====================================================================================================
// THE AI GAP: every field runs on AI; nobody is trained to work with it
// =====================================================================================================
export const AiGap: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const b1 = bs(g, 1), b2 = bs(g, 2), b3 = bs(g, 3);
  // phase A
  const tEvery = at(g, 0, "every field"), tNobody = at(g, 0, "almost nobody");
  const A = win(f, 0, b1 + 6, 12);
  // phase B
  const tPoint = at(g, 1, "points"), t91 = at(g, 1, "ninety-one"), tSays = at(g, 1, "replace the"), tWrong = at(g, 1, "it's wrong"), tSkip = at(g, 1, "skips");
  const B = win(f, b1, b2 + 6, 12);
  // phase C
  const tCop = at(g, 2, "copilot"), tPass = at(g, 2, "passes every"), tBreak = at(g, 2, "quietly");
  const C = win(f, b2, b3 + 6, 12);
  // phase D
  const tVibe = at(g, 3, "vibe-coding"), tProd = at(g, 3, "production"), tJudge = at(g, 3, "judgement"), tWant = at(g, 3, "employers"), tNo = at(g, 3, "nobody proves");
  const D = ramp(f, b3 - 6, b3 + 8);
  const sh = shake(f, [tWrong, tBreak, tNo], 16);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(139,124,255,0.14)" tint2="rgba(255,59,48,0.05)" />
      <DotGrid />
      <AbsoluteFill style={{ transform: sh }}>

        {/* ---------------- A: every field runs on AI ---------------- */}
        <AbsoluteFill style={{ opacity: A }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 112, textAlign: "center" }}>
            <Mono s={22} c={K.violet} style={{ opacity: spr(f, 2) }}>The skill nobody teaches</Mono>
          </div>
          <div style={{ position: "absolute", left: 960 - 130, top: 330, transform: `scale(${0.6 + spr(f, 4, 12, 120) * 0.4})` }}><Orb f={f} s={260} /></div>
          {FIELDS.map((t, k) => {
            const p = spr(f, tEvery + k * 3, 13, 180);
            const ang = (k / FIELDS.length) * Math.PI * 2 + f / 140;
            const rx = 560, ry = 250;
            const x = 960 + Math.cos(ang) * rx * p, y = 460 + Math.sin(ang) * ry * p;
            const dim = ramp(f, tNobody + k * 2, tNobody + k * 2 + 10);
            return (
              <div key={t} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${p})`, opacity: p }}>
                <div style={{ position: "relative" }}>
                  <Chip label={t} st="idle" s={22} style={{ borderColor: dim > 0.5 ? "rgba(255,59,48,0.7)" : "rgba(139,124,255,0.8)", boxShadow: `0 0 30px ${dim > 0.5 ? K.noise : K.violet}33` }} />
                  <div style={{ position: "absolute", right: -8, top: -8, width: 20, height: 20, borderRadius: 10, background: K.noise, transform: `scale(${dim})`, boxShadow: `0 0 16px ${K.noise}` }} />
                </div>
              </div>
            );
          })}
          <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
            {FIELDS.map((_, k) => {
              const p = spr(f, tEvery + k * 3, 13, 180);
              const ang = (k / FIELDS.length) * Math.PI * 2 + f / 140;
              const x = 960 + Math.cos(ang) * 560 * p, y = 460 + Math.sin(ang) * 250 * p;
              const cut = ramp(f, tNobody + k * 2, tNobody + k * 2 + 10);
              return <line key={k} x1={960} y1={460} x2={lerp(x, 960, 0.25 * cut) } y2={lerp(y, 460, 0.25 * cut)} stroke={cut > 0.5 ? K.noise : K.violet} strokeWidth={2} strokeDasharray={cut > 0.5 ? "6 10" : undefined} opacity={0.35 * p} />;
            })}
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 770, textAlign: "center" }}>
            <div style={{ opacity: ramp(f, tEvery - 4, tEvery + 8) * (1 - ramp(f, tNobody - 6, tNobody)) }}><Disp s={84}>Every field runs on AI now.</Disp></div>
            <div style={{ marginTop: -84, opacity: ramp(f, tNobody - 3, tNobody + 6) }}>
              <Disp s={84}>Almost nobody is <span style={{ color: K.noise }}>trained</span> to work with it.</Disp>
            </div>
          </div>
        </AbsoluteFill>

        {/* ---------------- B: the electrician and the confident app ---------------- */}
        <AbsoluteFill style={{ opacity: B }}>
          <div style={{ position: "absolute", left: 180, top: 150, width: 440, height: 800, borderRadius: 54, background: "#07080C", border: "3px solid rgba(255,255,255,0.18)", boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${K.violet}33`, overflow: "hidden", transform: `perspective(1400px) rotateY(${(1 - spr(f, b1 + 2, 14, 140)) * -40 + 8}deg) translateY(${(1 - spr(f, b1 + 2, 14, 140)) * 200}px)` }}>
            <div style={{ position: "absolute", left: 30, top: 28 }}><Mono s={14} c={K.violet}>● AI Fix-it · camera</Mono></div>
            <div style={{ position: "absolute", left: 30, top: 70 }}>
              <Board f={f} scan={(f % 70) / 70} hot={f > tWrong ? "lamp" : f > tSays - 6 ? "switch" : null} bad={ramp(f, tWrong - 2, tWrong + 4)} />
            </div>
            <div style={{ position: "absolute", left: 22, right: 22, bottom: 26, padding: 20, borderRadius: 22, background: "rgba(139,124,255,0.16)", border: `2px solid ${K.violet}`, opacity: spr(f, tPoint + 10), transform: `translateY(${(1 - spr(f, tPoint + 10)) * 60}px)` }}>
              <Mono s={13} c={K.violet}>Assistant</Mono>
              <Sans s={24} w={700} style={{ marginTop: 6 }}>Switch looks cracked.</Sans>
              <Sans s={24} w={700} c={K.violet} style={{ opacity: ramp(f, tSays - 4, tSays + 4) }}>→ Replace the switch.</Sans>
              <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)" }}>
                <div style={{ width: `${interpolate(f, [t91 - 6, t91 + 16], [0, 91], CL)}%`, height: "100%", borderRadius: 5, background: K.violet, boxShadow: `0 0 12px ${K.violet}` }} />
              </div>
              <Mono s={13} c={K.text} style={{ marginTop: 6 }}>Confidence {Math.round(interpolate(f, [t91 - 6, t91 + 16], [0, 91], CL))}%</Mono>
            </div>
            {/* WRONG stamp */}
            <div style={{ position: "absolute", left: 40, top: 300, padding: "10px 26px", border: `6px solid ${K.noise}`, borderRadius: 14, color: K.noise, fontFamily: F.display, fontWeight: 900, fontSize: 92, letterSpacing: "-0.03em", transform: `rotate(-14deg) scale(${interpolate(spr(f, tWrong - 1, 9, 260), [0, 1], [2.4, 1])})`, opacity: ramp(f, tWrong - 1, tWrong + 2), boxShadow: `0 0 40px ${K.noise}66`, background: "rgba(5,6,10,0.6)" }}>WRONG</div>
          </div>
          <Flash a={tWrong} c={K.noise} o={0.25} />
          <div style={{ position: "absolute", left: 720, top: 170, width: 1100 }}>
            <Mono s={22} c={K.amber} style={{ opacity: spr(f, b1 + 4) }}>Call-out · electrician · 7:40 am</Mono>
            <div style={{ marginTop: 18, opacity: ramp(f, t91 - 4, t91 + 6) }}>
              <Disp s={150} c={K.violet}>{Math.round(interpolate(f, [t91 - 6, t91 + 16], [0, 91], CL))}% sure.</Disp>
            </div>
            <div style={{ marginTop: 18, opacity: ramp(f, tWrong - 2, tWrong + 4) }}>
              <Disp s={110} c={K.noise}>Wrong part.</Disp>
              <Sans s={32} c={K.muted} w={500} style={{ marginTop: 14 }}>The fault was the lamp. The switch was fine.</Sans>
            </div>
            <div style={{ marginTop: 40, opacity: ramp(f, tSkip - 6, tSkip + 4) }}>
              <Mono s={18} c={K.muted}>Its plan</Mono>
              {["1. Lock off the breaker", "2. Skip the dead test", "3. Replace the switch"].map((t, k) => {
                const danger = k === 1;
                const p = spr(f, tSkip - 6 + k * 4);
                return (
                  <div key={t} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
                    <div style={{ padding: "12px 20px", borderRadius: 12, border: `2px solid ${danger ? K.noise : "rgba(255,255,255,0.2)"}`, background: danger ? "rgba(255,59,48,0.14)" : "rgba(255,255,255,0.04)", transform: danger ? `translateX(${Math.sin(f * 1.3) * 3 * ramp(f, tSkip, tSkip + 4)}px)` : undefined }}>
                      <Sans s={34} w={700} c={danger ? K.noise : K.text}>{t}</Sans>
                    </div>
                    {danger && <div style={{ display: "flex", alignItems: "center", gap: 14 }}><Hazard w={120} h={26} f={f} /><Mono s={18} c={K.amber}>Live circuit</Mono></div>}
                  </div>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>

        {/* ---------------- C: the copilot patch that passes and breaks ---------------- */}
        <AbsoluteFill style={{ opacity: C }}>
          <div style={{ position: "absolute", left: 120, top: 140 }}>
            <Mono s={22} c={K.blue} style={{ opacity: spr(f, b2 + 2) }}>Aarav · production incident · copilot</Mono>
          </div>
          <Panel style={{ position: "absolute", left: 120, top: 200, width: 1000, padding: 0, overflow: "hidden", opacity: spr(f, b2 + 4), transform: `translateY(${(1 - spr(f, b2 + 4)) * 80}px)` }} glow={f > tBreak ? K.noise : K.violet}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <Mono s={16} c={K.text} w={700}>payments.js</Mono>
              <Mono s={15} c={K.violet} style={{ marginLeft: "auto" }}>Copilot · suggested fix</Mono>
            </div>
            <div style={{ padding: "18px 24px", fontFamily: F.mono, fontSize: 24, lineHeight: 1.65, background: "rgba(0,0,0,0.35)" }}>
              {[[" ", "function handleWebhook(event, db) {"], ["+", "  if (db.processed.has(event.orderId))"], ["+", "    return { status: 200, body: 'duplicate' }"], [" ", "  if (event.type === 'payment.captured') {"], [" ", "    credit(event)"], ["+", "  db.processed.add(event.orderId)"]].map(([op, t], k) => {
                const p = ramp(f, tCop + k * 4, tCop + k * 4 + 6);
                const hit = f > tBreak && t.includes("orderId");
                return <div key={k} style={{ whiteSpace: "pre", opacity: p, color: hit ? K.noise : op === "+" ? "#7ee2a8" : "rgba(244,243,238,0.8)", background: hit ? "rgba(255,59,48,0.14)" : op === "+" ? "rgba(46,160,67,0.12)" : undefined }}>{op} {t}</div>;
              })}
            </div>
          </Panel>
          {/* visible tests: pass */}
          <div style={{ position: "absolute", left: 1180, top: 210, width: 640, opacity: ramp(f, tPass - 4, tPass + 6) }}>
            <Mono s={20} c={K.muted}>Tests he can see</Mono>
            <Glitch on={interpolate(f, [tBreak, tBreak + 3, tBreak + 20], [0, 1, 0.25], CL)} s={170} c={f > tBreak + 3 ? K.noise : K.signal}>2/2 ✓</Glitch>
            <Sans s={30} c={K.signal} w={700} style={{ marginTop: 6 }}>“Safe to merge.”</Sans>
          </div>
          {/* the refund that vanishes */}
          <div style={{ position: "absolute", left: 120, top: 640, width: 1700, opacity: ramp(f, tBreak - 4, tBreak + 6), transform: `translateY(${(1 - spr(f, tBreak - 4)) * 60}px)` }}>
            <Mono s={20} c={K.noise}>Production · 14 minutes later</Mono>
            <div style={{ marginTop: 14, display: "flex", gap: 24, alignItems: "center" }}>
              <Panel style={{ padding: "22px 30px", fontFamily: F.mono, fontSize: 26, color: K.text }}>refund.requested · ORD-7069 · ₹200</Panel>
              <Disp s={64} c={K.muted}>→</Disp>
              <Panel style={{ padding: "22px 30px", fontFamily: F.mono, fontSize: 26, color: K.noise, borderColor: K.noise }} glow={K.noise}>200 “duplicate” · never refunded</Panel>
            </div>
            <Disp s={80} c={K.noise} style={{ marginTop: 34, opacity: ramp(f, tBreak + 10, tBreak + 20) }}>Quietly breaks refunds.</Disp>
          </div>
        </AbsoluteFill>

        {/* ---------------- D: vibe-coding vs production ---------------- */}
        <AbsoluteFill style={{ opacity: D }}>
          {/* left: the demo */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 960, height: 1080, background: "linear-gradient(160deg, rgba(255,184,0,0.10), rgba(139,124,255,0.10))", clipPath: `inset(0 ${(1 - spr(f, tVibe - 6, 14, 160)) * 100}% 0 0)` }}>
            <div style={{ position: "absolute", left: 110, top: 150 }}>
              <Mono s={22} c={K.amber}>Vibe-coding</Mono>
              <Disp s={92} style={{ marginTop: 10 }}>A demo.</Disp>
              <Sans s={30} c={K.muted} w={500} style={{ marginTop: 8 }}>Built in an afternoon.</Sans>
            </div>
            {/* blocks snapping together */}
            {Array.from({ length: 12 }).map((_, k) => {
              const p = spr(f, tVibe + k * 2, 12, 260);
              const col = k % 4, row = Math.floor(k / 4);
              const c = [K.amber, K.violet, K.signal, K.blue][k % 4];
              return <div key={k} style={{ position: "absolute", left: 140 + col * 175, top: 520 + row * 120, width: 160, height: 104, borderRadius: 16, background: `${c}30`, border: `2px solid ${c}`, opacity: p, transform: `translate(${(1 - p) * (random(`vx${k}`) - 0.5) * 900}px, ${(1 - p) * -500}px) rotate(${(1 - p) * 90}deg)` }} />;
            })}
            <div style={{ position: "absolute", left: 600, top: 470, opacity: ramp(f, tVibe + 30, tVibe + 40) }}><Mono s={40} c={K.amber}>✦ ✦</Mono></div>
          </div>
          {/* right: production */}
          <div style={{ position: "absolute", left: 960, top: 0, width: 960, height: 1080, background: "#06070B", clipPath: `inset(0 0 0 ${(1 - spr(f, tProd - 6, 14, 160)) * 100}%)` }}>
            <div style={{ position: "absolute", left: 90, top: 150 }}>
              <Mono s={22} c={K.signal}>Production</Mono>
              <Disp s={92} style={{ marginTop: 10 }}>Needs <span style={{ color: K.signal }}>judgement.</span></Disp>
              <Sans s={30} c={K.muted} w={500} style={{ marginTop: 8, opacity: ramp(f, tJudge, tJudge + 8) }}>Real money. Real wires. Real people.</Sans>
            </div>
            {["03:07  payments.failed  ↑ 412%", "03:07  refunds pending  ₹1.8L", "03:08  PAGE · on-call engineer", "07:40  site · lighting circuit dead"].map((t, k) => {
              const p = spr(f, tProd + 4 + k * 5);
              const pulse = 0.5 + 0.5 * Math.sin(f / 4 + k);
              return <div key={t} style={{ position: "absolute", left: 90, top: 520 + k * 92, width: 760, padding: "18px 24px", borderRadius: 14, border: `2px solid ${k === 2 ? K.noise : "rgba(255,255,255,0.14)"}`, background: k === 2 ? `rgba(255,59,48,${0.1 + pulse * 0.12})` : "rgba(255,255,255,0.03)", fontFamily: F.mono, fontSize: 24, color: k === 2 ? K.noise : K.text, opacity: p, transform: `translateX(${(1 - p) * 120}px)` }}>{t}</div>;
            })}
          </div>
          {/* the verdict */}
          <AbsoluteFill style={{ background: `rgba(5,6,10,${0.86 * ramp(f, tWant - 4, tWant + 6)})` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: ramp(f, tWant - 2, tWant + 6) }}>
            <Disp s={96}>Employers want it.</Disp>
            <div style={{ marginTop: 40, opacity: ramp(f, tNo - 3, tNo + 3), transform: `scale(${interpolate(spr(f, tNo - 2, 10, 240), [0, 1], [1.4, 1])})` }}>
              <Disp s={170} c={K.noise}>Nobody proves it.</Disp>
            </div>
            <div style={{ marginTop: 46, display: "flex", gap: 22, justifyContent: "center", opacity: ramp(f, tNo + 8, tNo + 16) }}>
              {["“AI-savvy” on a résumé", "A prompt-engineering certificate", "A vibe-coded portfolio"].map((t) => (
                <div key={t} style={{ position: "relative", padding: "14px 22px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.18)" }}>
                  <Sans s={26} c={K.muted} w={600}>{t}</Sans>
                  <div style={{ position: "absolute", left: 10, right: 10, top: "50%", height: 3, background: K.noise, transform: `scaleX(${ramp(f, tNo + 14, tNo + 22)})`, transformOrigin: "left" }} />
                </div>
              ))}
            </div>
          </div>
          <Flash a={tNo} c={K.noise} o={0.18} />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================================
// AI PAIR: every lab has an AI Pair mode. Brief it. Catch it. Prove it.
// =====================================================================================================
const BRIEF: [string, string, boolean][] = [["Production log", "12 lines around the alert", true], ["payments.js", "the handler", true], ["Board photo", "fuse · switch · lamp", true], [".env", "GATEWAY_SECRET=sk_live_…", false], ["customers.csv", "phones · card last-4", false], ["Aadhaar photo", "customer ID", false]];

const LiveFrame: React.FC<{ f: number; t: number; src: string; from: number; rate: number; label: string; tilt?: number }> = ({ f, t, src, from, rate, label, tilt = -14 }) => {
  const p = spr(f, t, 14, 140);
  return (
    <div style={{ position: "absolute", left: 1000, top: 210, width: 860, opacity: p, transform: `perspective(1800px) rotateY(${tilt + (1 - p) * -30}deg) translateX(${(1 - p) * 300}px)`, transformOrigin: "left center" }}>
      <div style={{ borderRadius: 18, overflow: "hidden", border: "2px solid rgba(255,255,255,0.18)", boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 70px ${K.violet}33`, background: "#000" }}>
        <div style={{ height: 34, background: "#14161E", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
          {[K.noise, K.amber, K.signal].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c, opacity: 0.7 }} />)}
          <Mono s={12} c={K.muted} style={{ marginLeft: 12, letterSpacing: "0.06em", textTransform: "none" }}>capable · #/ailab</Mono>
        </div>
        <div style={{ width: 860, height: 484, overflow: "hidden" }}>
          <Sequence from={t} layout="none">
            <OffthreadVideo src={staticFile(src)} muted startFrom={from} playbackRate={rate} style={{ width: 860, height: 484 }} />
          </Sequence>
        </div>
      </div>
      <div style={{ marginTop: 18 }}><Chip label={label} st="new" s={15} /></div>
    </div>
  );
};

export const AiPair: React.FC<{ g: G }> = ({ g }) => {
  const f = useCurrentFrame();
  const [b1, b2, b3, b4, b5] = [1, 2, 3, 4, 5].map((i) => bs(g, i));
  const tLab = at(g, 0, "every capable"), tJudge = at(g, 0, "graded on"), tTyping = at(g, 0, "not typing");
  const tGive = at(g, 1, "give it"), tKeys = at(g, 1, "never the keys"), tCust = at(g, 1, "never a customer");
  const tFluent = at(g, 2, "fast"), tOne = at(g, 2, "one of its");
  const tTwo = at(g, 3, "two patches"), tBoth = at(g, 3, "both pass"), tSwallow = at(g, 3, "one swallows"), tShips = at(g, 3, "he ships"), tNames = at(g, 3, "names the");
  const tMeasure = at(g, 4, "measures"), tSwitch = at(g, 4, "the switch reads"), tLamp = at(g, 4, "the lamp reads"), tAIw = at(g, 4, "the ai was"), tMeter = at(g, 4, "the meter");
  const tB1 = at(g, 5, "brief it"), tC1 = at(g, 5, "catch it"), tP1 = at(g, 5, "prove it"), tFlu = at(g, 5, "ai fluency"), tFor = at(g, 5, "for software");
  const P1 = win(f, 0, b1 + 4), P2 = win(f, b1, b2 + 4), P3 = win(f, b2, b3 + 4), P4 = win(f, b3, b4 + 4), P5 = win(f, b4, b5 + 4), P6 = ramp(f, b5 - 6, b5 + 8);
  const sh = shake(f, [tKeys, tCust, tSwallow, tLamp, tB1, tC1, tP1], 12);
  const step = (n: string, t: string, c: string, a: number) => (
    <div style={{ position: "absolute", left: 120, top: 120, display: "flex", gap: 18, alignItems: "baseline", opacity: spr(f, a) }}>
      <Mono s={22} c={c} w={700}>{n}</Mono><Mono s={22} c={K.muted}>{t}</Mono>
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg tint="rgba(139,124,255,0.13)" tint2="rgba(61,245,200,0.08)" />
      <GridFloor color="rgba(139,124,255,0.45)" opacity={0.18} speed={0.6} />
      <Dust n={40} c={K.violet} o={0.35} seed="ap" />
      <AbsoluteFill style={{ transform: sh }}>

        {/* ---------------- 1: AI PAIR ---------------- */}
        <AbsoluteFill style={{ opacity: P1 }}>
          {/* binary orbit: you + the assistant */}
          {[0, 1].map((k) => {
            const ang = f / 22 + k * Math.PI;
            const r = 150 * spr(f, 2, 12, 90);
            return <div key={k} style={{ position: "absolute", left: 960 + Math.cos(ang) * r - (k ? 70 : 60), top: 330 + Math.sin(ang) * r * 0.35 - (k ? 70 : 60) }}>
              {k ? <Orb f={f} s={140} /> : <div style={{ width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #c8fff0, ${K.signal} 60%, #0a5c4a)`, boxShadow: `0 0 60px ${K.signal}, 0 0 120px ${K.signal}66` }} />}
            </div>;
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: 500, textAlign: "center" }}>
            <Mono s={24} c={K.violet} style={{ opacity: ramp(f, 4, 14) }}>New · in every lab</Mono>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
              {"AI PAIR".split("").map((ch, k) => {
                const p = spr(f, 6 + k * 2, 11, 240);
                return <Disp key={k} s={210} c={k < 2 ? K.violet : K.text} style={{ opacity: p, transform: `translateY(${(1 - p) * 120}px) rotateX(${(1 - p) * 80}deg)`, minWidth: ch === " " ? 60 : undefined }}>{ch}</Disp>;
              })}
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", gap: 28 }}>
            {[["CodeLab", K.signal], ["DataLab", K.blue], ["TradeLab", K.amber]].map(([t, c], k) => {
              const p = spr(f, tLab + k * 5, 13, 200), stamp = spr(f, tLab + 10 + k * 5, 9, 260);
              return <div key={t} style={{ position: "relative", padding: "20px 34px", borderRadius: 18, border: `2px solid ${c}`, background: `${c}14`, opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
                <Sans s={34} w={800}>{t}</Sans>
                <div style={{ position: "absolute", right: -20, top: -20, transform: `scale(${stamp}) rotate(8deg)` }}><Chip label="+ AI Pair" st="idle" s={18} style={{ borderColor: K.violet, color: K.violet, background: "rgba(139,124,255,0.2)" }} /></div>
              </div>;
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", opacity: ramp(f, tJudge - 4, tJudge + 6) }}>
            <Sans s={44} w={700}>Graded on <span style={{ color: K.signal }}>judgement</span>, <span style={{ position: "relative", color: K.muted }}>not typing<span style={{ position: "absolute", left: 0, right: 0, top: "55%", height: 4, background: K.noise, transform: `scaleX(${ramp(f, tTyping, tTyping + 8)})`, transformOrigin: "left" }} /></span>.</Sans>
          </div>
        </AbsoluteFill>

        {/* ---------------- 2: BRIEF ---------------- */}
        <AbsoluteFill style={{ opacity: P2 }}>
          {step("01", "Brief it", K.signal, b1 + 2)}
          <div style={{ position: "absolute", left: 120, top: 170, opacity: spr(f, b1 + 4) }}>
            <Disp s={96}>Evidence in.</Disp>
            <Disp s={96} c={K.noise} style={{ opacity: ramp(f, tKeys - 4, tKeys + 4) }}>Secrets never.</Disp>
          </div>
          {/* the prompt box */}
          <Panel style={{ position: "absolute", left: 1060, top: 300, width: 700, height: 420, padding: 30 }} glow={K.violet}>
            <Mono s={16} c={K.violet}>Prompt · to the assistant</Mono>
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {BRIEF.filter((b) => b[2]).map(([t, d], k) => {
                const land = spr(f, tGive + 6 + k * 7, 13, 220);
                return <div key={t} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "rgba(61,245,200,0.1)", border: `2px solid ${K.signal}`, opacity: land, transform: `scale(${0.8 + land * 0.2})` }}>
                  <Sans s={28} w={800} c={K.signal}>✓ {t}</Sans><Sans s={22} c={K.muted}>{d}</Sans></div>;
              })}
            </div>
            <div style={{ position: "absolute", left: 30, bottom: 26, fontFamily: F.mono, fontSize: 20, color: K.text, opacity: ramp(f, tGive + 30, tGive + 36) }}>“Find the root cause. Don’t change the contract.”<span style={{ opacity: Math.round(f / 8) % 2 }}>▍</span></div>
          </Panel>
          {/* shield */}
          <div style={{ position: "absolute", left: 1010, top: 250, width: 800, height: 520, borderRadius: 40, border: `4px solid ${K.noise}`, opacity: ramp(f, tKeys - 2, tKeys + 2) * (0.4 + 0.4 * Math.sin(f / 3)), boxShadow: `0 0 60px ${K.noise}88, inset 0 0 60px ${K.noise}44` }} />
          {/* flying cards */}
          {BRIEF.map(([t, d, ok], k) => {
            const tt = ok ? tGive + k * 7 : (k === 3 ? tKeys : tCust + (k - 4) * 6) - 10;
            const fly = interpolate(f, [tt, tt + 14], [0, 1], { ...CL, easing: INOUT });
            const x0 = 150 + (k % 3) * 300, y0 = 520 + Math.floor(k / 3) * 170;
            if (ok) {
              return <div key={t} style={{ position: "absolute", left: lerp(x0, 1200, fly), top: lerp(y0, 380 + k * 70, fly), opacity: spr(f, b1 + 8 + k * 3) * (1 - fly), transform: `scale(${1 - fly * 0.4})` }}>
                <Panel style={{ padding: "16px 22px", width: 270 }}><Sans s={26} w={800}>{t}</Sans><Sans s={18} c={K.muted}>{d}</Sans></Panel></div>;
            }
            const bounce = interpolate(f, [tt + 14, tt + 34], [0, 1], { ...CL, easing: INOUT });
            const x = lerp(x0, 960, fly) - bounce * 260, y = lerp(y0, 480, fly) + bounce * bounce * 700;
            return <div key={t} style={{ position: "absolute", left: x, top: y, opacity: spr(f, b1 + 8 + k * 3) * (1 - bounce * 0.9), transform: `rotate(${bounce * -40}deg)` }}>
              <Panel style={{ padding: "16px 22px", width: 270, borderColor: K.noise }} glow={fly > 0.5 ? K.noise : undefined}><Sans s={26} w={800} c={K.noise}>🔒 {t}</Sans><Sans s={18} c={K.muted}>{d}</Sans>
                {fly > 0.9 && <Mono s={16} c={K.noise} style={{ marginTop: 6 }}>Blocked · never in a prompt</Mono>}</Panel></div>;
          })}
        </AbsoluteFill>

        {/* ---------------- 3: CATCH ---------------- */}
        <AbsoluteFill style={{ opacity: P3 }}>
          {step("02", "Catch it", K.amber, b2 + 2)}
          <div style={{ position: "absolute", left: 150, top: 300 }}><Orb f={f} s={300} /></div>
          {["Sure! Here’s the fix. ✨", "Root cause found · confidence 94%", "I ran the tests: all pass ✓", "Safe to merge. 🚀"].map((t, k) => {
            const p = spr(f, tFluent + k * 6, 13, 240);
            return <div key={t} style={{ position: "absolute", left: 560, top: 250 + k * 104, padding: "18px 28px", borderRadius: 22, borderTopLeftRadius: 4, background: "rgba(139,124,255,0.16)", border: `2px solid ${K.violet}66`, opacity: p * (1 - ramp(f, tOne + 30, tOne + 40) * 0.5), transform: `translateX(${(1 - p) * -60}px)` }}><Sans s={34} w={650}>{t}</Sans></div>;
          })}
          <div style={{ position: "absolute", left: 1220, top: 230, width: 600, opacity: ramp(f, tOne - 4, tOne + 6) }}>
            <Mono s={20} c={K.amber}>Every trial</Mono>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 18 }}>
              {Array.from({ length: 12 }).map((_, k) => {
                const p = spr(f, tOne + k * 2, 12, 260);
                const bad = Math.floor(random(`bad${k}`) * 3);
                return <div key={k} style={{ height: 92, borderRadius: 14, border: "2px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: p, transform: `scale(${p})` }}>
                  {[0, 1, 2].map((d) => <div key={d} style={{ width: 18, height: 18, borderRadius: 9, background: d === bad ? K.noise : K.violet, boxShadow: d === bad ? `0 0 14px ${K.noise}` : undefined }} />)}
                </div>;
              })}
            </div>
            <Disp s={78} style={{ marginTop: 34 }}>One call is <span style={{ color: K.noise }}>wrong</span>.</Disp>
            <Sans s={28} c={K.muted} w={500} style={{ marginTop: 10 }}>Just as fluent. Just as confident.</Sans>
          </div>
        </AbsoluteFill>

        {/* ---------------- 4: PROVE · SOFTWARE ---------------- */}
        <AbsoluteFill style={{ opacity: P4 }}>
          {step("03", "Prove it · software", K.blue, b3 + 2)}
          {(["A", "B"] as const).map((slot, k) => {
            const trap = slot === "B";
            const p = spr(f, tTwo + k * 5, 13, 200);
            const scan = ramp(f, tSwallow - 8, tSwallow + 6);
            const shipped = !trap && f > tShips;
            return (
              <div key={slot} style={{ position: "absolute", left: 120 + k * 430, top: 190, width: 400, opacity: p, transform: `translateY(${(1 - p) * 80}px)` }}>
                <Panel style={{ padding: 26, height: 380, borderColor: trap && scan > 0.6 ? K.noise : shipped ? K.signal : "rgba(139,124,255,0.6)" }} glow={trap && scan > 0.6 ? K.noise : shipped ? K.signal : undefined}>
                  <Mono s={15} c={K.violet}>Copilot · patch {slot}</Mono>
                  <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 24, lineHeight: 1.6, color: "#7ee2a8" }}>
                    {(trap ? ["+ has(event.orderId)", "+ add(event.orderId)"] : ["+ has(event.id)", "+ add(event.id)"]).map((l) => <div key={l} style={{ background: "rgba(46,160,67,0.12)", padding: "0 6px" }}>{l}</div>)}
                  </div>
                  <div style={{ marginTop: 18, opacity: ramp(f, tBoth - 4, tBoth + 4) }}><Sans s={34} w={800} c={K.signal}>Visible tests 2/2 ✓</Sans></div>
                  {trap && <div style={{ marginTop: 14, opacity: ramp(f, tSwallow, tSwallow + 6) }}>
                    <Sans s={30} w={800} c={K.noise}>Hidden: refund ₹200 → lost</Sans>
                    <Mono s={16} c={K.noise} style={{ marginTop: 6 }}>refunds deduped by order</Mono>
                  </div>}
                  {trap && <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: 4, background: K.noise, boxShadow: `0 0 20px ${K.noise}`, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />}
                </Panel>
                {shipped && <div style={{ position: "absolute", left: 40, top: 300, padding: "8px 22px", border: `5px solid ${K.signal}`, borderRadius: 12, color: K.signal, fontFamily: F.display, fontWeight: 900, fontSize: 60, transform: `rotate(-10deg) scale(${interpolate(spr(f, tShips, 9, 260), [0, 1], [2, 1])})`, background: "rgba(5,6,10,0.7)" }}>SHIPPED</div>}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 120, top: 650, width: 830, opacity: ramp(f, tNames - 4, tNames + 6), transform: `translateY(${(1 - spr(f, tNames - 4)) * 60}px)` }}>
            <Mono s={18} c={K.amber}>The test he names</Mono>
            <Panel style={{ marginTop: 12, padding: "20px 26px" }} glow={K.amber}>
              <Sans s={30} w={750}>₹640 captured → refund ₹200 → refund ₹500</Sans>
              <Sans s={24} c={K.noise} w={700} style={{ marginTop: 8 }}>Patch B: refund lost · Patch A: ₹200 refunded, ₹500 refused ✓</Sans>
            </Panel>
          </div>
          <LiveFrame f={f} t={b3 + 10} src="capx/cap/aipair_code.mp4" from={30 * 4.6} rate={1.4} label="Live product · AI Pair · CodeLab" />
        </AbsoluteFill>

        {/* ---------------- 5: PROVE · TRADES ---------------- */}
        <AbsoluteFill style={{ opacity: P5 }}>
          {step("03", "Prove it · trades", K.amber, b4 + 2)}
          {/* multimeter */}
          <div style={{ position: "absolute", left: 140, top: 200, width: 400, height: 600, borderRadius: 46, background: "linear-gradient(170deg, #F2B21B, #B37A06)", boxShadow: "0 40px 100px rgba(0,0,0,0.6)", opacity: spr(f, tMeasure - 6), transform: `translateY(${(1 - spr(f, tMeasure - 6)) * 140}px) rotate(${(1 - spr(f, tMeasure - 6)) * -12}deg)` }}>
            <div style={{ position: "absolute", left: 34, right: 34, top: 40, height: 190, borderRadius: 18, background: "#9FB59A", boxShadow: "inset 0 6px 20px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "0 26px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 96, fontWeight: 700, color: "#1E2A1C", fontVariantNumeric: "tabular-nums" }}>{f < tSwitch ? "- - -" : f < tLamp ? "0.08" : "OL"}</div>
              <div style={{ fontFamily: F.mono, fontSize: 26, color: "#1E2A1C" }}>Ω · {f < tLamp ? "wall switch" : "lamp"}</div>
            </div>
            <div style={{ position: "absolute", left: 125, top: 280, width: 150, height: 150, borderRadius: "50%", background: "#222", border: "8px solid #333", transform: `rotate(${f < tSwitch ? 0 : 60}deg)` }}><div style={{ position: "absolute", left: 63, top: 6, width: 10, height: 50, background: "#ddd", borderRadius: 5 }} /></div>
            <div style={{ position: "absolute", left: 70, bottom: 50, width: 44, height: 44, borderRadius: 22, background: K.noise }} /><div style={{ position: "absolute", right: 70, bottom: 50, width: 44, height: 44, borderRadius: 22, background: "#111" }} />
          </div>
          <div style={{ position: "absolute", left: 600, top: 210, width: 380 }}>
            <Panel style={{ padding: 22, borderColor: K.violet, opacity: spr(f, b4 + 6) }}>
              <Mono s={14} c={K.violet}>Assistant · 91%</Mono>
              <div style={{ position: "relative", marginTop: 8 }}><Sans s={30} w={750}>Replace the switch.</Sans>
                <div style={{ position: "absolute", left: 0, right: 0, top: "52%", height: 4, background: K.noise, transform: `scaleX(${ramp(f, tAIw, tAIw + 8)})`, transformOrigin: "left" }} /></div>
            </Panel>
            {[["Wall switch", "0.08 Ω · fine", K.signal, tSwitch], ["Lamp", "OL · open", K.noise, tLamp]].map(([a, b, c, t]) => (
              <div key={a as string} style={{ marginTop: 18, padding: "16px 22px", borderRadius: 14, border: `2px solid ${c}`, background: `${c}18`, opacity: spr(f, (t as number) - 2), transform: `translateX(${(1 - spr(f, (t as number) - 2)) * 60}px)` }}>
                <Sans s={26} w={800} c={c as string} style={{ whiteSpace: "nowrap" }}>{a}: {b}</Sans>
              </div>
            ))}
            <div style={{ marginTop: 26, opacity: ramp(f, tMeter - 4, tMeter + 4) }}>
              <Disp s={64}>The meter</Disp><Disp s={64} c={K.signal}>was right.</Disp>
            </div>
          </div>
          <LiveFrame f={f} t={b4 + 10} src="capx/cap/aipair_trade.mp4" from={30 * 5.4} rate={1.45} label="Live product · AI Pair · TradeLab (simulation)" tilt={-12} />
        </AbsoluteFill>

        {/* ---------------- 6: BRIEF IT. CATCH IT. PROVE IT. ---------------- */}
        <AbsoluteFill style={{ opacity: P6 }}>
          <div style={{ position: "absolute", left: 120, top: 230 }}>
            {[["Brief it.", tB1, K.text], ["Catch it.", tC1, K.amber], ["Prove it.", tP1, K.signal]].map(([w, t, c]) => (
              <Rise key={w as string} f={f} t={(t as number) - 3} s={150} c={c as string}>{w}</Rise>
            ))}
          </div>
          <Flash a={tB1} o={0.12} /><Flash a={tC1} c={K.amber} o={0.14} /><Flash a={tP1} c={K.signal} o={0.16} />
          <div style={{ position: "absolute", left: 1080, top: 250, width: 720, opacity: spr(f, tFlu - 4), transform: `perspective(1600px) rotateY(${(1 - spr(f, tFlu - 4, 14, 120)) * 50}deg)` }}>
            <Panel style={{ padding: 34 }} glow={K.signal}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}><Mark s={54} /><div><Mono s={16} c={K.signal}>Signed capability receipt</Mono><Sans s={32} w={800}>AI Pair</Sans></div></div>
              {["AI-assisted production debugging", "AI-assisted fault diagnosis · simulation", "Safe AI use · no secrets, no customer data"].map((t, k) => {
                const p = spr(f, tFlu + 6 + k * 5);
                return <div key={t} style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}><Chip label="proven" st="proven" s={14} /><Sans s={27} w={650}>{t}</Sans></div>;
              })}
              <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", opacity: ramp(f, tFlu + 24, tFlu + 32) }}>
                <Mono s={15}>Graded by code · AI in grading: none</Mono><Mono s={15} c={K.signal}>Ed25519 ✓</Mono>
              </div>
            </Panel>
            <div style={{ marginTop: 26, display: "flex", gap: 16, opacity: ramp(f, tFor - 4, tFor + 6) }}>
              <Chip label="</> Software" st="proven" s={18} /><Chip label="⚡ Trades" st="new" s={18} /><Chip label="+ every lab next" st="pending" s={18} />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
