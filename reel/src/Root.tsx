import { Composition } from "remotion";
import { Reel } from "./Reel";
import { Remix } from "./Remix";
import { Premium } from "./Premium";
import { SHOWCASE_LENGTH } from "../../app/src/learn/reelTimeline";
import timeline from "./timeline.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="PayoutCheck" component={Premium} durationInFrames={SHOWCASE_LENGTH * 30} fps={30} width={1080} height={1920} />
      <Composition
        id="ScrollProofReel"
        component={Reel}
        durationInFrames={timeline.total_frames}
        fps={timeline.fps}
        width={1080}
        height={1920}
      />
      <Composition
        id="RemixReel"
        component={Remix}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          learnerLabel: "Persona B (fictional)",
          hook: 'Guru, last time you said "20% of 350 = 370". Scene beda.',
          repairTitle: "Percent OF = multiply, then ÷ 100",
          repairWrong: "350 + 20 = 370 ✗",
          repairRight: "350 × 20 ÷ 100 = 70 ✓",
          question: "Commission is 5% on sales of ₹400. How much commission?",
          voice: null as string | null,
        }}
      />
    </>
  );
};
