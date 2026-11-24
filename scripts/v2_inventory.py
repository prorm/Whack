"""Free model inventory: list + get (metadata only, $0). Writes outputs/feasibility_v2/model_inventory.json."""
import json, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT))
from core.settings import settings
from google import genai
s = settings()
out = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "project": s.project, "locations": {}}
for loc in ["global", s.media_location]:
    c = genai.Client(vertexai=True, project=s.project, location=loc)
    names = []
    for m in c.models.list(config={"page_size": 300}):
        names.append({"name": m.name.split("/")[-1], "actions": list(getattr(m, "supported_actions", None) or [])})
    out["locations"][loc] = names
wanted = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.8-flash-tts", "gemini-3.5-transcribe", "gemini-3.1-flash-lite-image",
          "gemini-3.1-flash-image", "imagen-4.0-fast-generate-001", "veo-3.1-lite-generate-001", "veo-3.1-fast-generate-001"]
probe = {}
for mid in wanted:
    loc = s.media_location if mid.startswith(("veo", "imagen")) else "global"
    c = genai.Client(vertexai=True, project=s.project, location=loc)
    try:
        m = c.models.get(model=mid)
        probe[mid] = {"location": loc, "available": True, "input_token_limit": getattr(m, "input_token_limit", None), "output_token_limit": getattr(m, "output_token_limit", None)}
    except Exception as e:
        probe[mid] = {"location": loc, "available": False, "error": str(e)[:120]}
out["probe"] = probe
p = ROOT / "outputs/feasibility_v2/model_inventory.json"
p.write_text(json.dumps(out, indent=1))
print({k: v["available"] for k, v in probe.items()})
print({k: len(v) for k, v in out["locations"].items()})
