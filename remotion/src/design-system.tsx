import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { interpolate } from "./safe-interpolate";

export const COLORS = {
  obsidian: "#09090B",
  surface: "#111115",
  surfaceElevated: "rgba(20, 20, 26, 0.88)",
  offWhite: "#F4F3EE",
  muted: "rgba(244, 243, 238, 0.58)",
  dim: "rgba(244, 243, 238, 0.28)",
  amber: "#FFB800",
  vermilion: "#FF3B30",
  emerald: "#10B981",
  grid: "rgba(255, 255, 255, 0.12)",
  gridSubtle: "rgba(255, 255, 255, 0.05)",
} as const;

export const FONTS = {
  display: "'InterDisplay', 'Impact', 'Bahnschrift', 'Arial Black', sans-serif",
  sans: "'InterDisplay', system-ui, -apple-system, sans-serif",
  mono: "'JetBrainsMono', 'Consolas', monospace",
} as const;

export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export interface WordTiming {
  word: string;
  start_s: number;
  end_s: number;
  startFrame: number;
  endFrame: number;
}

export interface SceneManifest {
  id: string;
  act: string;
  actIndex: number;
  title: string;
  audioFile: string;
  mp3File: string;
  text: string;
  lead_s: number;
  speech_s: number;
  tail_s: number;
  duration_s: number;
  durationInFrames: number;
  startFrame: number;
  endFrame: number;
  start_s: number;
  end_s: number;
  leadFrames: number;
  speechFrames: number;
  words: WordTiming[];
}

export const FontFaces: React.FC = () => {
  const interUrl = staticFile("fonts/InterVariable.woff2");
  const monoRegUrl = staticFile("fonts/JetBrainsMono-Regular.ttf");
  const monoBoldUrl = staticFile("fonts/JetBrainsMono-Bold.ttf");
  return (
    <style>
      {`
      @font-face {
        font-family: 'InterDisplay';
        src: url('${interUrl}') format('woff2');
        font-weight: 100 900;
        font-style: normal;
      }
      @font-face {
        font-family: 'JetBrainsMono';
        src: url('${monoRegUrl}') format('truetype');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'JetBrainsMono';
        src: url('${monoBoldUrl}') format('truetype');
        font-weight: 700;
        font-style: normal;
      }
      * {
        box-sizing: border-box;
      }
      `}
    </style>
  );
};

/** Format frame into MM:SS:FF @ 60fps */
export function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const f = frame % fps;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

/** Corner registration crosshair (+) */
const Crosshair: React.FC<{ top?: number; bottom?: number; left?: number; right?: number; color?: string }> = ({
  top,
  bottom,
  left,
  right,
  color = COLORS.offWhite,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      bottom,
      left,
      right,
      width: 15,
      height: 15,
      pointerEvents: "none",
      opacity: 0.65,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 7,
        top: 0,
        width: 1,
        height: 15,
        backgroundColor: color,
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 7,
        left: 0,
        width: 15,
        height: 1,
        backgroundColor: color,
      }}
    />
  </div>
);

/** Persistent Swiss-brutalist HUD Telemetry Layer */
export const TelemetryHUD: React.FC<{
  scene: SceneManifest;
  globalFrame: number;
  totalFrames: number;
  actBoundaries: number[];
}> = ({ scene, globalFrame, totalFrames, actBoundaries }) => {
  const { fps } = useVideoConfig();
  const localFrame = globalFrame - scene.startFrame;

  // Find current spoken word chunk (4 words max in HUD teleprompter strip)
  const activeWordIdx = scene.words.findIndex(
    (w, idx) =>
      localFrame >= w.startFrame &&
      (idx === scene.words.length - 1 || localFrame < scene.words[idx + 1].startFrame)
  );
  const chunkStart = activeWordIdx >= 0 ? Math.floor(activeWordIdx / 5) * 5 : 0;
  const visibleWords = activeWordIdx >= 0 ? scene.words.slice(chunkStart, chunkStart + 5) : [];

  const progressPct = Math.min(100, Math.max(0, (globalFrame / totalFrames) * 100));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {/* Structural Swiss 1px border frame */}
      <div
        style={{
          position: "absolute",
          top: 28,
          bottom: 28,
          left: 36,
          right: 36,
          border: `1px solid ${COLORS.grid}`,
        }}
      />
      {/* Top & bottom horizontal telemetry rails */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 36,
          right: 36,
          height: 1,
          backgroundColor: COLORS.grid,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 36,
          right: 36,
          height: 1,
          backgroundColor: COLORS.grid,
        }}
      />

      {/* Corner Registration Crosshairs (+) */}
      <Crosshair top={21} left={29} color={COLORS.amber} />
      <Crosshair top={21} right={29} color={COLORS.amber} />
      <Crosshair bottom={21} left={29} color={COLORS.amber} />
      <Crosshair bottom={21} right={29} color={COLORS.amber} />
      <Crosshair top={65} left={29} />
      <Crosshair top={65} right={29} />
      <Crosshair bottom={65} left={29} />
      <Crosshair bottom={65} right={29} />

      {/* Top HUD Bar */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 36,
          right: 36,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          fontFamily: FONTS.mono,
          fontSize: 13,
          letterSpacing: "0.08em",
          color: COLORS.offWhite,
          backgroundColor: "rgba(9, 9, 11, 0.82)",
        }}
      >
        {/* Left: Brand + Dynamic Chapter Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                backgroundColor: COLORS.amber,
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 700, color: COLORS.offWhite }}>CAPABLE</span>
            <span style={{ color: COLORS.muted }}>//</span>
            <span style={{ color: COLORS.amber, fontWeight: 700 }}>{scene.act}</span>
          </div>
          <span style={{ color: COLORS.grid }}>|</span>
          <span style={{ color: COLORS.muted }}>{scene.title}</span>
        </div>

        {/* Right: Live Telemetry Readout */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ color: COLORS.emerald }}>● DETERMINISTIC TELEMETRY</span>
          <span style={{ color: COLORS.grid }}>|</span>
          <span style={{ color: COLORS.muted }}>
            SCN <strong style={{ color: COLORS.offWhite }}>{scene.id.toUpperCase()}</strong>
          </span>
          <span style={{ color: COLORS.grid }}>|</span>
          <span style={{ color: COLORS.muted }}>
            FRM{" "}
            <strong style={{ color: COLORS.offWhite }}>
              {String(globalFrame).padStart(5, "0")}
            </strong>{" "}
            / {String(totalFrames).padStart(5, "0")}
          </span>
          <span style={{ color: COLORS.grid }}>|</span>
          <span style={{ color: COLORS.amber, fontWeight: 700 }}>
            TC {formatTimecode(globalFrame, fps)}
          </span>
        </div>
      </div>

      {/* Bottom HUD Bar + Synced Voiceover Telemetry + Minimal Progress Rail */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 36,
          right: 36,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          fontFamily: FONTS.mono,
          fontSize: 13,
          backgroundColor: "rgba(9, 9, 11, 0.86)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              padding: "2px 7px",
              backgroundColor: "rgba(255, 184, 0, 0.14)",
              border: `1px solid ${COLORS.amber}`,
              color: COLORS.amber,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            VO SYNC
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {visibleWords.map((w, i) => {
              const isCurrent = chunkStart + i === activeWordIdx;
              return (
                <span
                  key={`${w.word}-${i}`}
                  style={{
                    color: isCurrent ? COLORS.amber : COLORS.offWhite,
                    opacity: isCurrent ? 1 : 0.65,
                    fontWeight: isCurrent ? 700 : 400,
                    transform: isCurrent ? "translateY(-1px)" : "none",
                  }}
                >
                  {w.word.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: COLORS.muted, fontSize: 12 }}>
            1920×1080 · 30FPS · VERTEX CHIRP3-HD
          </span>
          <span style={{ color: COLORS.amber, fontWeight: 700, width: 52, textAlign: "right" }}>
            {progressPct.toFixed(1)}%
          </span>
        </div>

        {/* Minimal Bottom Progress Rail */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              backgroundColor: COLORS.amber,
              boxShadow: `0 0 12px ${COLORS.amber}`,
            }}
          />
          {actBoundaries.map((bFrame, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${(bFrame / totalFrames) * 100}%`,
                top: -3,
                width: 2,
                height: 6,
                backgroundColor: COLORS.offWhite,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Subtle Swiss-brutalist background grid with animated telemetry coordinates */
export const SwissGridBackground: React.FC<{ accent?: string }> = ({ accent = COLORS.amber }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.obsidian, overflow: "hidden" }}>
      {/* Radial ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 75% 28%, ${accent}14 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)`,
        }}
      />
      {/* 120px structural grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.gridSubtle} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.gridSubtle} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `0px ${(frame * 0.25) % 120}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Kinetic Word-by-Word / Phrase Slam with spring(damping: 14, stiffness: 220) and masked translateY reveal */
export const KineticHeadline: React.FC<{
  words: { text: string; color?: string }[];
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
}> = ({
  words,
  startFrame = 0,
  staggerFrames = 6,
  fontSize = 132,
  lineHeight = 0.94,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        columnGap: Math.round(fontSize * 0.22),
        rowGap: Math.round(fontSize * 0.06),
      }}
    >
      {words.map((w, i) => {
        const delay = startFrame + i * staggerFrames;
        const spr = spring({
          frame: frame - delay,
          fps,
          config: { damping: 14, stiffness: 220 },
        });
        const translateY = interpolate(spr, [0, 1], [115, 0]);
        const scale = interpolate(spr, [0, 0.7, 1], [1.14, 1.02, 1]);
        const opacity = interpolate(frame - delay, [0, 4], [0, 1], CLAMP);

        return (
          <span
            key={`${w.text}-${i}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize,
                lineHeight,
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                color: w.color ?? COLORS.offWhite,
                transform: `translateY(${translateY}%) scale(${scale})`,
                opacity,
              }}
            >
              {w.text}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Floating Kinetic Callout Pill for UI & Architecture scenes */
export const CalloutPill: React.FC<{
  label: string;
  value: string;
  color?: string;
  startFrame: number;
  endFrame?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}> = ({
  label,
  value,
  color = COLORS.amber,
  startFrame,
  endFrame = 99999,
  top,
  bottom,
  left,
  right,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 220 },
  });
  const exit =
    endFrame < 90000
      ? interpolate(frame, [endFrame - 10, endFrame], [1, 0], CLAMP)
      : 1;
  const s = enter * exit;

  return (
    <div
      style={{
        position: "absolute",
        top,
        bottom,
        left,
        right,
        transform: `scale(${interpolate(s, [0, 1], [0.82, 1])}) translateY(${interpolate(
          s,
          [0, 1],
          [24, 0]
        )}px)`,
        opacity: s,
        backgroundColor: "rgba(9, 9, 11, 0.94)",
        border: `1.5px solid ${color}`,
        boxShadow: `0 18px 48px rgba(0,0,0,0.75), 0 0 24px ${color}33`,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: COLORS.muted,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.offWhite,
            letterSpacing: "-0.02em",
            marginTop: 2,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

export interface CameraKeyframe {
  frame: number;
  scale: number;
  x: number; // percentage or px
  y: number;
  rotX?: number;
  rotY?: number;
}

/**
 * Full-Bleed Live App Showcase Stage (88-92% viewport) inside a sleek frameless glass bezel
 * with programmatic 3D camera push-ins onto the exact UI control being clicked.
 */
export const FullBleedCaptureStage: React.FC<{
  videoSrc: string;
  playbackRate?: number;
  trimBeforeFrames?: number;
  keyframes: CameraKeyframe[];
  badgeText: string;
  accentColor?: string;
  children?: React.ReactNode;
}> = ({
  videoSrc,
  playbackRate = 1,
  trimBeforeFrames = 0,
  keyframes,
  badgeText,
  accentColor = COLORS.amber,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpr = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 180 },
  });

  // Interpolate smooth camera moves across keyframes
  // Fit authored keyframes into the scene: if inner keys overrun the final key, compress them proportionally.
  const rawFrames = keyframes.map((k) => k.frame);
  const endKey = rawFrames[rawFrames.length - 1];
  const innerMax = Math.max(...rawFrames.slice(0, -1));
  const squeeze = innerMax >= endKey ? (endKey * 0.82) / innerMax : 1;
  const frames = rawFrames.map((f, i) => (i === rawFrames.length - 1 ? f : Math.round(f * squeeze) + i * 0.001));
  const scale = interpolate(
    frame,
    frames,
    keyframes.map((k) => k.scale),
    { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );
  const tx = interpolate(
    frame,
    frames,
    keyframes.map((k) => k.x),
    { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );
  const ty = interpolate(
    frame,
    frames,
    keyframes.map((k) => k.y),
    { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );
  const rotX = interpolate(
    frame,
    frames,
    keyframes.map((k) => k.rotX ?? 0),
    { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );
  const rotY = interpolate(
    frame,
    frames,
    keyframes.map((k) => k.rotY ?? 0),
    { ...CLAMP, easing: Easing.bezier(0.22, 1, 0.36, 1) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.obsidian }}>
      <SwissGridBackground accent={accentColor} />

      {/* Full-bleed viewport container inside HUD (leaves clean margin for top/bottom HUD rails) */}
      <div
        style={{
          position: "absolute",
          top: 84,
          bottom: 84,
          left: 52,
          right: 52,
          border: `1px solid rgba(255,255,255,0.22)`,
          backgroundColor: "#05060A",
          boxShadow: `0 30px 90px rgba(0,0,0,0.85), 0 0 0 1px ${accentColor}33`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transform: `scale(${interpolate(enterSpr, [0, 1], [0.96, 1])})`,
          opacity: enterSpr,
        }}
      >
        {/* Dedicated Frameless Glass Top Telemetry Strip (Zero Overlap with App UI) */}
        <div
          style={{
            height: 38,
            backgroundColor: "rgba(9, 9, 11, 0.96)",
            borderBottom: `1px solid ${COLORS.grid}`,
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 35,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONTS.mono,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: COLORS.offWhite,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: COLORS.emerald,
                boxShadow: `0 0 8px ${COLORS.emerald}`,
              }}
            />
            <span
              style={{
                backgroundColor: COLORS.vermilion ?? "#FF3B30",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                padding: "5px 12px",
                borderRadius: 4,
                letterSpacing: "0.1em",
              }}
            >
              ● LIVE DEMO FOOTAGE · RECORDED FROM THE WORKING APP
            </span>
            <span style={{ color: COLORS.muted }}>//</span>
            <span style={{ color: accentColor, fontWeight: 700 }}>{badgeText}</span>
          </div>

          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: COLORS.muted,
            }}
          >
            3D CAM ZOOM <strong style={{ color: COLORS.amber }}>{scale.toFixed(2)}×</strong> · PAN (
            {Math.round(tx)}, {Math.round(ty)}) · TILT ({rotX.toFixed(1)}°, {rotY.toFixed(1)}°)
          </div>
        </div>

        {/* Dynamic 3D-Perspective Camera Rig */}
        <div
          style={{
            flex: 1,
            width: "100%",
            position: "relative",
            overflow: "hidden",
            perspective: "1800px",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              transformOrigin: "50% 50%",
              transform: `perspective(1800px) translate3d(${tx}px, ${ty}px, 0px) scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            }}
          >
            <Video
              src={staticFile(videoSrc)}
              playbackRate={playbackRate}
              trimBefore={trimBeforeFrames}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
