---
name: vertex-media-budget-guard
description: Choose ScrollProof render tier A (canvas), B (cached plate + keyframe) or C (per-reel Veo) and run paid Vertex image/video calls safely through the CostLedger. Use before any Imagen/Gemini-image/Veo call.
---

# Vertex Media Budget Guard

## Tier choice
| Tier | Fresh per reel | Use for |
|---|---|---|
| A canvas_lite | storyboard JSON only (~$0.007) | default feed, offline, 3G |
| B hybrid_composite | storyboard; plate + character keyframe from cache | hook reels, callbacks |
| C veo_hero | a new 4–8 s Veo clip | one stage-demo hero clip, never per learner |

Veo takes minutes per clip: it is an offline cache-builder, never something a learner waits for.

## Before any paid call
1. `python scripts/run_feasibility.py --dry-run` (free: auth, model probe, projected spend).
2. Check `reports/cost_log.jsonl` cumulative spend vs `MAX_TEST_BUDGET_USD`.
3. Image calls: `VertexClients.generate_image` (budget-guarded, 429 backoff). Imagen 4 Fast is not enabled in this project; the probe falls back to `gemini-3.1-flash-lite-image`.
4. Video calls: only with `ENABLE_LIVE_VIDEO_GEN=true` **and the user's explicit go-ahead for that spend**. Use 4 s, 720p, `veo-3.1-lite-generate-001` first; image-condition on the cached anchor for identity.
5. Reuse: assets in `outputs/assets/` are cached; the image phase skips anything already generated.
