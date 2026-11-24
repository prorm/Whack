"""Storyboard compiler: {job_role, skill, trend, language} -> ReelStoryboard (+ deterministic QA)."""
from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from schemas.storyboard import ReelStoryboard, quality_checks
from schemas.trend_genome import TrendGenome

from .settings import ROOT
from .vertex_client import VertexClients

LANG_RULES = {
    "english": "Simple Indian English, short sentences.",
    "hinglish": "Romanised Hindi-English code-mix (Latin script), the way people actually text. Technical terms stay in English.",
    "kanglish": "Romanised Kannada-English code-mix (Latin script), Bengaluru street style (e.g. 'swalpa', 'guru', 'beda', 'maadi'). Technical terms stay in English.",
}

COMPILER_PROMPT = """You write 15-second vertical micro-lessons that ride a meme format but teach ONE exact job skill.

TREND GENOME (the format grammar to follow):
{genome}

LESSON
- job_role: {job_role}
- skill_node: {skill}
- language_mode: {language} -> {lang_rule}
- protected_terms (must appear VERBATIM, never translated, in tts_script and captions): {protected}
- render_tier: {tier}

HARD RULES
1. duration_ms = 15000. 4-6 scenes, contiguous, first scene starts at 0 ms (hook in the first 1500 ms).
2. Every scene's caption_words carry ALL essential information (assume the sound is off). Word timestamps sit inside the scene window. Mark protected terms and the punchline with emphasis=true.
3. The lesson example and the unseen_job_twin_task MUST use different values. The job twin is a realistic work task, not a meme quiz; it must not reveal its own answer.
4. cortisol_lock: one reflex question about the exact skill, 2-4 options, time_limit_sec 5-8, plus an in-character roast for a fast wrong answer and a one-line explanation.
5. Humour mocks the mistake, never the learner. Original characters only, no real people or brand names.
6. broll_plate_id: use 'plate_0', 'plate_1', ... referring to the genome's reusable_broll_prompts by index, or 'none'.
7. code_overlay holds the exact spec / code / formula card shown on screen, or 'none'.
Return JSON only.
"""


def load_genome(trend_id: str) -> TrendGenome:
    return TrendGenome.model_validate_json((ROOT / "trends" / "registry" / f"{trend_id}.json").read_text(encoding="utf-8"))


def compile_storyboard(vc: VertexClients, *, job_role: str, skill: str, trend_id: str, language: str,
                       protected_terms: list[str], tier: str = "hybrid_composite", test: str = "storyboard",
                       out_dir: Path | None = None, retries: int = 1) -> dict:
    genome = load_genome(trend_id)
    prompt = COMPILER_PROMPT.format(
        genome=genome.model_dump_json(indent=1), job_role=job_role, skill=skill, language=language,
        lang_rule=LANG_RULES[language], protected=json.dumps(protected_terms), tier=tier)
    attempts = []
    for attempt in range(retries + 1):
        raw, meta = vc.generate_json("storyboard", prompt, ReelStoryboard, test=f"{test}#try{attempt}")
        try:
            sb = ReelStoryboard.model_validate(json.loads(raw))
        except (ValidationError, json.JSONDecodeError) as e:
            attempts.append({**meta, "schema_valid": False, "error": str(e)[:300]})
            continue
        qa = quality_checks(sb)
        attempts.append({**meta, "schema_valid": True, "qa": qa})
        out_dir = out_dir or vc.ledger.path.parent.parent / "outputs" / "storyboards"
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"{test}.json"
        path.write_text(sb.model_dump_json(indent=2), encoding="utf-8")
        return {"storyboard": sb, "path": str(path), "attempts": attempts, "json_bytes": len(raw.encode())}
    return {"storyboard": None, "path": None, "attempts": attempts, "json_bytes": 0}
