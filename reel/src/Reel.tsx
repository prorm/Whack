import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { Grain, LightLeak, Progress } from "./fx";
import { Chase, Cta, Hook, Teach, Three } from "./Scenes";
import timeline from "./timeline.json";

const dur = (id: string) => timeline.scenes.find((s) => s.id === id)!.frames;

/**
 * ScrollProof flagship reel (Tier B): cached Veo 3.1 Lite plates + Gemini image anchors
 * + Gemini TTS voice + locally synthesised music/SFX + Remotion motion graphics.
 * Scene lengths come from timeline.json, which is built from the measured voice lines.
 */
export const Reel: React.FC = () => {
  const total = timeline.total_frames;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={dur("hook")}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={12}>
          <LightLeak seed={2} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Three numbers" durationInFrames={dur("three")}>
          <Three />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={14}>
          <LightLeak seed={5} hueShift={30} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Teach" durationInFrames={dur("teach")}>
          <Teach />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={14}>
          <LightLeak seed={8} hueShift={330} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="Chase callback" durationInFrames={dur("chase")}>
          <Chase />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={14}>
          <LightLeak seed={11} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="CTA" durationInFrames={dur("cta")}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Grain />
      <Progress />
      <Audio
        name="Music bed (synthesised)"
        src={staticFile("music_bed.wav")}
        volume={(f) => interpolate(f, [0, 10, total - 20, total], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
