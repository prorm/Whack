import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions, Flash, FONT, GOLD, GREEN, Punch, RED, Shake, Slam, SpeedLines, Tag, Vignette } from "./fx";
import timeline from "./timeline.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const scene = (id: string) => timeline.scenes.find((s) => s.id === id)!;
const voiceStart = (id: string) => Math.round(scene(id).pad_before * timeline.fps);
const voiceFrames = (id: string) => Math.round(scene(id).voice_dur_s * timeline.fps);
const fill = { width: "100%", height: "100%", objectFit: "cover" } as const;

const Sfx: React.FC<{ src: string; at: number; volume?: number }> = ({ src, at, volume = 0.8 }) => (
  <Sequence from={at} layout="none">
    <Audio src={staticFile(src)} volume={volume} />
  </Sequence>
);

const Voice: React.FC<{ id: string; line: string }> = ({ id, line }) => (
  <Sequence from={voiceStart(id)} layout="none">
    <Audio src={staticFile(`${line}.wav`)} volume={1} />
  </Sequence>
);

// =========================================================== 1. HOOK
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Punch from={1.3}>
        <AbsoluteFill style={{ scale: interpolate(frame, [0, 102], [1.04, 1.16]) }}>
          <Video src={staticFile("v1_sheru_walk.mp4")} playbackRate={0.85} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
      </Punch>
      <Vignette strength={0.8} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 330 }}>
        <Slam at={16} size={170} color="#fff">Wrong</Slam>
        <Slam at={22} size={190} color={GOLD} rotate={3}>washer?</Slam>
      </AbsoluteFill>
      <Tag at={40} top={140}>SHERU BHAI · PLUMBING BOSS</Tag>
      <Captions text="Wrong washer, guru? Scene beda." start={voiceStart("hook")} dur={voiceFrames("hook")} emphasis={["WASHER", "BEDA"]} />
      <Flash at={16} len={5} />
      <Voice id="hook" line="l1_hook" />
      <Sfx src="sfx_riser.wav" at={0} volume={0.35} />
      <Sfx src="sfx_boom.wav" at={16} volume={0.9} />
    </AbsoluteFill>
  );
};

// =========================================================== 2. THREE NUMBERS
export const Three: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nums = ["1", "2", "3"];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Punch>
        <AbsoluteFill style={{ scale: interpolate(frame, [0, 78], [1.0, 1.12]) }}>
          <Video src={staticFile("v2_sheru_aviators.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
      </Punch>
      <Vignette strength={0.7} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 260, flexDirection: "row", gap: 40 }}>
        {nums.map((n, i) => {
          const at = 14 + i * 9;
          const s = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 240 } });
          return (
            <div
              key={n}
              style={{
                width: 210,
                height: 210,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                fontFamily: FONT,
                fontSize: 130,
                color: "#111",
                background: i === 2 ? GOLD : "#fff",
                boxShadow: "0 18px 40px rgba(0,0,0,.6)",
                scale: interpolate(s, [0, 1], [0, 1]),
                rotate: `${interpolate(s, [0, 1], [-90, 0])}deg`,
              }}
            >
              {n}
            </div>
          );
        })}
      </AbsoluteFill>
      <Captions text="Every washer has three numbers." start={voiceStart("three")} dur={voiceFrames("three")} emphasis={["THREE"]} />
      <Voice id="three" line="l2_three" />
      <Sfx src="sfx_whoosh.wav" at={0} volume={0.6} />
      <Sfx src="sfx_tick.wav" at={14} />
      <Sfx src="sfx_tick.wav" at={23} />
      <Sfx src="sfx_tick.wav" at={32} />
      <Sfx src="sfx_boom.wav" at={42} volume={0.5} />
    </AbsoluteFill>
  );
};

// =========================================================== 3. TEACH (motion-graphic washer)
const Draw: React.FC<{ at: number; children: (p: number) => React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return <>{children(p)}</>;
};

const Label: React.FC<{ at: number; x: number; y: number; big: string; small: string; color?: string }> = ({
  at,
  x,
  y,
  big,
  small,
  color = GOLD,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 200 } });
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, scale: s, transformOrigin: "left center" }}>
      <div style={{ fontFamily: FONT, fontSize: 96, color, lineHeight: 1, textShadow: "0 6px 0 #000" }}>{big}</div>
      <div style={{ fontFamily: FONT, fontSize: 44, color: "#fff", textShadow: "0 4px 0 #000" }}>{small}</div>
    </div>
  );
};

export const Teach: React.FC = () => {
  const frame = useCurrentFrame();
  const v0 = voiceStart("teach");
  const vd = voiceFrames("teach");
  // beats follow the spoken rhythm: "ID, the hole" / "OD, the outside" / "and thickness"
  const tID = v0;
  const tOD = v0 + Math.round(vd * 0.36);
  const tT = v0 + Math.round(vd * 0.7);
  const ringLen = 2 * Math.PI * 230;
  const draw = interpolate(frame, [0, 16], [ringLen, 0], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0f16" }}>
      <AbsoluteFill style={{ filter: "blur(22px) brightness(.35) saturate(1.3)", scale: 1.2 }}>
        <Img src={staticFile("sheru_bhai_washers.png")} style={fill} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,207,63,.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,207,63,.07) 2px, transparent 2px)",
          backgroundSize: "60px 60px",
          translate: `0 ${frame * 0.6}px`,
        }}
      />
      <Tag at={0} top={140}>EXAMPLE · 15 / 24 / 3 mm</Tag>
      {/* washer, top view */}
      <svg width={1080} height={1100} style={{ position: "absolute", top: 230, left: 0 }} viewBox="0 0 1080 1100">
        <g>
          <circle cx={400} cy={520} r={230} fill="#2b2f38" stroke="#cfd5df" strokeWidth={10}
            strokeDasharray={ringLen} strokeDashoffset={draw} />
          <circle cx={400} cy={520} r={110} fill="#0d0f16" stroke="#cfd5df" strokeWidth={8}
            opacity={interpolate(frame, [8, 16], [0, 1], clamp)} />
        </g>
        <Draw at={tID}>
          {(p) => (
            <g opacity={p > 0 ? 1 : 0}>
              <line x1={290} y1={520} x2={290 + 220 * p} y2={520} stroke={GOLD} strokeWidth={14} strokeLinecap="round" />
              <circle cx={290} cy={520} r={14} fill={GOLD} />
              <circle cx={290 + 220 * p} cy={520} r={14} fill={GOLD} />
            </g>
          )}
        </Draw>
        <Draw at={tOD}>
          {(p) => (
            <g opacity={p > 0 ? 1 : 0}>
              <line x1={170} y1={800} x2={170 + 460 * p} y2={800} stroke={RED} strokeWidth={14} strokeLinecap="round" />
              <line x1={170} y1={770} x2={170} y2={830} stroke={RED} strokeWidth={10} />
              <line x1={170 + 460 * p} y1={770} x2={170 + 460 * p} y2={830} stroke={RED} strokeWidth={10} />
            </g>
          )}
        </Draw>
        {/* side view: thickness */}
        <Draw at={tT}>
          {(p) => (
            <g opacity={p > 0 ? 1 : 0} transform={`translate(${(1 - p) * 120} 0)`}>
              <rect x={800} y={290} width={70} height={460} rx={10} fill="#2b2f38" stroke="#cfd5df" strokeWidth={8} />
              <line x1={790} y1={790} x2={790 + 90 * p} y2={790} stroke={GREEN} strokeWidth={14} strokeLinecap="round" />
            </g>
          )}
        </Draw>
      </svg>
      <Label at={tID} x={250} y={300} big="ID 15" small="THE HOLE" />
      <Label at={tOD} x={120} y={1090} big="OD 24" small="THE OUTSIDE EDGE" color={RED} />
      <Label at={tT} x={700} y={1090} big="3 mm" small="THICKNESS" color={GREEN} />
      <Captions text="ID, the hole. OD, the outside. And thickness." start={v0} dur={vd} emphasis={["ID", "OD", "THICKNESS"]} top={1480} />
      <Voice id="teach" line="l3_teach" />
      <Sfx src="sfx_whoosh_down.wav" at={0} volume={0.5} />
      <Sfx src="sfx_tick.wav" at={tID} />
      <Sfx src="sfx_tick.wav" at={tOD} />
      <Sfx src="sfx_tick.wav" at={tT} />
    </AbsoluteFill>
  );
};

// =========================================================== 4. CHASE CALLBACK
const Row: React.FC<{ at: number; k: string; need: string; have: string; ok: boolean }> = ({ at, k, need, have, ok }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr 1fr 90px",
        alignItems: "center",
        fontFamily: FONT,
        fontSize: 58,
        color: frame >= at && !ok ? RED : "#fff",
        padding: "14px 0",
        borderTop: "3px solid rgba(255,255,255,.15)",
      }}
    >
      <span>{k}</span>
      <span>{need}</span>
      <span style={{ opacity: frame >= at ? 1 : 0.25 }}>{frame >= at ? have : "?"}</span>
      <span style={{ scale: s, color: ok ? GREEN : RED, fontSize: 72 }}>{frame >= at ? (ok ? "✓" : "✗") : ""}</span>
    </div>
  );
};

export const Chase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v0 = voiceStart("chase");
  const vd = voiceFrames("chase");
  const rowsAt = v0 + Math.round(vd * 0.38);
  const rejectAt = v0 + Math.round(vd * 0.84);
  const card = spring({ frame: frame - (rowsAt - 10), fps, config: { damping: 14 } });
  const stamp = spring({ frame: frame - rejectAt, fps, config: { damping: 8, stiffness: 260 } });
  const beat = Math.abs(Math.sin((frame / fps) * Math.PI * (150 / 60)));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Shake amount={frame < rejectAt ? 22 : 6} seed="chase">
        <Punch>
          <Video src={staticFile("v3_huss_chase.mp4")} playbackRate={0.88} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </Punch>
      </Shake>
      <SpeedLines opacity={frame < rejectAt ? 0.45 : 0.1} />
      <Vignette strength={0.55 + 0.25 * beat} color="120,0,0" />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 200 }}>
        {[0, 1, 2].map((i) => (
          <Slam key={i} at={4 + i * 6} size={130} color={i === 2 ? RED : "#fff"} rotate={i % 2 ? 4 : -4}
            style={{ translate: `0 ${-beat * 14}px` }}>
            HUSS
          </Slam>
        ))}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 720,
          padding: "26px 40px",
          borderRadius: 34,
          background: "rgba(10,12,18,.88)",
          border: "4px solid rgba(255,255,255,.2)",
          translate: `0 ${interpolate(card, [0, 1], [1400, 0])}px`,
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 90px", fontFamily: FONT, fontSize: 36, color: "#aab" }}>
          <span>CHECK</span><span>JOB</span><span>SPARE</span><span />
        </div>
        <Row at={rowsAt} k="ID" need="19" have="19" ok />
        <Row at={rowsAt + 7} k="OD" need="27" have="27" ok />
        <Row at={rowsAt + 14} k="THICK" need="2" have="3" ok={false} />
      </div>
      {frame >= rejectAt && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 980 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 150,
              color: RED,
              border: `14px solid ${RED}`,
              borderRadius: 26,
              padding: "6px 40px",
              rotate: "-9deg",
              scale: interpolate(stamp, [0, 1], [3, 1]),
              opacity: interpolate(stamp, [0, 0.3], [0, 1], clamp),
              background: "rgba(0,0,0,.55)",
              textShadow: "0 0 30px rgba(255,75,58,.6)",
            }}
          >
            REJECT
          </div>
        </AbsoluteFill>
      )}
      <Captions text="Huss huss huss! Spare is three mil, job needs two. Reject it!" start={v0} dur={vd}
        emphasis={["THREE", "TWO", "REJECT"]} top={1640} />
      <Flash at={rejectAt} len={6} color={RED} />
      <Voice id="chase" line="l4_chase" />
      <Sfx src="sfx_whoosh.wav" at={0} volume={0.7} />
      <Sfx src="sfx_tick.wav" at={rowsAt} />
      <Sfx src="sfx_tick.wav" at={rowsAt + 7} />
      <Sfx src="sfx_buzz.wav" at={rowsAt + 14} volume={0.6} />
      <Sfx src="sfx_boom.wav" at={rejectAt} volume={0.9} />
    </AbsoluteFill>
  );
};

// =========================================================== 5. CTA
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v0 = voiceStart("cta");
  const cardAt = v0 + voiceFrames("cta") + 4;
  const card = spring({ frame: frame - cardAt, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ filter: `brightness(${interpolate(frame, [cardAt - 6, cardAt + 10], [0.85, 0.35], clamp)})` }}>
        <Video src={staticFile("v1_sheru_walk.mp4")} playbackRate={0.7} trimBefore={30} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      <Vignette strength={0.85} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 280 }}>
        <Slam at={v0} size={140} color="#fff">Check all</Slam>
        <Slam at={v0 + 6} size={260} color={GOLD} rotate={3}>3</Slam>
        <div
          style={{
            fontFamily: "'Nirmala UI', sans-serif",
            fontWeight: 700,
            fontSize: 54,
            color: "#fff",
            marginTop: 10,
            opacity: interpolate(frame, [v0 + 12, v0 + 20], [0, 1], clamp),
            textShadow: "0 4px 0 #000",
          }}
        >
          ಮೂರೂ ಅಳತೆ ಪರಿಶೀಲಿಸಿ
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 1120,
          padding: "40px 44px",
          borderRadius: 40,
          background: "linear-gradient(160deg, #1d2230, #11141c)",
          border: `4px solid ${GOLD}`,
          translate: `0 ${interpolate(card, [0, 1], [800, 0])}px`,
          boxShadow: "0 40px 90px rgba(0,0,0,.7)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: 92, color: "#fff", letterSpacing: -2 }}>
          Scroll<span style={{ color: GOLD }}>Proof</span>
        </div>
        <div style={{ fontFamily: "'Segoe UI', sans-serif", fontWeight: 700, fontSize: 46, color: "#d7dae2", marginTop: 6 }}>
          Learn it in the feed. Prove it on a real work order.
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 28, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT, fontSize: 38, background: GOLD, color: "#111", padding: "10px 22px", borderRadius: 999 }}>
            TRY WORK ORDER →
          </span>
          <span style={{ fontFamily: FONT, fontSize: 30, color: "#111", background: "#ffb547", padding: "12px 18px", borderRadius: 12 }}>
            DEMO JOB · ₹700/DAY
          </span>
        </div>
      </div>
      <Voice id="cta" line="l5_cta" />
      <Sfx src="sfx_whoosh_down.wav" at={0} volume={0.5} />
      <Sfx src="sfx_boom.wav" at={v0 + 6} volume={0.6} />
      <Sfx src="sfx_ding.wav" at={cardAt} volume={0.7} />
    </AbsoluteFill>
  );
};
