"""FLUX learning engine: generate the cached media pack (images -> Veo plates -> voice lines -> local SFX).

  python scripts/flux_media.py images        # Gemini image, ~12 stills (~$0.9)
  python scripts/flux_media.py video         # Veo 3.1 Lite, image-conditioned (needs ENABLE_LIVE_VIDEO_GEN=true)
  python scripts/flux_media.py tts           # Gemini TTS voice cast (cheap)
  python scripts/flux_media.py sfx           # synthesised locally, $0
  python scripts/flux_media.py ship          # compress everything into app/public/media/flux/
  python scripts/flux_media.py plan          # dry run: print what would be generated and the worst-case cost

Every paid call goes through CostLedger (guard() before image/video). Outputs are cached in outputs/flux/ and reused at $0.
Educational numbers are NEVER baked into media: the app renders every number from app/src/flux/physics.ts.
"""
from __future__ import annotations

import json
import math
import random
import subprocess
import sys
import wave
from array import array
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from google.genai import types  # noqa: E402

from core.cost_ledger import CostLedger, estimate_images, estimate_video  # noqa: E402
from core.settings import settings  # noqa: E402
from core.vertex_client import VertexClients, with_backoff  # noqa: E402

OUT = settings().outputs_dir / "flux"
OUT.mkdir(parents=True, exist_ok=True)
SHIP = ROOT / "app" / "public" / "media" / "flux"

LOOK = ("Cinematic vertical 9:16 photograph, shot on a 35mm lens, shallow depth of field, rich natural colour grade, "
        "realistic Indian setting, no text, no captions, no logos, no watermarks.")

IMAGES = [
    {"id": "dawn", "prompt": f"{LOOK} A flat concrete rooftop in Bengaluru at first light on a cold January morning. "
     "Rows of dark blue monocrystalline solar panels on a steel frame are covered in a thin layer of dew and frost, "
     "low golden sun just rising over the city haze, cool blue shadows. On the parapet wall in the foreground a white "
     "wall-mounted string inverter with a small display. Mist, quiet, ominous calm."},
    {"id": "noon", "prompt": f"{LOOK} The same kind of flat Bengaluru rooftop at blazing noon in May. Rows of dark blue "
     "solar panels under harsh white sun, visible heat shimmer above the panels, bleached sky, short hard shadows, "
     "a water tank and clothes line in the background."},
    {"id": "akka", "prompt": f"{LOOK} Portrait of a confident Indian woman master electrician in her mid forties, "
     "orange hi-vis vest over a navy work shirt, white safety helmet, insulated gloves tucked in her pocket, digital "
     "multimeter in hand, standing on a rooftop beside solar panels, warm late-afternoon light, kind but no-nonsense "
     "expression, looking straight at the camera."},
    {"id": "chotu", "prompt": f"{LOOK} Portrait of a cheerful, slightly overconfident 19-year-old Indian apprentice "
     "electrician, thin moustache, yellow helmet tilted back, grey work shirt with pens in the pocket, holding a small "
     "spiral notebook and giving a big thumbs up, standing on a rooftop with solar panels behind him, bright daylight."},
    {"id": "sharma", "prompt": f"{LOOK} Portrait of a sceptical Indian homeowner in his late fifties, grey moustache, "
     "reading glasses on his head, white kurta, arms crossed, one eyebrow raised, standing at the gate of his "
     "two-storey house in a Bengaluru residential lane, morning light."},
    {"id": "fault_mc4", "prompt": f"{LOOK} Close-up on a sunny rooftop of two black MC4 solar connectors joining DC "
     "cables under a solar panel. One connector is clearly melted, deformed and scorched brown-black with soot marks on "
     "the cable around it. The burnt connector is in the centre of the frame. Everything else looks normal."},
    {"id": "fault_shade", "prompt": f"{LOOK} Wide view of a rooftop solar array of eight dark blue panels in two rows in "
     "the afternoon. A tall black plastic water tank on a stand next to the array casts a long hard shadow that covers "
     "the two bottom-left panels completely. The remaining panels are in full sun."},
    {"id": "fault_cable", "prompt": f"{LOOK} A rooftop after rain with solar panels on a frame. Loose black DC solar "
     "cables are draped across the roof without any conduit or clips, and a section of cable with a joint lies "
     "directly in a shallow puddle of rainwater in the lower half of the frame."},
    {"id": "pay", "prompt": f"{LOOK} Night, a young Indian man at a roadside chai stall lit by a neon sign, staring at "
     "his smartphone in disbelief, the phone screen glowing on his face, a paper cup of chai in his other hand, "
     "rain-wet street reflections, moody teal and magenta light. The phone screen is not readable."},
]
IMAGES += [
    {"id": "ev_night", "prompt": f"{LOOK} Night in the covered basement parking of a Bengaluru apartment building. A white "
     "electric hatchback is plugged into a plain grey wall-mounted EV charger with a glowing green status ring, the "
     "charging cable curving to the car. Warm sodium lights, a few lit windows visible through the parking entrance, "
     "a scooter in the background. Calm, slightly ominous."},
    {"id": "ev_panel", "prompt": f"{LOOK} Close-up of a home electrical distribution board inside a dark Indian flat at "
     "night, lit only by a phone torch beam. A row of plain white miniature circuit breakers; the large main breaker "
     "on the left has its lever flipped down to OFF while the others are up. No brand names, no text on the breakers."},
]
# reference edits keep the character identical
EDITS = [
    {"id": "chotu_shock", "ref": "chotu", "prompt": "Same young man, same clothes, same rooftop and light. He now stares "
     "at his notebook in shock, mouth open, eyes wide, one hand on his helmet. Vertical 9:16, no text."},
    {"id": "sharma_happy", "ref": "sharma", "prompt": "Same man, same kurta, same gate and light. He now smiles warmly "
     "and gives an approving nod, arms relaxed. Vertical 9:16, no text."},
]

VIDEOS = [
    {"id": "v_dawn", "image": "dawn", "seconds": 8, "audio": True, "prompt":
     "Slow cinematic push-in across frosty solar panels toward the wall-mounted inverter as the first sunbeam hits the "
     "panels and steam rises off the frost. The inverter display flickers and a red warning light starts blinking "
     "rapidly, a thin wisp of smoke escapes from its vents. Sound: early-morning birds, distant traffic, a soft "
     "electrical buzz that becomes a sharp repeating alarm beep. No speech, no music."},
    {"id": "v_noon", "image": "noon", "seconds": 6, "audio": True, "prompt":
     "Slow drone pull-back over the solar panels in harsh noon sun, heat shimmer rippling above the panels, a crow "
     "lands on the frame. Sound: hot still air, cicadas, distant pressure cooker whistle. No speech, no music."},
    {"id": "v_mc4", "image": "fault_mc4", "seconds": 6, "audio": True, "prompt":
     "Macro shot. The scorched connector crackles, a small bright electric arc snaps across it, sparks jump and grey "
     "smoke curls up from the melted plastic. Sound: sharp electrical crackle and sizzle. No speech, no music."},
    {"id": "v_chotu", "image": "chotu", "seconds": 6, "audio": False, "prompt":
     "The apprentice proudly shows his thumbs up, then glances down at his notebook, his smile freezes, his eyes go "
     "wide in realisation and he slowly facepalms. Comedic timing, handheld camera."},
    {"id": "v_akka", "image": "akka", "seconds": 6, "audio": False, "prompt":
     "The electrician looks at the camera, raises her multimeter, then turns and points firmly at the solar panels "
     "behind her as a breeze moves her vest. Slow push-in, warm light."},
    {"id": "v_ev", "image": "ev_night", "seconds": 6, "audio": True, "prompt":
     "Static shot. The charger ring glows green, then the overhead lights flicker twice and the whole parking area and "
     "the windows of the building go dark at once; only the car's small interior light remains. Sound: quiet hum of "
     "lights and a distant TV, an electrical click, then silence and a dog barking far away. No speech, no music."},
    {"id": "v_pay", "image": "pay", "seconds": 6, "audio": True, "prompt":
     "The phone in his hand buzzes twice in quick succession, light pulses on his face each time, his jaw drops and he "
     "looks up from the phone in disbelief. Rain drips from the stall roof. Sound: rain, two phone vibration buzzes "
     "with notification chimes, street ambience. No speech, no music."},
]

# Voice cast. Gemini TTS prebuilt voices. Text is the exact line; no stage directions are spoken.
VOICES = {"akka": "Kore", "chotu": "Puck", "sharma": "Charon", "narrator": "Fenrir"}
LINES = [
    ("cold_open", "narrator", "Six forty seven A.M. Eight degrees. A brand new inverter just died. It was installed in May, and the noon test read five hundred twenty three volts. Totally safe. So what killed it?"),
    ("bet_lock", "narrator", "Bet locked. Now go find out."),
    ("akka_intro", "akka", "Listen. Cold panels push higher voltage. The coldest sunrise of the year is the most dangerous moment for your inverter. Not the hottest noon."),
    ("akka_rule", "akka", "Take the coldest morning on record. Work out each panel's voltage there. Divide the inverter's maximum by that, and always round down."),
    ("akka_heat", "akka", "Heat does the opposite. On a hot afternoon the voltage sags. Too few panels and the inverter just falls asleep."),
    ("akka_win", "akka", "That is how a technician thinks. You checked the worst case, not the nice case."),
    ("chotu_brag", "chotu", "Boss, easy calculation! Six hundred divided by forty nine point six. Twelve panels. Done!"),
    ("chotu_oops", "chotu", "Arre! I used the noon number. On a cold morning that string will cross six hundred volts!"),
    ("chotu_thanks", "chotu", "Okay okay. Eleven panels. Round down. I will write it on my hand."),
    ("sharma_1", "sharma", "My neighbour put twelve panels on one string. Why are you giving me only eleven? Are you cheating me?"),
    ("sharma_2", "sharma", "But it is Bengaluru. It never gets cold here!"),
    ("sharma_3", "sharma", "So will I lose power because of this?"),
    ("sharma_win", "sharma", "Hmm. Nobody explained it like that before. Okay, eleven it is."),
    ("sharma_lose", "sharma", "I think I will ask somebody else."),
    ("reel_callback", "narrator", "Last time this one got you. Rematch."),
    ("reel_cold", "akka", "Cold panel, higher voltage. Say it with me."),
    ("reel_round", "akka", "Eleven point six panels is eleven panels. You cannot install point six of a panel, and you cannot round up a safety limit."),
    ("reel_series", "akka", "In series, volts add up and current stays the same. In parallel, current adds up and volts stay the same."),
    ("ev_open", "narrator", "Nine oh four P.M. Dinner is cooking, the AC is on, and a brand new car charger is pulling thirty two amps. The whole flat just went dark."),
    ("ev_rule", "akka", "Add up every load that can run at the same time. If the total crosses the main breaker, something has to give. A smaller fixed charger current, or a charger that watches the house and backs off."),
    ("ev_balance", "akka", "Load balancing means the charger measures the house and only takes what is left. Dinner first, car second."),
    ("pay_open", "narrator", "Eleven forty one P.M. Rahul paid four hundred ninety nine rupees for a train ticket. His bank charged him twice."),
    ("pay_rule", "akka", "The network will drop replies. Your app will retry. So every payment request carries one idempotency key, and the server remembers it."),
]


def clients() -> tuple[VertexClients, CostLedger]:
    ledger = CostLedger("flux-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    vc = VertexClients(ledger)
    vc.probe(["flux_image", "flux_video", "flux_tts", "flux_qa"])
    print("resolved:", vc.resolved, "| ledger spent so far: $%.4f / cap $%.2f" % (ledger.spent_total(), ledger.budget))
    return vc, ledger


def make_images(vc: VertexClients) -> None:
    for spec in IMAGES + EDITS:
        out = OUT / f"{spec['id']}.png"
        if out.exists():
            print(f"  {spec['id']}: cached")
            continue
        ref = (OUT / f"{spec['ref']}.png").read_bytes() if "ref" in spec else None
        try:
            r = vc.generate_image("flux_image", spec["prompt"], out, test=f"flux_img_{spec['id']}", reference=ref)
            print(f"  {spec['id']}: {r['latency_ms'] / 1000:.1f}s ${r['usd']:.3f} via {r['model']}", flush=True)
        except Exception as e:
            print(f"  {spec['id']}: FAILED {type(e).__name__}: {str(e)[:240]}", flush=True)


def make_video(vc: VertexClients, only: set[str] | None = None) -> None:
    for spec in VIDEOS:
        if only and spec["id"] not in only:
            continue
        out = OUT / f"{spec['id']}.mp4"
        if out.exists():
            print(f"  {spec['id']}: cached")
            continue
        img = OUT / f"{spec['image']}.png"
        if not img.exists():
            print(f"  {spec['id']}: skipped, missing still {img.name}")
            continue
        print(f"  {spec['id']}: Veo generating {spec['seconds']}s...", flush=True)
        try:
            r = vc.generate_video("flux_video", spec["prompt"], out, test=f"flux_vid_{spec['id']}",
                                  seconds=spec["seconds"], audio=spec["audio"], image=_png_for_veo(img))
            print(f"  {spec['id']}: {r['latency_ms'] / 1000:.0f}s wall, ${r['usd']:.3f}", flush=True)
        except Exception as e:
            print(f"  {spec['id']}: FAILED {type(e).__name__}: {str(e)[:300]}", flush=True)


def _png_for_veo(img: Path) -> bytes:
    # Veo wants a modest PNG: re-encode to 720x1280.
    tmp = OUT / f"_{img.stem}_720.png"
    if not tmp.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(img), "-vf",
                        "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280", str(tmp)], check=True)
    return tmp.read_bytes()


def _wav_from_pcm(pcm: bytes, path: Path, rate: int = 24000) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def transcribe(vc: VertexClients, path: Path) -> str:
    mid = vc.model("flux_qa")
    with vc.ledger.track(f"flux_tts_qa_{path.stem}", mid, "text") as rec:
        r = vc.text_client.models.generate_content(
            model=mid, contents=[types.Part.from_bytes(data=path.read_bytes(), mime_type="audio/wav"),
                                 "Transcribe verbatim. Output only the spoken words."])
        rec.input_tokens = r.usage_metadata.prompt_token_count or 0
        rec.output_tokens = r.usage_metadata.candidates_token_count or 0
    return (r.text or "").strip().replace("\n", " ")


def make_tts(vc: VertexClients) -> None:
    report = {}
    rp = OUT / "tts_report.json"
    if rp.exists():
        report = json.loads(rp.read_text(encoding="utf-8"))
    for lid, who, text in LINES:
        out = OUT / f"vo_{lid}.wav"
        if out.exists():
            continue
        mid = vc.model("flux_tts")
        prompt = f"Read in a warm Indian English accent, natural pace: {text}" if who != "narrator" else \
            f"Read like a tense documentary narrator with an Indian English accent: {text}"
        for take in range(1, 4):
            if take == 3:
                prompt = text  # direction keeps leaking: send the bare line
            with vc.ledger.track(f"flux_tts_{lid}_t{take}", mid, "text") as rec:
                resp = with_backoff(lambda: vc.text_client.models.generate_content(
                    model=mid, contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICES[who]))))))
                part = resp.candidates[0].content.parts[0]
                u = resp.usage_metadata
                rec.input_tokens, rec.output_tokens = u.prompt_token_count or 0, u.candidates_token_count or 0
                mime = part.inline_data.mime_type or ""
                rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
                if "wav" in mime:
                    out.write_bytes(part.inline_data.data)
                else:
                    _wav_from_pcm(part.inline_data.data, out, rate)
            heard = transcribe(vc, out)
            leaked = any(k in heard.lower() for k in ("accent", "narrator", "read in", "natural pace", "documentary"))
            print(f"  {lid} take {take}: '{heard[:90]}'{'  <- leak, retake' if leaked else ''}", flush=True)
            if not leaked:
                report[lid] = {"voice": VOICES[who], "who": who, "text": text, "heard": heard, "take": take, "model": mid}
                break
            out.unlink()
        rp.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")


# ----------------------------------------------------------------------------- local SFX ($0)
SR = 44100


def _write(path: Path, samples: list[float]) -> None:
    buf = array("h", (int(max(-1, min(1, s)) * 30000) for s in samples))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(buf.tobytes())


def make_sfx() -> None:
    rnd = random.Random(7)
    n = lambda d: int(SR * d)  # noqa: E731

    def env(i, total, a=0.005, r=0.3):
        t = i / SR
        d = total / SR
        return min(1, t / a) * max(0.0, min(1, (d - t) / r))

    sfx = {}
    # zap: noisy descending saw burst
    L = n(0.35)
    sfx["zap"] = [((2 * ((i * (900 - 700 * i / L) / SR) % 1) - 1) * 0.5 + rnd.uniform(-.5, .5) * 0.6) * env(i, L, r=0.25) for i in range(L)]
    # alarm: two-tone beeps
    L = n(1.2)
    sfx["alarm"] = [(0.45 * math.copysign(1, math.sin(2 * math.pi * (2800 if (i // n(0.15)) % 2 else 2200) * i / SR))) * (1 if (i // n(0.15)) % 4 != 3 else 0) * env(i, L, r=0.05) for i in range(L)]
    # powerup: rising sine sweep with shimmer
    L = n(0.9)
    ph = 0.0
    out = []
    for i in range(L):
        f = 180 + 900 * (i / L) ** 2
        ph += 2 * math.pi * f / SR
        out.append((0.5 * math.sin(ph) + 0.15 * math.sin(3 * ph)) * env(i, L, a=0.05, r=0.2))
    sfx["powerup"] = out
    # combo: bright arpeggio
    L = n(0.6)
    notes = [880, 1108.7, 1318.5, 1760]
    sfx["combo"] = [0.4 * math.sin(2 * math.pi * notes[min(3, int(4 * i / L))] * i / SR) * env(i, L, r=0.15) for i in range(L)]
    # wrong: low double thud
    L = n(0.5)
    sfx["wrong"] = [0.6 * math.sin(2 * math.pi * (110 - 40 * (i % n(0.25)) / n(0.25)) * i / SR) * (1 - (i % n(0.25)) / n(0.25)) for i in range(L)]
    # frost: crackle
    L = n(0.8)
    sfx["frost"] = [(rnd.uniform(-1, 1) if rnd.random() < 0.04 else 0) * 0.8 * env(i, L, a=0.1, r=0.4) for i in range(L)]
    # hum: 50 Hz mains hum + harmonics (loopable 2 s)
    L = n(2.0)
    sfx["hum"] = [0.18 * math.sin(2 * math.pi * 50 * i / SR) + 0.1 * math.sin(2 * math.pi * 100 * i / SR) + 0.05 * math.sin(2 * math.pi * 150 * i / SR) for i in range(L)]
    for k, s in sfx.items():
        p = OUT / f"sfx_{k}.wav"
        if not p.exists():
            _write(p, s)
            print("  sfx", k)


# ----------------------------------------------------------------------------- ship
def ship() -> None:
    SHIP.mkdir(parents=True, exist_ok=True)
    manifest = {"generated": datetime.now().isoformat(timespec="seconds"), "files": {}}
    for p in sorted(OUT.glob("*.png")):
        if p.stem.startswith("_"):
            continue
        dst = SHIP / f"{p.stem}.webp"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-vf", "scale=720:-2", "-quality", "78",
                        str(dst)], check=True)
        manifest["files"][dst.name] = dst.stat().st_size
    for p in sorted(OUT.glob("*.mp4")):
        dst = SHIP / p.name
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-vf", "scale=540:-2", "-c:v", "libx264",
                        "-crf", "28", "-preset", "slow", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "64k",
                        str(dst)], check=True)
        manifest["files"][dst.name] = dst.stat().st_size
    for p in sorted(OUT.glob("*.wav")):
        dst = SHIP / f"{p.stem}.m4a"
        af = "loudnorm=I=-16:TP=-1.5" if p.stem.startswith("vo_") else "anull"
        if p.stem.startswith("vo_"):
            af = "silenceremove=start_periods=1:start_threshold=-40dB:stop_periods=-1:stop_duration=0.3:stop_threshold=-40dB,atempo=1.06," + af
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-af", af, "-c:a", "aac", "-b:a", "64k",
                        str(dst)], check=True)
        manifest["files"][dst.name] = dst.stat().st_size
    tts = OUT / "tts_report.json"
    if tts.exists():
        manifest["voice"] = json.loads(tts.read_text(encoding="utf-8"))
    (SHIP / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
    total = sum(manifest["files"].values())
    print(f"shipped {len(manifest['files'])} files, {total / 1e6:.2f} MB -> {SHIP}")


def plan() -> None:
    img_new = [s["id"] for s in IMAGES + EDITS if not (OUT / f"{s['id']}.png").exists()]
    vid_new = [s for s in VIDEOS if not (OUT / f"{s['id']}.mp4").exists()]
    img_usd = estimate_images("gemini-3.1-flash-image", len(img_new))
    vid_usd = sum(estimate_video("veo-3.1-lite-generate-001", s["seconds"], s["audio"]) for s in vid_new)
    print(f"images to make: {len(img_new)} (${img_usd:.2f})  videos: {len(vid_new)} (${vid_usd:.2f})  "
          f"tts lines: {len(LINES)} (~$0.10)")
    led = CostLedger("flux-plan")
    print(f"ledger spent ${led.spent_total():.4f}; cap ${led.budget:.2f}")


def main() -> int:
    what = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if what == "plan":
        plan()
        return 0
    if what == "sfx":
        make_sfx()
        return 0
    if what == "ship":
        ship()
        return 0
    vc, _ = clients()
    if what == "images":
        make_images(vc)
    elif what == "video":
        make_video(vc, set(sys.argv[2:]) or None)
    elif what == "tts":
        make_tts(vc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
