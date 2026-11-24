"""Motion reel plates: a few Veo clips used as BACKGROUND PLATES behind code-driven motion graphics.

Each plate is a physical analogy that motion graphics alone cannot sell as well (real water, real surface tension).
Plates never contain text or numbers: every number in a reel is drawn on top by app/src/flux/motion/*.tsx from
physics.ts. Usage:

  python scripts/motion_plates.py plan
  ENABLE_LIVE_VIDEO_GEN=true python scripts/motion_plates.py video
  python scripts/motion_plates.py ship      # ffmpeg-compress into app/public/media/motion/

Every paid call goes through CostLedger.guard(); outputs are cached in outputs/motion/ and reused at $0.
"""
from __future__ import annotations

import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.cost_ledger import CostLedger, estimate_video  # noqa: E402
from core.settings import settings  # noqa: E402
from core.vertex_client import VertexClients  # noqa: E402

OUT = settings().outputs_dir / "motion"
OUT.mkdir(parents=True, exist_ok=True)
SHIP = ROOT / "app" / "public" / "media" / "motion"

STYLE = ("Vertical 9:16, photoreal, cinematic macro, high contrast, dark background, no text, no captions, "
         "no numbers, no logos, no watermarks, no faces.")
PLATES = [
    {"id": "p_hose", "seconds": 6, "audio": True, "prompt":
     f"{STYLE} Bright daylight on a dark concrete rooftop. Clear water gushes strongly out of the open end of a long "
     "green garden hose lying across the frame. A heavy work boot steps onto the middle of the hose and pinches it "
     "flat: the stream at the open end instantly collapses to a weak dribble. The boot lifts and the strong flow "
     "surges back. Sound: strong splashing water, then a thin dribble, then the gush returns."},
    {"id": "p_overflow", "seconds": 6, "audio": True, "prompt":
     f"{STYLE} Extreme macro slow motion of a clear drinking glass filled with water exactly to the brim, the surface "
     "bulging just above the rim from surface tension, cool blue rim light against pure black. Single drops fall into "
     "the centre one at a time, each making the bulge tremble. The last drop breaks the surface and water spills over "
     "the rim and streams down the outside of the glass. Sound: soft drip plinks, then a gentle splash."},
]


def plan() -> None:
    new = [p for p in PLATES if not (OUT / f"{p['id']}.mp4").exists()]
    usd = sum(estimate_video("veo-3.1-lite-generate-001", p["seconds"], p["audio"]) for p in new)
    print(f"{len(new)} new plates, worst case ${usd:.2f}; cached: {len(PLATES) - len(new)}")


def video() -> None:
    ledger = CostLedger("motion-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    vc = VertexClients(ledger)
    vc.probe(["flux_video"])
    print("spent so far $%.4f / cap $%.2f" % (ledger.spent_total(), ledger.budget), flush=True)
    for p in PLATES:
        out = OUT / f"{p['id']}.mp4"
        if out.exists():
            print(f"  {p['id']}: cached")
            continue
        print(f"  {p['id']}: Veo generating {p['seconds']}s...", flush=True)
        try:
            r = vc.generate_video("flux_video", p["prompt"], out, test=f"motion_plate_{p['id']}",
                                  seconds=p["seconds"], audio=p["audio"])
            print(f"  {p['id']}: {r['latency_ms'] / 1000:.0f}s wall, ${r['usd']:.3f}", flush=True)
        except Exception as e:  # keep going: a missing plate falls back to the pure motion-graphics background
            print(f"  {p['id']}: FAILED {type(e).__name__}: {str(e)[:300]}", flush=True)


def ship() -> None:
    SHIP.mkdir(parents=True, exist_ok=True)
    for p in PLATES:
        src = OUT / f"{p['id']}.mp4"
        if not src.exists():
            print(f"  {p['id']}: missing, skipped")
            continue
        dst = SHIP / f"{p['id']}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", "scale=540:-2",
                        "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-movflags", "+faststart",
                        "-c:a", "aac", "-b:a", "64k", str(dst)], check=True)
        poster = SHIP / f"{p['id']}.webp"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", str(src), "-frames:v", "1",
                        "-vf", "scale=540:-2", "-quality", "70", str(poster)], check=True)
        print(f"  {p['id']}: {dst.stat().st_size // 1024} KB")


if __name__ == "__main__":
    {"plan": plan, "video": video, "ship": ship}[sys.argv[1] if len(sys.argv) > 1 else "plan"]()
