"""CAPABLE feasibility lab.

  python scripts/run_feasibility.py --dry-run          # zero spend: config, auth, free model probe, local compositing
  python scripts/run_feasibility.py --tier text        # ~$0.01: TTFT pings, trend miner, 3 storyboards + QA, Tier A reels
  python scripts/run_feasibility.py --tier image       # ~$0.15: character anchors + identity-preserving scene edits
  python scripts/run_feasibility.py --tier video       # ~$0.40: 2x 4 s Veo 3.1 Lite plates (needs ENABLE_LIVE_VIDEO_GEN=true)
  python scripts/run_feasibility.py --all              # text + image + video, then report

Results accumulate in reports/feasibility_state.json; reports/feasibility_report.md is rebuilt after every run.
"""
from __future__ import annotations

import argparse
import importlib
import json
import random
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rich.console import Console  # noqa: E402
from rich.table import Table  # noqa: E402

from core import compositor  # noqa: E402
from core.cost_ledger import BudgetExceeded, CostLedger, estimate_images, estimate_text, estimate_video  # noqa: E402
from core.settings import model_registry, settings  # noqa: E402
from schemas.memory_graph import UserTasteAndMemoryProfile  # noqa: E402
from schemas.storyboard import (CaptionWord, CortisolLock, ReelStoryboard, RubricItem, Scene,  # noqa: E402
                                UnseenJobTwinTask, quality_checks)
from schemas.trend_genome import TrendGenome  # noqa: E402

con = Console()
STATE = settings().reports_dir / "feasibility_state.json"

TESTS = [
    {"key": "react_sheru", "title": "React useEffect x Sheru Bhai", "job_role": "Junior React developer",
     "skill": "useEffect infinite loop: add a dependency array and return a cleanup function (clearInterval)",
     "trend_id": "sheru_bhai", "language": "hinglish", "protected": ["useEffect", "[]", "clearInterval"]},
    {"key": "excel_huss", "title": "Excel VLOOKUP x Huss Valley", "job_role": "Delivery payouts dispatcher",
     "skill": "VLOOKUP exact match: use FALSE as the 4th argument so rider IDs never match the wrong payout row",
     "trend_id": "roblox_huss", "language": "kanglish", "protected": ["VLOOKUP", "FALSE", "#N/A"]},
    {"key": "plumbing_sheru", "title": "Washer sizing x Sheru Bhai (CAPABLE slice)", "job_role": "Apprentice plumber",
     "skill": "Match a replacement washer by checking inner diameter (ID), outer diameter (OD) and thickness, all in mm. "
              "Teach with a 15 mm ID / 24 mm OD / 3 mm example; the job twin must use different numbers.",
     "trend_id": "sheru_bhai", "language": "kanglish", "protected": ["ID", "OD", "thickness", "mm"]},
]
MINER_DESCRIPTION = ("A trending vertical format where an overly serious cat in a tiny chef hat narrates a kitchen "
                     "disaster in slow motion with dramatic documentary voiceover, then a hard cut to the cat calmly "
                     "doing it right, with a smug zoom.")


# ============================================================================ helpers
def load_state() -> dict:
    return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {"runs": [], "results": {}}


def save_state(st: dict) -> None:
    STATE.write_text(json.dumps(st, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def genomes() -> dict[str, TrendGenome]:
    return {p.stem: TrendGenome.model_validate_json(p.read_text(encoding="utf-8"))
            for p in sorted((ROOT / "trends" / "registry").glob("*.json"))}


def fixture_storyboard() -> ReelStoryboard:
    """Hand-authored plumbing reel used by --dry-run (no model calls)."""
    lines = [
        ("s1", 0, 3000, "Sheru Bhai walks in. Wrong washer on the tap.", "none", "GALTI!"),
        ("s2", 3000, 6500, "Washer has three numbers. ID, OD, thickness. All in mm.", "ID = inner hole\nOD = outer edge\nthickness = height", "none"),
        ("s3", 6500, 10000, "Example: 15 mm ID, 24 mm OD, 3 mm thickness.", "Need: ID 15 / OD 24 / 3 mm", "none"),
        ("s4", 10000, 15000, "One number wrong? Leak guaranteed. Check all three, guru.", "Match ALL 3 or it leaks", "BOSS MODE"),
    ]
    scenes = []
    for sid, a, b, text, code, meme in lines:
        words = text.split()
        step = (b - a) // len(words)
        caps = [CaptionWord(word=w, start_ms=a + i * step, end_ms=a + (i + 1) * step,
                            emphasis=w.strip(".,").lower() in {"id", "od", "thickness", "mm", "leak"})
                for i, w in enumerate(words)]
        scenes.append(Scene(scene_id=sid, start_ms=a, end_ms=b, visual_layer="canvas", broll_plate_id="none",
                            keyframe_prompt="none", caption_words=caps, tts_script=text, sfx_cue="bass hit",
                            meme_overlay=meme, code_overlay=code))
    return ReelStoryboard(
        sprint_id="fixture_plumbing", job_role="Apprentice plumber", skill_node="washer ID/OD/thickness match",
        trend_id="sheru_bhai", language_mode="english", protected_terms=["ID", "OD", "thickness", "mm"],
        render_tier="canvas_lite", duration_ms=15000, scenes=scenes,
        cortisol_lock=CortisolLock(prompt="Which check stops a leak?", options=["Only ID", "ID + OD + thickness", "Colour"],
                                   correct_index=1, time_limit_sec=6, fast_wrong_roast="Bhai ne bola: ALL THREE.",
                                   explanation="A washer must match ID, OD and thickness to seal."),
        unseen_job_twin_task=UnseenJobTwinTask(
            title="Kitchen tap work order", scenario="Customer's tap drips. Pick the washer that matches the work order.",
            artifact_type="part_selection", starter_artifact="Work order: replace washer per spec sheet (see bin labels).",
            success_criteria=["Selected part matches all three dimensions"],
            rubric=[RubricItem(criterion="Checks ID", points=3), RubricItem(criterion="Checks OD", points=3),
                    RubricItem(criterion="Checks thickness", points=3)],
            must_differ_from_reel="Different dimensions from the 15/24/3 example"),
    )


def memory_sim() -> dict:
    """Deterministic simulation of the taste bandit + cross-meme SM-2 scheduler (no API)."""
    rng = random.Random(7)
    prof = UserTasteAndMemoryProfile(learner_id="demo_learner")
    prof.ensure_arms(list(genomes()))
    now = datetime(2026, 11, 23, 9, tzinfo=timezone.utc)
    taste = {"sheru_bhai": 0.9, "roblox_huss": 0.6}
    log = []
    for day in range(6):
        t = prof.pick_trend(rng)
        correct = rng.random() < (0.45 + 0.1 * day)
        prof.record_engagement(t, watch_ratio=taste.get(t, 0.5) + rng.uniform(-0.1, 0.1), replayed=rng.random() < 0.3,
                               lock_correct=correct)
        card = prof.review("washer_id_od_thickness", 4 if correct else 2, t, now)
        nxt = prof.next_callback(card.due_at, rng)
        log.append({"day": day, "trend": t, "lock_correct": correct, "next_due_in_days": card.interval_days,
                    "next_callback_trend": nxt[1] if nxt else None})
        now = card.due_at + timedelta(minutes=1)
    switches = sum(1 for e in log if e["next_callback_trend"] and e["next_callback_trend"] != e["trend"])
    return {"affinity": prof.affinity_vector(), "log": log, "cross_meme_callbacks": f"{switches}/{len(log)}"}


# ============================================================================ phases
def preflight(vc_needed: bool) -> dict:
    out = {"python": sys.version.split()[0], "deps": {}, "ffmpeg": compositor.ffmpeg_path(), "auth": None}
    for mod in ["google.genai", "pydantic", "dotenv", "edge_tts", "rich"]:
        try:
            m = importlib.import_module(mod)
            out["deps"][mod] = getattr(m, "__version__", "ok")
        except Exception as e:
            out["deps"][mod] = f"MISSING ({e})"
    s = settings()
    out["config"] = {"project": s.project, "text_location": s.text_location, "media_location": s.media_location,
                     "use_vertex": s.use_vertex, "credentials_file": bool(s.credentials_path and Path(s.credentials_path).exists()),
                     "max_budget_usd": s.max_budget_usd, "enable_live_video": s.enable_live_video}
    try:
        import google.auth
        import google.auth.transport.requests
        creds, proj = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(google.auth.transport.requests.Request())
        out["auth"] = {"ok": True, "principal": getattr(creds, "service_account_email", "user ADC"), "adc_project": proj}
    except Exception as e:
        out["auth"] = {"ok": False, "error": str(e)[:200]}
    return out


def phase_text(vc, ledger, st) -> None:
    res = st["results"]
    con.rule("[bold]Text tier: TTFT, trend miner, storyboards")
    res["ttft"] = [vc.ping_ttft("storyboard"), vc.ping_ttft("trend_miner")]
    for p in res["ttft"]:
        con.print(f"  TTFT {p['model']}: {p['ttft_ms']} ms (total {p['total_ms']} ms)")
    from core.trend_miner import mine_trend
    try:
        g, meta = mine_trend(vc, description=MINER_DESCRIPTION, test="trend_miner_text")
        path = ROOT / "trends" / "mined" / f"{g.id}.json"
        path.write_text(g.model_dump_json(indent=2), encoding="utf-8")
        res["trend_miner"] = {**meta, "ok": True, "genome_id": g.id, "path": str(path), "broll_prompts": len(g.reusable_broll_prompts)}
        con.print(f"  Trend miner -> {g.id} ({meta['latency_ms']} ms, ${meta['usd']:.5f})")
    except Exception as e:
        res["trend_miner"] = {"ok": False, "error": str(e)[:300]}
        con.print(f"  [red]Trend miner failed: {e}")
    from core.storyboard_compiler import compile_storyboard
    res.setdefault("storyboards", {})
    for t in TESTS:
        r = compile_storyboard(vc, job_role=t["job_role"], skill=t["skill"], trend_id=t["trend_id"], language=t["language"],
                               protected_terms=t["protected"], test=t["key"], retries=1)
        sb = r["storyboard"]
        entry = {"title": t["title"], "attempts": r["attempts"], "path": r["path"], "json_bytes": r["json_bytes"]}
        if sb:
            tts = compositor.synth_tts(sb, f"{t['key']}")
            mp4 = compositor.render_mp4(sb, f"{t['key']}_tierA", tts=tts)
            entry.update(tts={k: tts[k] for k in ("ok", "voice", "latency_ms", "error")}, tts_files=tts["files"],
                         tierA_mp4=mp4)
            qa = r["attempts"][-1]["qa"]
            con.print(f"  {t['key']}: schema OK, QA {'PASS' if qa['passed'] else 'issues: ' + '; '.join(qa['issues'])} "
                      f"| {r['attempts'][-1]['latency_ms']} ms | ${sum(a.get('usd', 0) for a in r['attempts']):.5f}"
                      f" | mp4 {'ok' if mp4.get('ok') else mp4.get('error', '')[:80]}")
        else:
            con.print(f"  [red]{t['key']}: no valid storyboard after retries: {r['attempts'][-1].get('error')}")
        res["storyboards"][t["key"]] = entry


def phase_image(vc, ledger, st) -> None:
    from core.media_generator import character_anchor, scene_edit
    res = st["results"].setdefault("images", {})
    gs = genomes()
    con.rule("[bold]Image tier: anchors + identity-preserving edits")
    assets = settings().outputs_dir / "assets"
    cached = lambda k, f: res.get(k, {}).get("ok") and (assets / f).exists()  # noqa: E731
    jobs = [("sheru_anchor", "sheru_bhai_anchor.png", lambda: character_anchor(vc, gs["sheru_bhai"])),
            ("huss_anchor", "roblox_huss_anchor.png", lambda: character_anchor(vc, gs["roblox_huss"]))]
    for k, f, fn in jobs:
        if cached(k, f):
            con.print(f"  {k}: cached (generated once, reused at $0)")
            continue
        try:
            res[k] = {"ok": True, **fn()}
        except Exception as e:
            res[k] = {"ok": False, "error": str(e)[:300]}
        con.print(f"  {k}: {res[k]}")
    anchor = assets / "sheru_bhai_anchor.png"
    edits = [("sheru_react_bug", "the lion boss points one finger at a glowing red bug floating above a laptop showing code, unimpressed, mansion office"),
             ("sheru_washers", "the lion boss holds two small black rubber tap washers between finger and thumb, comparing them, one slightly thicker, lowering his aviators, mansion foyer")]
    for k, instr in edits:
        if cached(k, f"sheru_bhai_{k.replace('sheru_', '')}.png"):
            con.print(f"  {k}: cached")
            continue
        if not anchor.exists():
            res[k] = {"ok": False, "error": "anchor missing"}
            continue
        try:
            res[k] = {"ok": True, **scene_edit(vc, gs["sheru_bhai"], anchor, instr, k.replace("sheru_", ""))}
        except Exception as e:
            res[k] = {"ok": False, "error": str(e)[:300]}
        con.print(f"  {k}: {res[k]}")


def phase_video(vc, ledger, st, include_fast: bool) -> None:
    from core.media_generator import broll_plate
    res = st["results"].setdefault("videos", {})
    gs = genomes()
    con.rule("[bold]Video tier: Veo 3.1 plates")
    if not settings().enable_live_video:
        con.print("  [yellow]ENABLE_LIVE_VIDEO_GEN is false: skipping (no spend).")
        res["skipped"] = "ENABLE_LIVE_VIDEO_GEN=false"
        return
    res.pop("skipped", None)
    anchor = settings().outputs_dir / "assets" / "sheru_bhai_anchor.png"
    jobs = [("sheru_plate_lite", dict(genome=gs["sheru_bhai"], plate_index=0, role="video_lite",
                                      image_path=anchor if anchor.exists() else None, name="sheru_bhai_plate_0")),
            ("huss_plate_lite", dict(genome=gs["roblox_huss"], plate_index=0, role="video_lite", name="roblox_huss_plate_0"))]
    if include_fast:
        jobs.append(("sheru_plate_fast", dict(genome=gs["sheru_bhai"], plate_index=1, role="video_fast",
                                              image_path=anchor if anchor.exists() else None, name="sheru_bhai_plate_1_fast")))
    for k, kw in jobs:
        con.print(f"  {k}: generating (this takes ~1-2 min)...")
        try:
            res[k] = {"ok": True, **broll_plate(vc, seconds=4, test=k, **kw)}
        except BudgetExceeded as e:
            res[k] = {"ok": False, "error": str(e)}
        except Exception as e:
            res[k] = {"ok": False, "error": f"{type(e).__name__}: {str(e)[:300]}"}
        con.print(f"  {k}: {res[k]}")


def phase_composite(st) -> None:
    """Assemble Tier A/B reels from whatever exists and rebuild the preview player (free, local)."""
    res = st["results"]
    assets = settings().outputs_dir / "assets"
    reels = []
    plate_for = {"sheru_bhai": assets / "sheru_bhai_plate_0.mp4", "roblox_huss": assets / "roblox_huss_plate_0.mp4"}
    key_for = {"react_sheru": assets / "sheru_bhai_react_bug.png", "plumbing_sheru": assets / "sheru_bhai_washers.png",
               "excel_huss": assets / "roblox_huss_anchor.png"}
    res.setdefault("composites", {})
    for t in TESTS:
        e = res.get("storyboards", {}).get(t["key"])
        if not e or not e.get("path"):
            continue
        sb = ReelStoryboard.model_validate_json(Path(e["path"]).read_text(encoding="utf-8"))
        tts = {"files": e.get("tts_files", [])}
        sb_cost = sum(a.get("usd", 0) for a in e["attempts"])
        sb_ms = e["attempts"][-1].get("latency_ms")
        reels.append({"name": f"{t['key']}_A", "title": t["title"], "tier": "A canvas_lite", "storyboard": sb, "tts": tts,
                      "mp4": e.get("tierA_mp4", {}).get("path"), "cost_usd": sb_cost, "latency_ms": sb_ms})
        plate, key = plate_for[t["trend_id"]], key_for[t["key"]]
        if plate.exists() or key.exists():
            t0 = time.perf_counter()
            mp4 = compositor.render_mp4(sb, f"{t['key']}_tierB", plate=plate if plate.exists() else None,
                                        keyframe=key if key.exists() else None, tts=tts)
            res["composites"][t["key"]] = {"tierB_mp4": mp4, "compose_ms": int((time.perf_counter() - t0) * 1000),
                                           "used_plate": plate.exists(), "used_keyframe": key.exists()}
            reels.append({"name": f"{t['key']}_B", "title": t["title"], "tier": "B hybrid_composite", "storyboard": sb,
                          "tts": tts, "plate": str(plate) if plate.exists() else None,
                          "keyframe": str(key) if key.exists() and not plate.exists() else None,
                          "mp4": mp4.get("path"), "cost_usd": sb_cost, "latency_ms": sb_ms})
    if not reels:  # dry-run path: fixture only
        sb = fixture_storyboard()
        tts = compositor.synth_tts(sb, "fixture")
        mp4 = compositor.render_mp4(sb, "fixture_tierA", tts=tts)
        res["fixture"] = {"tts": {k: tts[k] for k in ("ok", "voice", "latency_ms", "error")}, "mp4": mp4,
                          "qa": quality_checks(sb)}
        reels.append({"name": "fixture", "title": "Fixture (dry-run, no model calls)", "tier": "A canvas_lite",
                      "storyboard": sb, "tts": tts, "mp4": mp4.get("path"), "cost_usd": 0.0})
    path = compositor.build_preview(reels)
    res["preview_player"] = str(path)
    con.print(f"  Preview player: {path}  ({len(reels)} reels)")


# ============================================================================ report
def projected_spend() -> list[tuple[str, str, float]]:
    m = model_registry()
    img = "imagen-4.0-fast-generate-001"
    return [
        ("--tier text", "2 TTFT pings + 1 trend mine + 3 storyboards (x2 worst case)",
         2 * estimate_text("gemini-3.5-flash-lite", 10, 5) + estimate_text("gemini-3.8-flash", 2500, 1500)
         + 6 * estimate_text("gemini-3.5-flash-lite", 2500, 4500)),
        ("--tier image", "2 anchors + 2 identity edits (fallback model if Imagen 404s)",
         4 * max(estimate_images(img, 1), estimate_images("gemini-3.1-flash-lite-image", 1))),
        ("--tier video", "2x 4 s Veo 3.1 Lite with audio", 2 * estimate_video("veo-3.1-lite-generate-001", 4, True)),
        ("--include-fast", "+1x 4 s Veo 3.1 Fast with audio", estimate_video("veo-3.1-fast-generate-001", 4, True)),
    ] if m else []


def write_report(st: dict, ledger: CostLedger) -> Path:
    res, s = st["results"], settings()
    L = []
    w = L.append
    w("# CAPABLE feasibility report")
    w(f"\n_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} by `scripts/run_feasibility.py`. Backend: `{res.get('backend', '?')}`._\n")
    w(f"**Cumulative measured spend (all runs, `reports/cost_log.jsonl`): ${ledger.spent_total():.4f}** of the ${s.max_budget_usd:.2f} kill-switch.\n")
    pf = res.get("preflight", {})
    w("## 1. Preflight\n")
    w(f"- Python {pf.get('python')}; ffmpeg: {'yes' if pf.get('ffmpeg') else 'NO'}; auth: {pf.get('auth', {}).get('ok')}")
    w(f"- Deps: " + ", ".join(f"{k} {v}" for k, v in pf.get("deps", {}).items()))
    w("\n| Role | Resolved model | Note |\n|---|---|---|")
    probe = res.get("probe", {})
    for role, mid in probe.get("resolved", {}).items():
        fb = next((p["note"] for p in probe.get("log", []) if p["role"] == role and "FALLBACK" in p["note"]), "first choice")
        w(f"| {role} | `{mid}` | {fb} |")
    missing = sorted({p["model"] for p in probe.get("log", []) if not p["available"]})
    if missing:
        w(f"\nNot available in this project: {', '.join('`' + m + '`' for m in missing)}.")
    if res.get("ttft"):
        w("\n| Model | TTFT (ms) | Total (ms) |\n|---|---|---|")
        for p in res["ttft"]:
            w(f"| `{p['model']}` | {p['ttft_ms']} | {p['total_ms']} |")

    w("\n## 2. Storyboard benchmark (structured JSON + deterministic QA)\n")
    sbs = res.get("storyboards", {})
    if sbs:
        w("| Test | Model | Tries | Schema | QA | Protected terms | Latency (ms) | Tokens in/out/think | Cost | Notes |\n|---|---|---|---|---|---|---|---|---|---|")
        for k, e in sbs.items():
            a = e["attempts"][-1]
            qa = a.get("qa", {})
            cost = sum(x.get("usd", 0) for x in e["attempts"])
            notes = "; ".join(qa.get("issues", [])) or "-"
            if not a.get("schema_valid"):
                notes = a.get("error", "")[:120]
            w(f"| {e['title']} | `{a.get('model')}` | {len(e['attempts'])} | {'valid' if a.get('schema_valid') else 'INVALID'} | "
              f"{'pass' if qa.get('passed') else 'issues'} | {qa.get('protected_terms_preserved', '-')}/{qa.get('protected_terms_total', '-')} | "
              f"{a.get('latency_ms')} | {a.get('in_tokens')}/{a.get('out_tokens')}/{a.get('thought_tokens')} | ${cost:.5f} | {notes} |")
        tm = res.get("trend_miner", {})
        if tm:
            w(f"\nTrend miner (text description -> TrendGenome): {'ok' if tm.get('ok') else 'FAILED'}"
              + (f", `{tm.get('model')}`, {tm.get('latency_ms')} ms, ${tm.get('usd', 0):.5f}, genome `{tm.get('genome_id')}`" if tm.get("ok") else f": {tm.get('error')}"))
        w("\nTTS (edge-tts, free test voice): " + ", ".join(
            f"{k}: {'ok' if e.get('tts', {}).get('ok') else 'failed'} {e.get('tts', {}).get('latency_ms', '')} ms" for k, e in sbs.items()))
    else:
        w("_Not run yet (`--tier text`)._")

    w("\n## 3. Visual consistency (images)\n")
    imgs = res.get("images", {})
    if imgs:
        w("| Asset | Model | OK | Latency (ms) | Size (KB) | Cost |\n|---|---|---|---|---|---|")
        for k, e in imgs.items():
            w(f"| {k} | `{e.get('model', '-')}` | {e.get('ok')} | {e.get('latency_ms', '-')} | "
              f"{round(e.get('bytes', 0) / 1024) if e.get('bytes') else '-'} | ${e.get('usd', 0):.3f} | " + (e.get("error", "")[:100] if not e.get("ok") else ""))
        w("\nIdentity consistency is a human judgement: open `outputs/assets/sheru_bhai_anchor.png` next to the two edits.")
    else:
        w("_Not run yet (`--tier image`)._")

    w("\n## 4. Video feasibility (Veo 3.1)\n")
    vids = res.get("videos", {})
    if vids.get("skipped"):
        w(f"_Skipped: {vids['skipped']}._")
    elif vids:
        w("| Clip | Model | OK | Image-conditioned | Wall clock (s) | Size (MB) | Cost |\n|---|---|---|---|---|---|---|")
        for k, e in vids.items():
            w(f"| {k} | `{e.get('model', '-')}` | {e.get('ok')} | {e.get('image_conditioned', '-')} | "
              f"{round(e['latency_ms'] / 1000, 1) if e.get('latency_ms') else '-'} | {round(e.get('bytes', 0) / 1e6, 2) if e.get('bytes') else '-'} | "
              f"${e.get('usd', 0):.3f} | " + (e.get("error", "")[:140] if not e.get("ok") else ""))
    else:
        w("_Not run yet (`--tier video`)._")

    # ------------------------------------------------------------ unit economics
    w("\n## 5. Tier comparison (measured)\n")
    sb_costs = [sum(x.get("usd", 0) for x in e["attempts"]) for e in sbs.values() if e.get("path")]
    sb_lat = [e["attempts"][-1]["latency_ms"] for e in sbs.values() if e.get("path")]
    sb_bytes = [e.get("json_bytes", 0) for e in sbs.values() if e.get("path")]
    avg = lambda xs: sum(xs) / len(xs) if xs else None  # noqa: E731
    sb_c, sb_l, sb_b = avg(sb_costs), avg(sb_lat), avg(sb_bytes)
    img_ok = [e for e in imgs.values() if e.get("ok")]
    img_c, img_l = avg([e["usd"] for e in img_ok]), avg([e["latency_ms"] for e in img_ok])
    vid_ok = [e for k, e in vids.items() if isinstance(e, dict) and e.get("ok") and "lite" in k]
    vid_c, vid_l, vid_b = avg([e["usd"] for e in vid_ok]), avg([e["latency_ms"] for e in vid_ok]), avg([e["bytes"] for e in vid_ok])
    comps = res.get("composites", {})
    comp_l = avg([c["compose_ms"] for c in comps.values()])
    mp4_b = avg([c["tierB_mp4"]["bytes"] for c in comps.values() if c["tierB_mp4"].get("ok")])
    tts_l = avg([e.get("tts", {}).get("latency_ms", 0) for e in sbs.values() if e.get("tts", {}).get("ok")])
    PLATES, REELS_PER_PLATE = 20, None

    def fmt(x, unit="", nd=4):
        return "n/a" if x is None else f"{x:.{nd}f}{unit}"

    if sb_c is not None:
        tierA = sb_c
        tierB_cached = sb_c  # cached plates + cached anchors: only the storyboard (and free/edge TTS) is fresh
        tierB_fresh = sb_c + (img_c or 0)
        tierC = sb_c + (vid_c or estimate_video("veo-3.1-lite-generate-001", 4, True))
        w("| Tier | What is fresh per reel | Cost / reel | Generation latency | Payload to phone |\n|---|---|---|---|---|")
        w(f"| A canvas_lite | storyboard JSON only | ${fmt(tierA)} | {fmt(sb_l and sb_l / 1000, ' s', 1)} (+TTS {fmt(tts_l and tts_l / 1000, ' s', 1)}) | {fmt(sb_b and sb_b / 1024, ' KB', 1)} JSON |")
        w(f"| B hybrid, cached plates | storyboard; plate + keyframe from cache | ${fmt(tierB_cached)} + one-off plate cost | {fmt(sb_l and sb_l / 1000, ' s', 1)} + compose {fmt(comp_l and comp_l / 1000, ' s', 1)} | {fmt(vid_b and vid_b / 1e6, ' MB', 2)} plate (cached once) + JSON, or {fmt(mp4_b and mp4_b / 1e6, ' MB', 2)} mp4 |")
        w(f"| B hybrid, 1 fresh keyframe | storyboard + 1 image edit | ${fmt(tierB_fresh)} | {fmt(((sb_l or 0) + (img_l or 0)) / 1000, ' s', 1)} | + ~{fmt(avg([e['bytes'] for e in img_ok]) and avg([e['bytes'] for e in img_ok]) / 1024, ' KB', 0)} image |")
        c_lat = fmt(((sb_l or 0) + vid_l) / 1000, ' s', 1) if vid_l else "not measured (Veo not run)"
        c_cost = f"${fmt(tierC)}" + ("" if vid_c else " (brief price)")
        w(f"| C veo_hero | storyboard + 4 s Veo Lite | {c_cost} | {c_lat} | {fmt(vid_b and vid_b / 1e6, ' MB', 2)} |")
        one_off = PLATES * (vid_c or estimate_video("veo-3.1-lite-generate-001", 4, True)) + 2 * (img_c or 0.034)
        w(f"\nOne-off cache cost for {PLATES} reusable plates + anchors: **${one_off:.2f}**"
          f" ({'measured' if vid_c else 'brief price'} Veo Lite cost per 4 s plate).")
        w("\n### Projected monthly cost (30 reels per learner per month)\n")
        w("| Active learners | Reels / month | Tier A | Tier B cached | Tier B + fresh keyframe | Tier C per-reel Veo |\n|---|---|---|---|---|---|")
        for n in (100, 1000, 10000):
            r = n * 30
            w(f"| {n:,} | {r:,} | ${r * tierA:,.2f} | ${r * tierB_cached + one_off:,.2f} | ${r * tierB_fresh + one_off:,.2f} | ${r * tierC:,.2f} |")
        w("\nStoryboards are compiled once per (skill, trend, language) and can be cached across learners, so real Tier A/B "
          "costs fall further; the table assumes a fresh storyboard per reel (worst case). edge-tts is a free test voice; "
          "a production TTS bill is not included.")
    else:
        w("_Run `--tier text` first._")

    w("\n## 6. Learner model (local simulation, no API)\n")
    ms = res.get("memory_sim")
    if ms:
        w(f"- Format affinity after 6 sessions: `{ms['affinity']}`")
        w(f"- Callbacks scheduled into a different meme than the last exposure: {ms['cross_meme_callbacks']}")

    w("\n## 7. Recommendation\n")
    w(recommendation(res, sb_c, vid_c, vid_l))
    w("\n## 8. Artifacts\n")
    w(f"- Preview player: `{Path(res.get('preview_player', 'outputs/preview_player.html')).relative_to(ROOT) if res.get('preview_player') else 'n/a'}` (open in a browser; swipe, tap to play)")
    w("- Storyboards: `outputs/storyboards/*.json`; reels: `outputs/reels/*.mp4`; media: `outputs/assets/`")
    w("- Per-call ledger: `reports/cost_log.jsonl`; model probe: `reports/model_probe.json`")
    p = s.reports_dir / "feasibility_report.md"
    p.write_text("\n".join(L) + "\n", encoding="utf-8")
    return p


def recommendation(res, sb_c, vid_c, vid_l) -> str:
    sbs = res.get("storyboards", {})
    valid = sum(1 for e in sbs.values() if e.get("path"))
    qa_pass = sum(1 for e in sbs.values() if e.get("path") and e["attempts"][-1].get("qa", {}).get("passed"))
    lines = []
    if not sbs:
        return "_Pending: run the text tier._"
    lines.append(f"- **Storyboard compiler: {'GO' if valid == len(sbs) else 'CONDITIONAL'}.** {valid}/{len(sbs)} schema-valid, "
                 f"{qa_pass}/{len(sbs)} passed deterministic QA on the final try. Keep the QA gate in front of any media spend.")
    imgs = [e for e in res.get("images", {}).values() if e.get("ok")]
    if imgs:
        lines.append(f"- **Character anchors / edits: GO** ({len(imgs)} images). Imagen 4 Fast was "
                     f"{'available' if any('imagen' in e.get('model', '') for e in imgs) else 'not enabled in this project; the Gemini image fallback worked'}.")
    if vid_c:
        lines.append(f"- **Veo plates: GO as an offline cache, NO-GO per reel.** Measured ~{vid_l / 1000:.0f} s wall clock and ${vid_c:.2f} per 4 s clip: "
                     f"fine to pre-render a plate library, too slow and too expensive to generate while a learner waits.")
    lines.append("- **Hackathon MVP:** ship Tier A (canvas/CSS + authored storyboard JSON) as the default feed and offline path, "
                 "use Tier B (cached Veo plate + anchor keyframe + captions) for the hook reels, and keep Tier C for one stage-demo hero clip. "
                 "Credentials come only from the trainer-reviewed work order, never from feed answers.")
    return "\n".join(lines)


# ============================================================================ main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--tier", action="append", choices=["text", "image", "video"], default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--include-fast", action="store_true", help="also run one Veo 3.1 Fast clip")
    a = ap.parse_args()
    tiers = ["text", "image", "video"] if a.all else a.tier
    if not tiers and not a.dry_run:
        a.dry_run = True
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    ledger = CostLedger(run_id)
    st = load_state()
    st["runs"].append({"run_id": run_id, "tiers": tiers or ["dry-run"], "started": datetime.now().isoformat()})
    res = st["results"]

    con.rule(f"[bold cyan]CAPABLE feasibility lab  run={run_id}")
    res["preflight"] = pf = preflight(True)
    t = Table(show_header=False)
    for k, v in [("python", pf["python"]), ("ffmpeg", pf["ffmpeg"] or "MISSING"), ("auth", pf["auth"]),
                 *pf["config"].items(), *pf["deps"].items()]:
        t.add_row(str(k), str(v))
    con.print(t)
    if not pf["auth"]["ok"]:
        con.print("[red]Auth failed; fix credentials before any tier.")
        save_state(st)
        return 2

    from core.vertex_client import VertexClients
    vc = VertexClients(ledger)
    res["backend"] = vc.backend
    vc.probe()
    res["probe"] = {"resolved": vc.resolved, "log": vc.probe_log}
    pt = Table("role", "model", "available", "note", title="Model probe (free metadata calls)")
    for p in vc.probe_log:
        pt.add_row(p["role"], p["model"], "yes" if p["available"] else "no", p["note"])
    con.print(pt)

    for gid, g in genomes().items():
        con.print(f"  genome {gid}: valid ({len(g.reusable_broll_prompts)} plates, bpm {g.bpm})")
    res["memory_sim"] = memory_sim()
    con.print(f"  memory sim: affinity {res['memory_sim']['affinity']}, cross-meme callbacks {res['memory_sim']['cross_meme_callbacks']}")

    sp = Table("flag", "what", "projected USD", title=f"Projected spend (already spent: ${ledger.spent_total():.4f}, cap ${settings().max_budget_usd:.2f})")
    for f, w_, usd in projected_spend():
        sp.add_row(f, w_, f"${usd:.3f}")
    con.print(sp)

    try:
        if "text" in tiers:
            phase_text(vc, ledger, st)
            save_state(st)
        if "image" in tiers:
            phase_image(vc, ledger, st)
            save_state(st)
        if "video" in tiers:
            phase_video(vc, ledger, st, a.include_fast)
            save_state(st)
    except BudgetExceeded as e:
        con.print(f"[red]KILL-SWITCH: {e}")
    con.rule("[bold]Compositing (local, free)")
    phase_composite(st)
    save_state(st)
    rp = write_report(st, ledger)
    con.print(f"\n[bold green]Report:[/] {rp}\n[bold]This run spent ${ledger.spent_this_run():.4f}; cumulative ${ledger.spent_total():.4f}.")
    if a.dry_run and not tiers:
        con.print("Dry run complete. Next: --tier text, then --tier image; set ENABLE_LIVE_VIDEO_GEN=true for --tier video.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
