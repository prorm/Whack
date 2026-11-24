import { AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PremiumScene } from "../../app/src/learn/PremiumScene";
import { BEATS, SHOWCASE_LENGTH, SHOWCASE_STORY } from "../../app/src/learn/reelTimeline";
import "../../app/src/learn/reel.css";

export function Premium() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  let beat = 0;
  for (let index = 1; index < BEATS.length; index++) {
    if (seconds >= BEATS[index].at) beat = index;
  }
  const age = frame - Math.round(BEATS[beat].at * fps);
  const impact = 0.79 + 0.21 * spring({ fps, frame: age, config: { damping: 13, stiffness: 175 } });
  const strike = interpolate(age, [0, beat === 2 ? 27 : 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="showcase-reel">
      <PremiumScene
        story={SHOWCASE_STORY}
        beat={beat}
        correct
        progress={seconds / SHOWCASE_LENGTH}
        impact={impact}
        strike={strike}
        media={beat < 2 && (
          <Sequence from={0} durationInFrames={Math.round(4.6 * fps)} layout="none">
            <Loop durationInFrames={4 * fps} layout="none">
              <OffthreadVideo className="video-ready" src={staticFile("v2_sheru_aviators.mp4")} muted />
            </Loop>
          </Sequence>
        )}
        gate={beat === 4 && <div className="reel-gate">
          {["₹13.33", "₹30", "₹215"].map((value) => (
            <div className={`showcase-choice ${seconds >= 16.45 && value === "₹30" ? "chosen" : ""}`} key={value}>{value}</div>
          ))}
        </div>}
        feedback={beat === 5 && <p className="reel-feedback">{SHOWCASE_STORY.answerFormula}</p>}
      />
      {BEATS.map(({ at, sound }) => (
        <Sequence key={at} from={Math.round(at * fps)} layout="none">
          <Audio src={staticFile(`sfx_${sound}.wav`)} volume={sound === "boom" ? 0.45 : 0.55} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
