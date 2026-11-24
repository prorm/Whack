import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions, Flash, FONT, GOLD, GREEN, Grain, Progress, Punch, RED, Slam, Tag, Vignette } from "./fx";

/**
 * Experiment 5: learner-specific Memory Remix reel. Reuses CACHED Veo plates + synthesised SFX.
 * Only the overlay text is per-learner. The recall answer is never shown: the learner answers in the app.
 */
export type RemixProps = {
  learnerLabel: string;
  hook: string;
  repairTitle: string;
  repairWrong: string;
  repairRight: string;
  question: string;
  voice?: string | null;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sfx = (src: string, at: number, volume = 0.8) => (
  <Sequence from={at} layout="none"><Audio src={staticFile(src)} volume={volume} /></Sequence>
);

export const Remix: React.FC<RemixProps> = ({ learnerLabel, hook, repairTitle, repairWrong, repairRight, question, voice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 96, fps, config: { damping: 14 } });
  const ring = interpolate(frame, [190, 300], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 0-3.2s: hook on the cached Sheru aviators plate */}
      <Sequence durationInFrames={96}>
        <Punch from={1.25}><Video src={staticFile("v2_sheru_aviators.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} /></Punch>
        <Vignette strength={0.75} />
        <Tag at={4} top={140}>FOR {learnerLabel.toUpperCase()}</Tag>
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 330 }}>
          <Slam at={10} size={120} color={RED} rotate={-4}>Last time</Slam>
        </AbsoluteFill>
        <Captions text={hook} start={18} dur={70} emphasis={["370", "BEDA", "415"]} />
      </Sequence>
      {/* 3.2-6.3s: repair card over the darkened walk plate */}
      <Sequence from={96} durationInFrames={95}>
        <AbsoluteFill style={{ filter: "brightness(.35) blur(6px)", scale: 1.1 }}>
          <Video src={staticFile("v1_sheru_walk.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
      </Sequence>
      {frame >= 96 && frame < 191 && (
        <div style={{ position: "absolute", left: 70, right: 70, top: 520, padding: 44, borderRadius: 36, background: "rgba(12,14,20,.9)",
          border: `4px solid ${GOLD}`, translate: `0 ${interpolate(card, [0, 1], [900, 0])}px` }}>
          <div style={{ fontFamily: FONT, fontSize: 64, color: GOLD, lineHeight: 1.05 }}>{repairTitle}</div>
          <div style={{ fontFamily: FONT, fontSize: 72, color: RED, marginTop: 40, opacity: interpolate(frame, [110, 116], [0, 1], clamp) }}>{repairWrong}</div>
          <div style={{ fontFamily: FONT, fontSize: 72, color: GREEN, marginTop: 24, opacity: interpolate(frame, [130, 136], [0, 1], clamp) }}>{repairRight}</div>
        </div>
      )}
      {/* 6.3-10s: fresh recall question on the chase plate, countdown, NO answer */}
      <Sequence from={191} durationInFrames={110}>
        <AbsoluteFill style={{ filter: "brightness(.55)" }}>
          <Video src={staticFile("v3_huss_chase.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        <Vignette strength={0.6} color="120,0,0" />
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 260 }}>
          <Slam at={2} size={150} color="#fff">Now you</Slam>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 70, right: 70, top: 760, fontFamily: FONT, fontSize: 80, color: "#fff", textAlign: "center", lineHeight: 1.1,
          textShadow: "0 8px 0 #000" }}>{question}</div>
        <svg width={220} height={220} style={{ position: "absolute", left: 430, top: 1250 }} viewBox="0 0 220 220">
          <circle cx={110} cy={110} r={92} stroke="rgba(255,255,255,.25)" strokeWidth={18} fill="none" />
          <circle cx={110} cy={110} r={92} stroke={GOLD} strokeWidth={18} fill="none" strokeDasharray={578} strokeDashoffset={578 * ring} transform="rotate(-90 110 110)" />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1530, textAlign: "center", fontFamily: FONT, fontSize: 52, color: GOLD }}>ANSWER IN THE APP ↓</div>
      </Sequence>
      <Flash at={96} len={5} />
      <Flash at={191} len={5} />
      <Grain />
      <Progress />
      {voice && <Sequence from={18} layout="none"><Audio src={staticFile(voice)} /></Sequence>}
      <Audio src={staticFile("music_bed.wav")} volume={0.25} />
      {sfx("sfx_boom.wav", 10)}
      {sfx("sfx_whoosh.wav", 96, 0.6)}
      {sfx("sfx_buzz.wav", 110, 0.5)}
      {sfx("sfx_ding.wav", 130, 0.6)}
      {sfx("sfx_riser.wav", 191, 0.4)}
    </AbsoluteFill>
  );
};
