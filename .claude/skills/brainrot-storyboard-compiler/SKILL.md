---
name: brainrot-storyboard-compiler
description: Compile a Job Skill Node + TrendGenome + language mode (english/hinglish/kanglish) with protected_terms into a ReelStoryboard JSON with a CortisolLock and an UnseenJobTwinTask, gated by deterministic QA. Use when writing a new CAPABLE lesson reel.
---

# Brainrot Storyboard Compiler

Call `core.storyboard_compiler.compile_storyboard(vc, job_role, skill, trend_id, language, protected_terms, tier)`.

Rules the prompt enforces and `schemas/storyboard.py::quality_checks` verifies:
- 15 000 ms, 4–6 contiguous scenes, hook inside the first 1 500 ms.
- Captions carry ALL essential information (sound-off viewing); caption word timestamps sit inside their scene.
- `protected_terms` appear verbatim (never translated) in captions, TTS or the code overlay.
- The lesson example and the Unseen Job Twin use different values; the twin must not reveal its answer and must not copy the reel's artifact.
- Cortisol Lock: 2–4 options, 5–8 s, an in-character roast for fast-wrong, one-line explanation.
- Humour mocks the mistake, never the learner.

Language modes are romanised code-mix (Latin script). Technical terms stay English.

Never spend image/video money on a storyboard that failed QA. Known weak spot (measured): slang can read as keyword-stuffed; tune `slang_markers` in the genome before tuning the compiler.

In the product (`app/`) storyboards are authored and bundled, not generated at runtime, and nothing in a reel can award a credential.
