---
name: trend-genome-miner
description: Turn a viral short-form format (a local mp4 or a text description) into a validated TrendGenome JSON in trends/registry or trends/mined. Use when adding a new meme format to CAPABLE.
---

# Trend Genome Miner

1. Input: a local `.mp4` (< 18 MB, sent inline) or a text description of the format.
2. Run `core.trend_miner.mine_trend(vc, video_path=... | description=...)`. It uses the `trend_miner` role (gemini-3.8-flash, global) with `schemas/trend_genome.py::TrendGenome` as the response schema.
3. Review before saving to `trends/registry/`:
   - Characters are ORIGINAL. No real people, celebrities, film characters, platform names/logos (e.g. describe "generic blocky avatar", never a platform's avatar).
   - Audio is described as a vibe; no copyrighted track names.
   - `character_sheet_prompt` asks for a single full-frame hero shot. The phrase "reference sheet" makes image models draw labelled turnaround sheets with garbled text.
   - `reusable_broll_prompts` are 4–8 s loopable 9:16 plates (cached once, reused across many lessons).
   - `teaching_fit` says which concept shapes the format suits (calm boss → first exposure; chase → callback).
4. Validate: `python -c "from schemas.trend_genome import TrendGenome; TrendGenome.model_validate_json(open(p).read())"`.
