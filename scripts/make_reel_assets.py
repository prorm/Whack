"""Generate the layers for the flagship CAPABLE reel (Tier B: cached plates + motion graphics).

  python scripts/make_reel_assets.py video   # 3x 4 s Veo 3.1 Lite, silent, image-conditioned (~$0.36). Needs ENABLE_LIVE_VIDEO_GEN=true
  python scripts/make_reel_assets.py tts     # performed voice lines via Gemini TTS (fallback: edge-tts)
  python scripts/make_reel_assets.py audio   # music bed + SFX synthesised locally (free, no downloads)
  python scripts/make_reel_assets.py all

Everything lands in outputs/reel_assets/ and is cached: re-running skips files that exist.
"""
from __future__ import annotations

import asyncio
import json
import math
import random
import struct
import subprocess
import sys
import time
import wave
from array import array
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from google.genai import types  # noqa: E402

from core.cost_ledger import CostLedger  # noqa: E402
from core.settings import settings  # noqa: E402
from core.vertex_client import VertexClients, with_backoff  # noqa: E402

OUT = settings().outputs_dir / "reel_assets"
OUT.mkdir(parents=True, exist_ok=True)
ASSETS = settings().outputs_dir / "assets"
SR = 44100

# ----------------------------------------------------------------------------- script
LINES = [
    {"id": "l1_hook", "voice": "Charon", "edge": "en-IN-PrabhatNeural",
     "style": "",
     "text": "Wrong washer, guru? Scene beda."},
    {"id": "l2_three", "voice": "Charon", "edge": "en-IN-PrabhatNeural",
     "style": "",
     "text": "Every washer has three numbers."},
    {"id": "l3_teach", "voice": "Charon", "edge": "en-IN-PrabhatNeural",
     "style": "",
     "text": "I.D., the hole. O.D., the outside. And thickness."},
    {"id": "l4_chase", "voice": "Fenrir", "edge": "en-IN-NeerjaNeural",
     "style": "",
     "text": "Huss, huss, huss! Spare is three mil, job needs two. Reject it!"},
    {"id": "l5_cta", "voice": "Charon", "edge": "en-IN-PrabhatNeural",
     "style": "",
     "text": "Check all three. Then prove it."},
]

PLATES = [
    {"id": "v1_sheru_walk", "image": ASSETS / "sheru_bhai_anchor.png",
     "prompt": "The golden lion boss in the white three-piece suit walks slowly toward the camera in dramatic slow motion "
               "through the marble mansion foyer, jacket swaying, dust motes drifting in warm sunbeams, low hero angle, "
               "camera slowly dollies back, cinematic lighting, vertical 9:16. No text, no logos."},
    {"id": "v2_sheru_aviators", "image": ASSETS / "sheru_bhai_washers.png",
     "prompt": "The golden lion boss slowly lowers his gold aviator sunglasses with one finger and stares into the camera, "
               "unimpressed, holding two small rubber washers in the other hand, slow push-in, shallow depth of field, "
               "warm mansion bokeh, vertical 9:16. No text, no logos."},
    {"id": "v3_huss_chase", "image": ASSETS / "roblox_huss_anchor.png",
     "prompt": "The blocky cartoon avatar in the orange hoodie sprints toward the camera in panic while the giant red slime "
               "monster with glowing eyes chases close behind, fast follow camera, heavy camera shake, motion blur, dust "
               "kicking up, bright toy-like 3D cartoon valley, vertical 9:16. No text, no logos."},
]


def clients() -> tuple[VertexClients, CostLedger]:
    ledger = CostLedger("reel-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    vc = VertexClients(ledger)
    vc.probe(["video_lite", "tts"])
    return vc, ledger


# ----------------------------------------------------------------------------- video
def make_video(vc: VertexClients) -> list[dict]:
    res = []
    for p in PLATES:
        out = OUT / f"{p['id']}.mp4"
        if out.exists():
            print(f"  {p['id']}: cached")
            res.append({"id": p["id"], "cached": True})
            continue
        print(f"  {p['id']}: Veo generating...", flush=True)
        try:
            r = vc.generate_video("video_lite", p["prompt"], out, test=f"reel_{p['id']}", seconds=4, audio=False,
                                  image=p["image"].read_bytes())
            print(f"  {p['id']}: {r['latency_ms'] / 1000:.1f}s, {r['bytes'] / 1e6:.2f} MB, ${r['usd']:.3f}", flush=True)
            res.append({"id": p["id"], **r})
        except Exception as e:
            print(f"  {p['id']}: FAILED {type(e).__name__}: {str(e)[:300]}", flush=True)
            res.append({"id": p["id"], "error": str(e)[:300]})
    return res


# ----------------------------------------------------------------------------- TTS
def _wav_from_pcm(pcm: bytes, path: Path, rate: int = 24000) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def transcribe(vc: VertexClients, path: Path) -> str:
    """QA every voice take: what did the model actually say?"""
    mid = "gemini-3.5-flash-lite"
    with vc.ledger.track(f"reel_tts_qa_{path.stem}", mid, "text") as rec:
        r = vc.text_client.models.generate_content(
            model=mid, contents=[types.Part.from_bytes(data=path.read_bytes(), mime_type="audio/wav"),
                                 "Transcribe verbatim. Output only the spoken words."])
        rec.input_tokens = r.usage_metadata.prompt_token_count or 0
        rec.output_tokens = r.usage_metadata.candidates_token_count or 0
    return (r.text or "").strip().replace("\n", " ")


def make_tts(vc: VertexClients) -> list[dict]:
    res = []
    for ln in LINES:
        out = OUT / f"{ln['id']}.wav"
        if out.exists():
            res.append({"id": ln["id"], "cached": True})
            continue
        engine = "gemini"
        try:
            mid = vc.model("tts")
            for take in range(1, 5):
                with vc.ledger.track(f"reel_tts_{ln['id']}_take{take}", mid, "text") as rec:
                    resp = with_backoff(lambda: vc.text_client.models.generate_content(
                        model=mid, contents=(f"{ln['style']}: \"{ln['text']}\"" if ln["style"] else ln["text"]),
                        config=types.GenerateContentConfig(
                            response_modalities=["AUDIO"],
                            speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=ln["voice"]))))))
                    part = resp.candidates[0].content.parts[0]
                    u = resp.usage_metadata
                    rec.input_tokens, rec.output_tokens = u.prompt_token_count or 0, u.candidates_token_count or 0
                    mime = part.inline_data.mime_type or ""
                    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
                    if "wav" in mime:
                        out.write_bytes(part.inline_data.data)
                    else:
                        _wav_from_pcm(part.inline_data.data, out, rate)
                    rec.extra.update(mime=mime)
                heard = transcribe(vc, out)
                leaked = any(k in heard.lower() for k in ("say ", "voice", "panic", "punchy", "smug", "quick"))
                print(f"    take {take}: heard '{heard}'{'  <- direction leaked, retake' if leaked else ''}", flush=True)
                if not leaked:
                    engine = f"gemini take {take}"
                    break
            else:
                raise RuntimeError("direction kept leaking into the audio")
        except Exception as e:
            engine = f"edge-tts (gemini failed: {str(e)[:120]})"
            import edge_tts
            mp3 = out.with_suffix(".mp3")
            asyncio.run(edge_tts.Communicate(ln["text"], ln["edge"], rate="+5%").save(str(mp3)))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "24000", "-ac", "1", str(out)], check=True)
        # trim leading/trailing silence so the edit is tight
        tight = out.with_name(out.stem + "_t.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(out), "-af",
                        # trim ends, shrink every internal pause to <=0.22 s, then a gentle 1.08x pace-up (pitch kept)
                        "silenceremove=start_periods=1:start_threshold=-40dB:stop_periods=-1:stop_duration=0.22:stop_threshold=-40dB,"
                        "atempo=1.12,loudnorm=I=-16:TP=-1.5",
                        "-ar", "24000", str(tight)], check=True)
        tight.replace(out)
        print(f"  {ln['id']}: {engine}, {wav_seconds(out):.2f}s", flush=True)
        res.append({"id": ln["id"], "engine": engine})
    return res


def wav_seconds(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


# ----------------------------------------------------------------------------- local sound design
def _write(path: Path, buf: array) -> None:
    peak = max(1e-9, max(abs(x) for x in buf))
    g = 0.89 / peak
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * g)) * 32767)) for x in buf))


def _add(buf: array, start_s: float, samples: list[float], gain: float = 1.0) -> None:
    i0 = int(start_s * SR)
    for i, s in enumerate(samples):
        j = i0 + i
        if 0 <= j < len(buf):
            buf[j] += s * gain


def kick(dur=0.45, f0=140, f1=42):
    n = int(dur * SR)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = f1 + (f0 - f1) * math.exp(-t * 28)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * math.exp(-t * 7) + 0.3 * math.tanh(3 * math.sin(ph)) * math.exp(-t * 18))
    return out


def snare(dur=0.25, rnd=random.Random(1)):
    n = int(dur * SR)
    return [(rnd.uniform(-1, 1) * 0.8 + 0.4 * math.sin(2 * math.pi * 190 * i / SR)) * math.exp(-i / SR * 22) for i in range(n)]


def hat(dur=0.06, rnd=random.Random(2)):
    n = int(dur * SR)
    prev, out = 0.0, []
    for i in range(n):
        x = rnd.uniform(-1, 1)
        out.append((x - prev) * math.exp(-i / SR * 70))  # crude high-pass
        prev = x
    return out


def boom(dur=1.6):
    n = int(dur * SR)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = 30 + 90 * math.exp(-t * 9)
        ph += 2 * math.pi * f / SR
        out.append(math.tanh(2.2 * math.sin(ph)) * math.exp(-t * 2.4))
    return out


def whoosh(dur=0.55, rising=True, rnd=random.Random(3)):
    n = int(dur * SR)
    out, lp = [], 0.0
    for i in range(n):
        p = i / n
        env = math.sin(math.pi * p) ** 2
        a = 0.02 + 0.5 * (p if rising else 1 - p)  # one-pole low-pass sweep
        lp += a * (rnd.uniform(-1, 1) - lp)
        out.append(lp * env)
    return out


def riser(dur=1.0, rnd=random.Random(4)):
    n = int(dur * SR)
    out, ph = [], 0.0
    for i in range(n):
        p = i / n
        ph += 2 * math.pi * (200 + 1400 * p * p) / SR
        out.append((0.5 * math.sin(ph) + 0.5 * rnd.uniform(-1, 1) * p) * p ** 1.5)
    return out


def tick(freq=1800, dur=0.09):
    n = int(dur * SR)
    return [math.sin(2 * math.pi * freq * i / SR) * math.exp(-i / SR * 60) for i in range(n)]


def ding(dur=1.2):
    n = int(dur * SR)
    return [sum(math.sin(2 * math.pi * f * i / SR) * a for f, a in ((1318, 1), (2637, .35), (3951, .15))) * math.exp(-i / SR * 3.5)
            for i in range(n)]


def buzz(dur=0.35):
    n = int(dur * SR)
    return [(1 if math.sin(2 * math.pi * 110 * i / SR) > 0 else -1) * 0.6 * (1 - i / n) for i in range(n)]


def bass_note(freq, dur):
    n = int(dur * SR)
    return [math.tanh(1.6 * math.sin(2 * math.pi * freq * i / SR)) * min(1, i / 400) * math.exp(-i / SR * 1.2) for i in range(n)]


def music_bed(total_s: float, chase: tuple[float, float]) -> array:
    """Boss groove (78 bpm) -> chase (150 bpm) -> boss groove. Original, synthesised here."""
    buf = array("f", [0.0]) * int(total_s * SR)
    k, s, h = kick(), snare(), hat()
    beat = 60 / 78
    t = 0.0
    while t < chase[0] - 0.05:  # boss section: heavy and slow
        _add(buf, t, k, 0.9)
        _add(buf, t + beat, s, 0.45)
        _add(buf, t + beat * 1.5, k, 0.5)
        _add(buf, t, bass_note(41.2, beat * 1.9), 0.35)
        for x in range(4):
            _add(buf, t + x * beat / 2, h, 0.18)
        t += beat * 2
    cb = 60 / 150
    t = chase[0]
    while t < chase[1] - 0.05:  # chase: driving 8ths
        _add(buf, t, kick(0.2, 160, 55), 0.8)
        _add(buf, t + cb, s, 0.5)
        for x in range(4):
            _add(buf, t + x * cb / 2, h, 0.25)
        _add(buf, t, bass_note(55.0 if int(t / cb) % 4 < 2 else 61.7, cb * 0.9), 0.3)
        t += cb * 2
    t = chase[1]
    while t < total_s - 0.4:
        _add(buf, t, k, 0.8)
        _add(buf, t + beat, s, 0.4)
        _add(buf, t, bass_note(41.2, beat * 1.9), 0.35)
        t += beat * 2
    return buf


def make_audio(timeline: dict) -> None:
    sfx = {"sfx_boom": boom(), "sfx_whoosh": whoosh(), "sfx_whoosh_down": whoosh(rising=False), "sfx_riser": riser(),
           "sfx_tick": tick(), "sfx_ding": ding(), "sfx_buzz": buzz()}
    for name, samples in sfx.items():
        _write(OUT / f"{name}.wav", array("f", samples))
    t0 = time.perf_counter()
    _write(OUT / "music_bed.wav", music_bed(timeline["total_s"], (timeline["chase_start_s"], timeline["chase_end_s"])))
    print(f"  music bed + {len(sfx)} SFX synthesised in {time.perf_counter() - t0:.1f}s")


# ----------------------------------------------------------------------------- timeline
def build_timeline() -> dict:
    """Scene timing follows the measured voice lines, so the edit is always tight."""
    fps = 30
    d = {ln["id"]: (wav_seconds(OUT / f"{ln['id']}.wav") if (OUT / f"{ln['id']}.wav").exists() else 2.0) for ln in LINES}
    scenes = [
        {"id": "hook", "line": "l1_hook", "pad_before": 0.5, "min": 3.4},
        {"id": "three", "line": "l2_three", "pad_before": 0.15, "min": 2.6},
        {"id": "teach", "line": "l3_teach", "pad_before": 0.2, "min": 5.2},
        {"id": "chase", "line": "l4_chase", "pad_before": 0.25, "min": 4.6},
        {"id": "cta", "line": "l5_cta", "pad_before": 0.3, "min": 4.2},
    ]
    t = 0.0
    for s in scenes:
        s["voice_dur_s"] = round(d[s["line"]], 3)
        dur = max(s["min"], s["pad_before"] + d[s["line"]] + 0.45)
        s["from"] = round(t * fps)
        s["frames"] = round(dur * fps)
        t += dur
    tl = {"fps": fps, "total_frames": round(t * fps), "total_s": round(t, 3), "scenes": scenes,
          "chase_start_s": scenes[3]["from"] / fps, "chase_end_s": (scenes[3]["from"] + scenes[3]["frames"]) / fps,
          "lines": {ln["id"]: ln["text"] for ln in LINES}}
    (OUT / "timeline.json").write_text(json.dumps(tl, indent=2), encoding="utf-8")
    return tl


def main() -> int:
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    vc = None
    if what in ("video", "tts", "all"):
        vc, ledger = clients()
    if what in ("tts", "all"):
        print("TTS:")
        make_tts(vc)
    if what in ("video", "all"):
        print("Veo plates:")
        make_video(vc)
    tl = build_timeline()
    if what in ("audio", "all", "tts"):
        print("Sound design:")
        make_audio(tl)
    print(f"Timeline: {tl['total_s']}s, {tl['total_frames']} frames -> {OUT / 'timeline.json'}")
    if vc:
        print(f"Spent this run ${ledger.spent_this_run():.4f}; cumulative ${ledger.spent_total():.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
