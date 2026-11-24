"""Render tiers.

Tier A  canvas_lite       : no generated media; storyboard JSON drives a canvas/DOM renderer.
Tier B  hybrid_composite  : cached reusable Veo plate(s) + 0-2 fresh keyframes + TTS + live overlay.
Tier C  veo_hero          : a fresh per-reel Veo clip.

This module produces the generated layers (anchors, keyframes, plates); compositor.py assembles them.
"""
from __future__ import annotations

from pathlib import Path

from schemas.trend_genome import TrendGenome

from .settings import settings
from .vertex_client import VertexClients

ASSETS = settings().outputs_dir / "assets"


def character_anchor(vc: VertexClients, genome: TrendGenome, test: str = "image_anchor") -> dict:
    """One canonical 9:16 character reference per trend. Generated once, cached forever."""
    out = ASSETS / f"{genome.id}_anchor.png"
    return vc.generate_image("image_anchor", genome.character_sheet_prompt, out, test=test)


def scene_edit(vc: VertexClients, genome: TrendGenome, anchor_path: Path, instruction: str, name: str,
               test: str = "image_edit") -> dict:
    """Keep identity from the anchor, change pose/props for one lesson keyframe."""
    prompt = (f"Using the exact same character from the reference image (same face, mane, outfit, accessories and art style), "
              f"create a new vertical 9:16 frame: {instruction}. Keep identity consistent. No text, no logos.")
    out = ASSETS / f"{genome.id}_{name}.png"
    return vc.generate_image("image_edit", prompt, out, test=test, reference=anchor_path.read_bytes())


def broll_plate(vc: VertexClients, genome: TrendGenome, plate_index: int = 0, seconds: int = 4,
                role: str = "video_lite", image_path: Path | None = None, audio: bool = True,
                name: str | None = None, prompt_override: str | None = None, test: str = "video_plate") -> dict:
    prompt = prompt_override or genome.reusable_broll_prompts[plate_index]
    prompt += f" Audio: {genome.audio_vibe}. No dialogue, no on-screen text, no logos."
    out = ASSETS / f"{name or f'{genome.id}_plate_{plate_index}'}.mp4"
    return vc.generate_video(role, prompt, out, test=test, seconds=seconds, audio=audio,
                             image=image_path.read_bytes() if image_path else None)
