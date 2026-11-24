"""Narration for FLUX Learn lessons: Google Cloud TTS Chirp3-HD, one request per line, cached by (voice, text).

  python scripts/course_tts.py plan    # chars + worst-case cost
  python scripts/course_tts.py run     # synthesise -> app/public/media/learn/vo_<id>.m4a + app/src/flux/learn/vo.json
  python scripts/course_tts.py music   # loop a Lyria bed (from the FACELESS AI workspace) into app/public/media/learn/bed.m4a

Captions are the script text; audio durations go to vo.json so the player can time karaoke captions.
Every call is logged to the CostLedger; guard() runs first.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import subprocess
import sys
import wave
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.cost_ledger import CostLedger  # noqa: E402

SCRIPT = ROOT / "app" / "src" / "flux" / "learn" / "script.json"
OUT = ROOT / "outputs" / "learn_tts"
SHIP = ROOT / "app" / "public" / "media" / "learn"
USD_PER_CHAR = 30 / 1_000_000  # Chirp3-HD list price
MUSIC = Path("D:/FACELESS AI/audio_samples/music/track_1_warm_rhodes_lofi.wav")

S = json.loads(SCRIPT.read_text(encoding="utf-8"))
SPOKEN = {"A.M.": "A M"}


def spoken(text: str) -> str:
    for a, b in SPOKEN.items():
        text = text.replace(a, b)
    return text


def plan() -> None:
    n = sum(len(spoken(l["text"])) for l in S["lines"])
    print(f"{len(S['lines'])} lines, {n} chars, worst case ${n * USD_PER_CHAR:.3f}")


def synth(headers: dict, voice: str, text: str) -> bytes:
    import requests
    body = {"input": {"text": text}, "voice": {"languageCode": voice[:5], "name": voice},
            "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000}}
    r = requests.post("https://texttospeech.googleapis.com/v1/text:synthesize", headers=headers, json=body, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"{r.status_code} {r.text[:200]}")
    return base64.b64decode(r.json()["audioContent"])


def run() -> None:
    import google.auth
    from google.auth.transport.requests import Request
    os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", str(ROOT / "google_credentials.json"))
    creds, proj = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(Request())
    headers = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json", "x-goog-user-project": proj}
    OUT.mkdir(parents=True, exist_ok=True)
    SHIP.mkdir(parents=True, exist_ok=True)
    ledger = CostLedger("learn-tts-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    todo = []
    for l in S["lines"]:
        key = hashlib.sha1(f"{S['voice']}|{spoken(l['text'])}".encode()).hexdigest()[:12]
        if not (OUT / f"{key}.wav").exists():
            todo.append(l)
    ledger.guard(sum(len(spoken(l["text"])) for l in todo) * USD_PER_CHAR, f"{len(todo)} TTS lines")
    voice = S["voice"]
    durations = {}
    for l in S["lines"]:
        text = spoken(l["text"])
        key = hashlib.sha1(f"{S['voice']}|{text}".encode()).hexdigest()[:12]
        wav = OUT / f"{key}.wav"
        if not wav.exists():
            with ledger.track(f"learn_tts_{l['id']}", voice, "audio") as rec:
                try:
                    data = synth(headers, voice, text)
                except RuntimeError as e:  # locale voice missing: fall back once, for every line
                    print("fallback:", e)
                    voice = S["fallbackVoice"]
                    data = synth(headers, voice, text)
                rec.usd = len(text) * USD_PER_CHAR
                rec.extra["chars"] = len(text)
            wav.write_bytes(data)
        with wave.open(str(wav)) as w:
            durations[l["id"]] = round(w.getnframes() / w.getframerate(), 3)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        "-c:a", "aac", "-b:a", "64k", str(SHIP / f"vo_{l['id']}.m4a")], check=True)
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(SHIP / f"vo_{l['id']}.m4a")], capture_output=True, text=True)
        durations[l["id"]] = round(float(out.stdout.strip()), 3)
        print(l["id"], durations[l["id"]], "s", flush=True)
    (SCRIPT.parent / "vo.json").write_text(json.dumps({"voice": voice, "durations": durations}, indent=1), encoding="utf-8")
    print("spent this run $%.4f, lifetime $%.4f" % (ledger.spent_this_run(), ledger.spent_total()))


def music() -> None:
    SHIP.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(MUSIC), "-af", "afade=t=in:d=1.5,volume=0.9", "-c:a", "aac", "-b:a", "96k", str(SHIP / "bed.m4a")], check=True)
    print("bed.m4a", (SHIP / "bed.m4a").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    {"plan": plan, "run": run, "music": music}[sys.argv[1] if len(sys.argv) > 1 else "plan"]()
