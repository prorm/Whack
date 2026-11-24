"""Universal Learning Compiler (experiment 3): one verified ConceptSpec -> several modes, checked deterministically.

LLM-compiled modes: course, reading, audio (en + kn). Deterministic modes (no LLM): interactive visual, practical task
(implemented in app/src). Every number the LLM emits inside an exercise must come with {op, args}; code recomputes it.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field

from .settings import ROOT
from .v2_llm import V2LLM

PROMPT_VERSION = "compile-v1"
Op = Literal["pct_of", "ratio_pct", "pct_change", "pct_of_plus_fixed"]


class Item(BaseModel):
    id: str
    question: str
    op: Op = Field(description="pct_of args=[pct, base]; ratio_pct args=[part, whole]; pct_change args=[old, new]; pct_of_plus_fixed args=[pct, base, fixed_per_order, orders]")
    args: list[float]
    answer: float


class Lesson(BaseModel):
    title: str
    explanation: str
    uses_worked_example_ids: list[str]


class Module(BaseModel):
    title: str
    objective: str
    lessons: list[Lesson]
    checkpoint: Item


class Course(BaseModel):
    concept_id: str
    prerequisite_recap: str
    modules: list[Module]
    covers_fact_indices: list[int]


class Step(BaseModel):
    text: str


class Reading(BaseModel):
    concept_id: str
    subtopic: str
    steps: list[Step]
    practice: list[Item]


class Turn(BaseModel):
    text: str
    pause_question: Item | None = None


class AudioScript(BaseModel):
    concept_id: str
    subtopic: str
    en_turns: list[Turn]
    kn_turns: list[Turn] = Field(description="Kannada script, natural Bengaluru Kannada; keep %, numbers and words like Excel/formula in English")


@lru_cache
def concept() -> dict:
    return json.loads((ROOT / "content" / "concepts" / "percentages.json").read_text(encoding="utf-8"))


def compute(op: str, a: list[float]) -> float:
    if op == "pct_of":
        v = a[1] * a[0] / 100
    elif op == "ratio_pct":
        v = a[0] / a[1] * 100
    elif op == "pct_change":
        v = (a[1] - a[0]) / a[0] * 100
    elif op == "pct_of_plus_fixed":
        v = a[1] * a[0] / 100 + a[2] * a[3]
    else:
        raise ValueError(op)
    return round(v, 2)


BASE = """You are compiling a lesson from a VERIFIED concept specification. Do not add facts beyond it.
Every exercise number must be expressed as an item with op + args + answer; the answer must equal the op applied to args.
The question text must contain the args numbers. Keep language simple (Indian English, grade 6-8 reading level).
Concept specification (JSON):
{spec}
"""


def compile_mode(llm: V2LLM, model: str, mode: str, subtopic: str | None = None) -> tuple[BaseModel | None, dict]:
    spec = concept()
    if mode == "course":
        task = ("MODE: Udemy-style mini-course covering all four subtopics (basic, commission, change, sheet) in that order. "
                "One module per subtopic with an objective, 1-2 short lessons that reference worked example ids from the spec, "
                "and one checkpoint item with NEW numbers. List which essential_facts (0-based indices) are covered.")
        schema = Course
    elif mode == "reading":
        task = (f"MODE: step-by-step reading for subtopic '{subtopic}'. 4-6 short steps with progressive disclosure "
                "(idea -> rule -> worked example from the spec -> common mistake from the spec), then 3 practice items with NEW numbers.")
        schema = Reading
    elif mode == "audio":
        task = (f"MODE: audio-first tutor script for subtopic '{subtopic}', about 90 seconds, conversational, for a gig worker on a phone. "
                "6-9 turns in English (en_turns) and the same script in Kannada (kn_turns). Include exactly 2 pause-and-answer "
                "questions in each language as pause_question items with NEW numbers; the Kannada items must use the SAME numbers as English.")
        schema = AudioScript
    else:
        raise ValueError(mode)
    prompt = BASE.format(spec=json.dumps(spec, ensure_ascii=False)) + "\n" + task
    r = llm.generate(model, prompt, test=f"exp3_{mode}_{subtopic or 'all'}", prompt_version=PROMPT_VERSION, schema=schema,
                     max_out=6000, temperature=0.4)
    meta = {k: r[k] for k in ("model", "latency_ms", "usd", "in_tokens", "out_tokens", "thought_tokens", "cache_hit", "retries")}
    meta["bytes"] = len(r["text"].encode("utf-8"))
    try:
        return schema.model_validate(json.loads(r["text"])), meta | {"schema_valid": True}
    except Exception as e:
        return None, meta | {"schema_valid": False, "error": str(e)[:300]}


# ------------------------------------------------------------------ deterministic checks
NUM = r"\d+(?:,\d{3})*(?:\.\d+)?"


def _nums(s: str) -> set[float]:
    return {float(x.replace(",", "")) for x in re.findall(NUM, s)}


def check_items(items: list[Item]) -> dict:
    res = []
    for it in items:
        try:
            exp = compute(it.op, it.args)
        except Exception:
            exp = None
        answer_ok = exp is not None and abs(exp - it.answer) < 0.011
        q_nums = _nums(it.question)
        args_in_text = all(any(abs(a - q) < 1e-9 for q in q_nums) for a in it.args)
        res.append({"id": it.id, "op": it.op, "args": it.args, "answer": it.answer, "recomputed": exp,
                    "answer_ok": answer_ok, "args_in_question": args_in_text})
    return {"n": len(res), "answer_ok": sum(r["answer_ok"] for r in res), "args_in_question": sum(r["args_in_question"] for r in res), "items": res}


PCT_CLAIM = re.compile(rf"({NUM})\s*%\s*of\s*₹?\s*({NUM})\s*(?:is|=|equals|comes to|gives)\s*₹?\s*({NUM})", re.I)


def check_inline_claims(text: str) -> dict:
    """Verify every 'X% of Y is Z' style statement in free text."""
    bad, n = [], 0
    for m in PCT_CLAIM.finditer(text):
        x, y, z = (float(g.replace(",", "")) for g in m.groups())
        n += 1
        if abs(y * x / 100 - z) > 0.011:
            bad.append(m.group(0))
    return {"claims_checked": n, "claims_wrong": bad}


KN = re.compile(r"[ಀ-೿]")


def check_kannada(en_turns: list[Turn], kn_turns: list[Turn]) -> dict:
    """Machine-checkable Kannada checks ONLY. Semantic quality and pronunciation need fluent humans (UNVERIFIED)."""
    kn_text = " ".join(t.text for t in kn_turns)
    letters = [c for c in kn_text if c.isalpha()]
    kn_ratio = sum(bool(KN.match(c)) for c in letters) / max(1, len(letters))
    glossary = [v["kn"] for v in concept()["vocabulary"]]
    glossary_hits = [g for g in glossary if g in kn_text]
    en_q = [t.pause_question for t in en_turns if t.pause_question]
    kn_q = [t.pause_question for t in kn_turns if t.pause_question]
    same_numbers = len(en_q) == len(kn_q) and all(sorted(a.args) == sorted(b.args) and abs(a.answer - b.answer) < 0.011 for a, b in zip(en_q, kn_q))
    return {"kn_script_ratio": round(kn_ratio, 3), "uses_percent_term_ಶೇಕಡಾ": "ಶೇಕಡಾ" in kn_text,
            "glossary_terms_found": glossary_hits, "percent_symbol_preserved": "%" in kn_text,
            "pause_questions_en": len(en_q), "pause_questions_kn": len(kn_q), "same_numbers_en_kn": same_numbers,
            "semantic_review": "UNVERIFIED (needs fluent Kannada reviewer)", "pronunciation_review": "UNVERIFIED (needs fluent listener)"}


def check_course(c: Course) -> dict:
    facts = concept()["essential_facts"]
    text = " ".join([c.prerequisite_recap] + [m.objective + " " + " ".join(l.explanation for l in m.lessons) for m in c.modules])
    we_ids = {w["id"] for st in concept()["subtopics"].values() for w in st["worked_examples"]}
    used = {i for m in c.modules for l in m.lessons for i in l.uses_worked_example_ids}
    lowered = text.lower()
    return {
        "modules": len(c.modules),
        "subtopic_order_ok": len(c.modules) >= 4,
        "claimed_fact_coverage": sorted(set(c.covers_fact_indices) & set(range(len(facts)))),
        "fact_keyword_coverage": {
            "divide_by_100": bool(re.search(r"(/|÷|divided by|divide by)\s*100", lowered)),
            "old_value_base": "old" in lowered or "original" in lowered,
            "sheet_formula": "=b2*c2/100" in lowered.replace(" ", "") or "*c2/100" in lowered.replace(" ", ""),
        },
        "prereq_recap_mentions_fractions": bool(re.search(r"fraction|decimal", c.prerequisite_recap, re.I)),
        "worked_example_ids_valid": sorted(used & we_ids), "worked_example_ids_invented": sorted(used - we_ids),
        "inline_claims": check_inline_claims(text),
        "checkpoints": check_items([m.checkpoint for m in c.modules]),
    }
