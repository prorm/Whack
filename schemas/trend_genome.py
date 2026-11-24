"""TrendGenome: the reusable 'grammar' of a viral short-form format."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TrendGenome(BaseModel):
    id: str = Field(description="snake_case id, e.g. sheru_bhai")
    name: str
    visual_dna: list[str] = Field(description="Concrete, repeatable visual tropes: character, wardrobe, set, lighting, camera moves")
    character_sheet_prompt: str = Field(description="One image prompt for a canonical 9:16 character reference sheet")
    audio_vibe: str = Field(description="Music/SFX/voice texture; describe it, never copy a copyrighted track")
    bpm: int = Field(ge=40, le=220)
    cut_cadence_sec: float = Field(gt=0, le=10, description="Average seconds between cuts")
    hook_formula: str = Field(description="What happens in the first 1.5 s that stops the scroll")
    slang_markers: list[str] = Field(description="Catchphrases / code-mixed slang that signal the format")
    reusable_broll_prompts: list[str] = Field(description="Prompts for 4-8 s loopable plates that can be cached and reused across many lessons")
    retention_psychology: str = Field(description="Why this format sticks: arousal, absurdity, status, rhythm, callback potential")
    teaching_fit: list[str] = Field(default_factory=list, description="Concept shapes this format teaches well, e.g. bug -> fix")
    safety_notes: list[str] = Field(default_factory=list, description="Brand/IP/likeness guardrails for generation")
