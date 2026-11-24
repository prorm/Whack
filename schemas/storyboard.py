"""ReelStoryboard: a compiled ~15 s vertical lesson, render-tier agnostic."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

LanguageMode = Literal["english", "hinglish", "kanglish"]
RenderTier = Literal["canvas_lite", "hybrid_composite", "veo_hero"]


class CaptionWord(BaseModel):
    word: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    emphasis: bool = Field(description="True for protected terms and punchline words")


class Scene(BaseModel):
    scene_id: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    visual_layer: str = Field(description="What is on screen: plate/keyframe/canvas description")
    broll_plate_id: str = Field(description="Id of a cached reusable plate from the genome, or 'none'")
    keyframe_prompt: str = Field(description="Image prompt for an optional fresh keyframe, or 'none'")
    caption_words: list[CaptionWord]
    tts_script: str = Field(description="Exactly what the voice says in this scene")
    sfx_cue: str
    meme_overlay: str = Field(description="Sticker / text overlay, or 'none'")
    code_overlay: str = Field(description="Code, formula or spec card shown on screen, or 'none'")

    @model_validator(mode="after")
    def _order(self) -> "Scene":
        if self.end_ms <= self.start_ms:
            raise ValueError(f"scene {self.scene_id}: end_ms must be > start_ms")
        return self


class CortisolLock(BaseModel):
    prompt: str = Field(description="One-line reflex question")
    options: list[str] = Field(min_length=2, max_length=4)
    correct_index: int = Field(ge=0)
    time_limit_sec: int = Field(ge=5, le=8)
    fast_wrong_roast: str = Field(description="3 s in-character roast shown on a wrong answer")
    explanation: str

    @model_validator(mode="after")
    def _idx(self) -> "CortisolLock":
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index out of range")
        return self


class RubricItem(BaseModel):
    criterion: str
    points: int = Field(ge=1, le=10)


class UnseenJobTwinTask(BaseModel):
    title: str
    scenario: str = Field(description="A realistic work situation using DIFFERENT values/examples from the reel")
    artifact_type: Literal["code_fix", "spreadsheet_fix", "part_selection", "voice_defense"]
    starter_artifact: str = Field(description="The broken snippet / sheet rows / work-order spec the learner must act on")
    success_criteria: list[str]
    rubric: list[RubricItem]
    must_differ_from_reel: str = Field(description="How this task differs from the example taught in the reel")


class ReelStoryboard(BaseModel):
    sprint_id: str
    job_role: str
    skill_node: str
    trend_id: str
    language_mode: LanguageMode
    protected_terms: list[str] = Field(description="Exact technical terms that must appear verbatim (never translated)")
    render_tier: RenderTier
    duration_ms: int = Field(ge=8000, le=20000)
    scenes: list[Scene] = Field(min_length=3, max_length=8)
    cortisol_lock: CortisolLock
    unseen_job_twin_task: UnseenJobTwinTask


def quality_checks(sb: ReelStoryboard) -> dict:
    """Deterministic checks the LLM output must pass before media money is spent on it."""
    issues: list[str] = []
    scenes = sorted(sb.scenes, key=lambda s: s.start_ms)
    if scenes[0].start_ms > 500:
        issues.append("first scene starts late (>500 ms): weak hook")
    for a, b in zip(scenes, scenes[1:]):
        if b.start_ms < a.end_ms - 50:
            issues.append(f"scenes {a.scene_id}/{b.scene_id} overlap")
        if b.start_ms - a.end_ms > 600:
            issues.append(f"gap between {a.scene_id} and {b.scene_id}")
    if scenes[-1].end_ms > sb.duration_ms + 500:
        issues.append("last scene runs past duration_ms")
    haystack = " ".join(
        [s.tts_script for s in sb.scenes]
        + [w.word for s in sb.scenes for w in s.caption_words]
        + [s.code_overlay for s in sb.scenes]
    ).lower()
    missing = [t for t in sb.protected_terms if t.lower() not in haystack]
    if missing:
        issues.append(f"protected terms missing verbatim: {missing}")
    bad_words = sum(
        1
        for s in sb.scenes
        for w in s.caption_words
        if w.end_ms < w.start_ms or w.start_ms < s.start_ms - 50 or w.end_ms > s.end_ms + 50
    )
    if bad_words:
        issues.append(f"{bad_words} caption words fall outside their scene window")
    lock = sb.cortisol_lock
    reel_text = " ".join(s.code_overlay + " " + s.tts_script for s in sb.scenes).lower()
    twin_reuses_reel = sb.unseen_job_twin_task.starter_artifact.strip().lower() in reel_text
    if twin_reuses_reel:
        issues.append("job twin starter artifact is copied from the reel (not unseen)")
    return {
        "passed": not issues,
        "issues": issues,
        "scene_count": len(sb.scenes),
        "caption_word_count": sum(len(s.caption_words) for s in sb.scenes),
        "protected_terms_preserved": len(sb.protected_terms) - len(missing),
        "protected_terms_total": len(sb.protected_terms),
        "lock_options": len(lock.options),
    }
