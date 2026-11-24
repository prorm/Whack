"""Record local experiment status without re-dispatching any provider request."""
from pathlib import Path
import json
from .run import OUT, ROOT, MANIFEST, RESULTS, append, initialize, journal, rows, sole_runner

CHECKPOINTS = {
    "discovery": ("PASSED", "Authenticated publisher, custom model, service and bounded quota metadata inventory.", "model_atlas.json"),
    "competitors": ("PASSED", "Read-only first-party competitor sweep; gaps are hypotheses.", "02_COMPETITIVE_LANDSCAPE.md"),
    "tournament": ("PASSED", "Weighted product hypotheses with a selected primary slice.", "03_INVENTION_TOURNAMENT.md"),
    "local-fixtures": ("PASSED", "Independently authored calculations, input, privacy and Q&A scenarios.", "../../moonshot/benchmarks/local-results.json"),
    "prototype": ("PASSED", "Versioned browser walkthrough, consented evidence and correction path.", "../../moonshot/benchmarks/browser-results.json"),
    "skill-mirror": ("PASSED", "Two independently computed numeric rubric items; method unverified.", "09_SKILL_MIRROR.md"),
    "community-room": ("PASSED", "Local attribution and idempotent three-role school simulation.", "../../moonshot/prototypes/mission_room.mjs"),
    "offline-reload": ("PASSED", "Server-killed worksheet, local recording, reconnection sync and revocation passed in Chromium.", "../../moonshot/benchmarks/browser-results.json"),
    "reel-shootout": ("NEEDS_HUMAN_REVIEW", "Three real creative comparators and source excerpt available; preference awaits learners.", "06_REEL_SHOOTOUT.md"),
    "privacy": ("NEEDS_HUMAN_REVIEW", "App boundary passed; endpoint security in the browser environment observed synthetic form text. Real capture privacy requires pilot review.", "13_SAFETY_AND_PRIVACY.md"),
    "pilot-design": ("NEEDS_HUMAN_REVIEW", "Pilot and consent draft complete. No participants enrolled.", "PILOT_PROTOCOL.md"),
    "research-synthesis": ("PASSED", "Final decision and reproducible virtual demo.", "FINAL_MOONSHOT_REPORT.md"),
    "image-frontier": ("NEEDS_HUMAN_REVIEW", "Two real candidate images and one lighting edit available.", "05_IMAGE_GENERATION.md"),
    "video-generation": ("BLOCKED", "Veo metadata visible; fixed quota or project entitlement not established for fresh generation.", "06_REEL_SHOOTOUT.md"),
    "kannada-speech": ("NEEDS_HUMAN_REVIEW", "Both listed Kannada voices synthesized; fluency remains pending.", "07_SPEECH_AND_LOCALIZATION.md"),
    "realtime-dubbing": ("BLOCKED", "Verified project route unavailable in bounded inventory; realtime input/voice scope unproven.", "07_SPEECH_AND_LOCALIZATION.md"),
}


def main():
    with sole_runner():
        initialize()
        current = json.loads(MANIFEST.read_text(encoding="utf8"))["experiments"]
        previous = {row["id"] for row in rows(RESULTS) if row.get("type") == "local_checkpoint"}
        for key,(state,note,relative) in CHECKPOINTS.items():
            path = (OUT / relative).resolve()
            if not path.exists():
                continue
            if current.get(key,{}).get("note") != note:
                journal(key,state,note)
            if key not in previous:
                append(RESULTS, {"id":key,"type":"local_checkpoint","state":state,"artifact":path.relative_to(ROOT).as_posix(),
                                 "additional_cloud_usd":"0","note":note})


if __name__ == "__main__":
    main()
