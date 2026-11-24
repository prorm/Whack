"""Trend Genome Miner: local mp4 or a text description -> validated TrendGenome JSON."""
from __future__ import annotations

import json
from pathlib import Path

from google.genai import types

from schemas.trend_genome import TrendGenome

from .vertex_client import VertexClients

MINER_PROMPT = """You are a short-form video format analyst. Extract the reusable GRAMMAR of this viral format
so a teaching engine can re-use it for vocational and technical lessons.

Rules:
- Describe repeatable tropes (character, wardrobe, set, camera, pacing, audio texture), not one specific video.
- Characters must be ORIGINAL: never name or depict real people, celebrities, film characters, or brand logos.
- Describe audio as a vibe; never name or reproduce a copyrighted track.
- reusable_broll_prompts: 2-3 prompts for 4-8 s loopable vertical 9:16 plates that can be cached and reused across lessons.
- teaching_fit: which concept shapes this format teaches well.
- Return JSON only, matching the schema.
"""


def mine_trend(vc: VertexClients, *, description: str | None = None, video_path: Path | None = None,
               test: str = "trend_miner") -> tuple[TrendGenome, dict]:
    contents: list = [MINER_PROMPT]
    if video_path:
        data = Path(video_path).read_bytes()
        if len(data) > 18 * 1024 * 1024:
            raise ValueError("Inline video must be < 18 MB; upload to GCS for larger files")
        contents.append(types.Part.from_bytes(data=data, mime_type="video/mp4"))
    if description:
        contents.append(f"Format description:\n{description}")
    raw, meta = vc.generate_json("trend_miner", contents, TrendGenome, test=test, temperature=0.4)
    genome = TrendGenome.model_validate(json.loads(raw))
    return genome, meta
