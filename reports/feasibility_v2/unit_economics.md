# Unit economics (Experiment 8)

**Measured** = from `reports/cost_log.jsonl` / `results.jsonl` in this project. **Assumed** = a declared planning variable, not a measurement.
Provider prices come from `config/models.json`; entries marked `assumed` there were never verified against a price sheet.

## Measured unit costs

| Operation | USD | Source |
|---|---|---|
| opportunity_spec_flash_lite | 0.00119 | measured |
| opportunity_spec_3_1_lite | 0.00102 | measured |
| opportunity_spec_3_8_flash | 0.00245 | measured |
| concept_compile_9_calls_flash_lite | 0.02403 | measured |
| concept_compile_9_calls_3_8_flash | 0.04635 | measured |
| tts_line_5_8s | 0.00146 | measured |
| storyboard_llm_per_reel_v1 | 0.00680 | measured |
| veo_lite_4s_silent | 0.12000 | measured |
| image_edit | 0.03400 | measured |
| reel_plan_deterministic | 0.00000 | measured |

## Measured payload sizes

| Item | Bytes |
|---|---|
| reel_spec_json | 462 |
| server_rendered_mp4_10s | 6,800,024 |
| cached_clips_total | 774,993 |
| precache_total | 1,499,865 |
| render_seconds_per_10s_reel | 71.941 |

## Assumptions (edit and re-run)

```json
{
 "reel_impressions_per_learner_month": 60,
 "lessons_per_learner_month": 8,
 "assessments_per_learner_month": 4,
 "opportunity_specs_per_learner_month": 1,
 "concepts_in_catalogue": 50,
 "reusable_veo_plates": 20,
 "character_images": 10,
 "bandwidth_usd_per_gb": 0.08,
 "render_cpu_usd_per_hour": 0.05,
 "render_vcpus": 2,
 "infra_flat_usd_month": {
  "100": 10,
  "1000": 40,
  "10000": 250
 },
 "tts_share_of_reels_arch_c": 0.0,
 "llm_feedback_per_assessment_usd": 0.0011865714285714285
}
```

## One-time shared generation (catalogue)

| Item | USD |
|---|---|
| concept compile (all modes, 3.8 Flash) x concepts | 2.32 |
| reusable Veo Lite plates | 2.40 |
| character images | 0.34 |
| **Total one-time** | **5.06** |

## Per-learner monthly cost by architecture (projection)

| Architecture | Cache hit | Content gen | Render | Bandwidth | Assessment | Opportunity | **Total / learner / month** |
|---|---|---|---|---|---|---|---|
| A: fresh AI media per learner | 10% | 6.9261 | 0.1079 | 0.0304 | 0.0047 | 0.0012 | **7.0704** |
| A: fresh AI media per learner | 50% | 3.8479 | 0.0600 | 0.0304 | 0.0047 | 0.0012 | **3.9441** |
| A: fresh AI media per learner | 90% | 0.7696 | 0.0120 | 0.0304 | 0.0047 | 0.0012 | **0.8179** |
| B: shared lessons + personalised text/TTS (server mp4) | 10% | 0.4461 | 0.1079 | 0.0304 | 0.0047 | 0.0012 | **0.5904** |
| B: shared lessons + personalised text/TTS (server mp4) | 50% | 0.2479 | 0.0600 | 0.0304 | 0.0047 | 0.0012 | **0.3441** |
| B: shared lessons + personalised text/TTS (server mp4) | 90% | 0.0496 | 0.0120 | 0.0304 | 0.0047 | 0.0012 | **0.0979** |
| C: cached media + dynamic overlays | 10% | 0.0000 | 0.0000 | 0.0001 | 0.0047 | 0.0012 | **0.0060** |
| C: cached media + dynamic overlays | 50% | 0.0000 | 0.0000 | 0.0001 | 0.0047 | 0.0012 | **0.0060** |
| C: cached media + dynamic overlays | 90% | 0.0000 | 0.0000 | 0.0001 | 0.0047 | 0.0012 | **0.0060** |

## Monthly totals at scale (projection, 50% cache hit, incl. assumed infra)

| MAU | A | B | C |
|---|---|---|---|
| 100 | $404 | $44 | $11 |
| 1,000 | $3,984 | $384 | $46 |
| 10,000 | $39,691 | $3,691 | $310 |

Infra overhead is an assumed flat figure per tier (see assumptions). One-time catalogue cost is excluded from monthly rows.

## Sensitivity: cache hit 10% vs 90% (per learner / month)

- A: $7.0704 at 10% -> $0.8179 at 90% (8.6x)
- B: $0.5904 at 10% -> $0.0979 at 90% (6.0x)
- C: $0.0060 at 10% -> $0.0060 at 90% (1.0x)

## Reading this honestly

- The dominant cost driver in A is the Veo clip per reel; in B it is server rendering + MP4 bandwidth, not the LLM text; in C it is the one-time precache download.
- C's per-learner AI cost is ~0 because reels are planned deterministically on device; the trade-off is less variety (limited to template x concept combinations).
- None of these numbers include human trainer review time, which is the real per-credential cost (not measured here).
- These are projections from measured unit costs and assumed usage; they are not production measurements.
