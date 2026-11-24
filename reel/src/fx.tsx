import { lightLeak } from "@remotion/effects/light-leak";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  Solid,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FONT = "'Arial Black', 'Segoe UI Black', Impact, sans-serif";
export const GOLD = "#ffcf3f";
export const RED = "#ff4b3a";
export const GREEN = "#5fe38f";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hard-hitting text slam: overshoot spring + RGB split that settles. */
export const Slam: React.FC<{
  children: ReactNode;
  at: number;
  size?: number;
  color?: string;
  rotate?: number;
  style?: CSSProperties;
}> = ({ children, at, size = 150, color = "#fff", rotate = -4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at;
  if (t < 0) return null;
  const s = spring({ frame: t, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const split = interpolate(t, [0, 10], [18, 0], clamp);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        lineHeight: 0.95,
        color,
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: -2,
        scale: interpolate(s, [0, 1], [2.4, 1]),
        rotate: `${interpolate(s, [0, 1], [rotate * 3, rotate])}deg`,
        opacity: interpolate(t, [0, 3], [0, 1], clamp),
        textShadow: `${split}px 0 0 rgba(255,40,60,.85), ${-split}px 0 0 rgba(40,220,255,.85), 0 10px 0 #000, 0 0 40px rgba(0,0,0,.6)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Hormozi-style captions: 3-word chunks, active word pops in gold. */
export const Captions: React.FC<{ text: string; start: number; dur: number; emphasis?: string[]; top?: number }> = ({
  text,
  start,
  dur,
  emphasis = [],
  top = 1260,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const times = weights.map((w) => {
    const s = start + (acc / total) * dur;
    acc += w;
    return s;
  });
  if (frame < start - 2 || frame > start + dur + 12) return null;
  let i = times.findIndex((t, k) => frame >= t && (k === times.length - 1 || frame < times[k + 1]));
  if (i < 0) i = 0;
  const c0 = Math.floor(i / 3) * 3;
  const pop = interpolate(frame - times[i], [0, 4], [1.14, 1.04], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 92,
        lineHeight: 1.05,
        color: "#fff",
        textTransform: "uppercase",
        textShadow: "0 8px 0 #000, 0 0 24px rgba(0,0,0,.9)",
        WebkitTextStroke: "3px #000",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 52,
      }}
    >
      {words.slice(c0, c0 + 3).map((w, k) => {
        const active = c0 + k === i;
        const em = emphasis.some((e) => w.toUpperCase().includes(e));
        return (
          <span
            key={k}
            style={{
              display: "inline-block",
              color: active ? (em ? RED : GOLD) : em ? GOLD : "#fff",
              scale: active ? pop : 1,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Handheld / chase camera shake. */
export const Shake: React.FC<{ amount: number; children: ReactNode; seed?: string }> = ({ amount, children, seed = "s" }) => {
  const frame = useCurrentFrame();
  const x = (random(`${seed}x${frame}`) - 0.5) * amount;
  const y = (random(`${seed}y${frame}`) - 0.5) * amount;
  return <AbsoluteFill style={{ translate: `${x}px ${y}px`, scale: 1 + amount / 900 }}>{children}</AbsoluteFill>;
};

/** Zoom punch on a cut: content starts slightly oversized and snaps in. */
export const Punch: React.FC<{ children: ReactNode; from?: number }> = ({ children, from = 1.18 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        scale: interpolate(frame, [0, 7], [from, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
        filter: `blur(${interpolate(frame, [0, 5], [10, 0], clamp)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.75, color = "0,0,0" }) => (
  <AbsoluteFill
    style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(${color},0) 45%, rgba(${color},${strength}) 100%)` }}
  />
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: 0.08,
        mixBlendMode: "overlay",
        backgroundImage:
          "repeating-radial-gradient(circle at 17% 32%, #fff 0 1px, transparent 1px 3px), repeating-radial-gradient(circle at 73% 61%, #000 0 1px, transparent 1px 4px)",
        translate: `${(frame * 37) % 9}px ${(frame * 53) % 7}px`,
      }}
    />
  );
};

export const Flash: React.FC<{ at: number; len?: number; color?: string }> = ({ at, len = 6, color = "#fff" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + len], [0, 0.85, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{ backgroundColor: color, opacity: o }} /> : null;
};

export const SpeedLines: React.FC<{ opacity?: number }> = ({ opacity = 0.5 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>
      {new Array(26).fill(0).map((_, i) => {
        const ang = random(`a${i}`) * 360;
        const len = 300 + random(`l${i}`) * 500;
        const travel = ((frame * (40 + random(`v${i}`) * 40) + random(`o${i}`) * 900) % 1100) + 300;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540,
              top: 900,
              width: len,
              height: 6,
              borderRadius: 6,
              background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.9))",
              transformOrigin: "0 50%",
              rotate: `${ang}deg`,
              translate: `${travel}px 0`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const LightLeak: React.FC<{ seed?: number; hueShift?: number }> = ({ seed = 0, hueShift = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height, width } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      style={{ mixBlendMode: "screen", opacity: 0.5 }}
      effects={[
        lightLeak({
          seed,
          hueShift,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp),
        }),
      ]}
    />
  );
};

/** Reel-style progress bar at the top. */
export const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 46, left: 50, right: 50, height: 8, borderRadius: 8, background: "rgba(255,255,255,.25)" }}>
      <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: "100%", borderRadius: 8, background: "#fff" }} />
    </div>
  );
};

export const Tag: React.FC<{ children: ReactNode; at?: number; color?: string; top?: number }> = ({
  children,
  at = 0,
  color = GOLD,
  top = 110,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        fontFamily: FONT,
        fontSize: 38,
        color: "#111",
        background: color,
        padding: "10px 22px",
        borderRadius: 14,
        translate: `${interpolate(s, [0, 1], [-500, 0])}px 0`,
        boxShadow: "0 10px 30px rgba(0,0,0,.5)",
      }}
    >
      {children}
    </div>
  );
};
