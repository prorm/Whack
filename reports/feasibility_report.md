# CAPABLE feasibility report

_Generated 2026-11-23 23:53 by `scripts/run_feasibility.py`. Backend: `vertex:hackathons-512621 text@global media@us-central1`._

**Cumulative measured spend (all runs, `reports/cost_log.jsonl`): $0.1943** of the $5.00 kill-switch.

## 1. Preflight

- Python 3.12.13; ffmpeg: yes; auth: True
- Deps: google.genai 3.6.1, pydantic 2.14.4, dotenv ok, edge_tts 7.3.1, rich ok

| Role | Resolved model | Note |
|---|---|---|
| trend_miner | `gemini-3.8-flash` | first choice |
| storyboard | `gemini-3.5-flash-lite` | first choice |
| image_anchor | `gemini-3.1-flash-lite-image` | FALLBACK from imagen-4.0-fast-generate-001 |
| image_edit | `gemini-3.1-flash-lite-image` | first choice |
| video_lite | `veo-3.1-lite-generate-001` | first choice |
| video_fast | `veo-3.1-fast-generate-001` | first choice |

Not available in this project: `imagen-4.0-fast-generate-001`.

| Model | TTFT (ms) | Total (ms) |
|---|---|---|
| `gemini-3.5-flash-lite` | 1052 | 1348 |
| `gemini-3.8-flash` | 1458 | 1710 |

## 2. Storyboard benchmark (structured JSON + deterministic QA)

| Test | Model | Tries | Schema | QA | Protected terms | Latency (ms) | Tokens in/out/think | Cost | Notes |
|---|---|---|---|---|---|---|---|---|---|
| React useEffect x Sheru Bhai | `gemini-3.5-flash-lite` | 1 | valid | pass | 3/3 | 7790 | 2813/2758/0 | $0.00774 | - |
| Excel VLOOKUP x Huss Valley | `gemini-3.5-flash-lite` | 1 | valid | pass | 3/3 | 6900 | 2792/2216/0 | $0.00638 | - |
| Washer sizing x Sheru Bhai (CAPABLE slice) | `gemini-3.5-flash-lite` | 1 | valid | pass | 4/4 | 44393 | 2867/2190/0 | $0.00634 | - |

Trend miner (text description -> TrendGenome): ok, `gemini-3.8-flash`, 7760 ms, $0.00341, genome `chef_cat_disaster_fix`

TTS (edge-tts, free test voice): react_sheru: ok 5915 ms, excel_huss: ok 8563 ms, plumbing_sheru: ok 6471 ms

## 3. Visual consistency (images)

| Asset | Model | OK | Latency (ms) | Size (KB) | Cost |
|---|---|---|---|---|---|
| sheru_anchor | `gemini-3.1-flash-lite-image` | True | 3016 | 179 | $0.034 | 
| huss_anchor | `gemini-3.1-flash-lite-image` | True | 5607 | 134 | $0.034 | 
| sheru_react_bug | `gemini-3.1-flash-lite-image` | True | 30484 | 208 | $0.034 | 
| sheru_washers | `gemini-3.1-flash-lite-image` | True | 58701 | 202 | $0.034 | 

Identity consistency is a human judgement: open `outputs/assets/sheru_bhai_anchor.png` next to the two edits.

## 4. Video feasibility (Veo 3.1)

_Not run yet (`--tier video`)._

## 5. Tier comparison (measured)

| Tier | What is fresh per reel | Cost / reel | Generation latency | Payload to phone |
|---|---|---|---|---|
| A canvas_lite | storyboard JSON only | $0.0068 | 19.7 s (+TTS 7.0 s) | 6.9 KB JSON |
| B hybrid, cached plates | storyboard; plate + keyframe from cache | $0.0068 + one-off plate cost | 19.7 s + compose 4.1 s | n/a plate (cached once) + JSON, or 0.94 MB mp4 |
| B hybrid, 1 fresh keyframe | storyboard + 1 image edit | $0.0408 | 44.1 s | + ~181 KB image |
| C veo_hero | storyboard + 4 s Veo Lite | $0.2068 (brief price) | not measured (Veo not run) | n/a |

One-off cache cost for 20 reusable plates + anchors: **$4.07** (brief price Veo Lite cost per 4 s plate).

### Projected monthly cost (30 reels per learner per month)

| Active learners | Reels / month | Tier A | Tier B cached | Tier B + fresh keyframe | Tier C per-reel Veo |
|---|---|---|---|---|---|
| 100 | 3,000 | $20.45 | $24.52 | $126.52 | $620.45 |
| 1,000 | 30,000 | $204.52 | $208.58 | $1,228.58 | $6,204.52 |
| 10,000 | 300,000 | $2,045.16 | $2,049.23 | $12,249.23 | $62,045.16 |

Storyboards are compiled once per (skill, trend, language) and can be cached across learners, so real Tier A/B costs fall further; the table assumes a fresh storyboard per reel (worst case). edge-tts is a free test voice; a production TTS bill is not included.

## 6. Learner model (local simulation, no API)

- Format affinity after 6 sessions: `{'roblox_huss': 0.683, 'sheru_bhai': 0.5}`
- Callbacks scheduled into a different meme than the last exposure: 6/6

## 7. Recommendation

- **Storyboard compiler: GO.** 3/3 schema-valid, 3/3 passed deterministic QA on the final try. Keep the QA gate in front of any media spend.
- **Character anchors / edits: GO** (4 images). Imagen 4 Fast was not enabled in this project; the Gemini image fallback worked.
- **Hackathon MVP:** ship Tier A (canvas/CSS + authored storyboard JSON) as the default feed and offline path, use Tier B (cached Veo plate + anchor keyframe + captions) for the hook reels, and keep Tier C for one stage-demo hero clip. Credentials come only from the trainer-reviewed work order, never from feed answers.

## 8. Artifacts

- Preview player: `outputs\preview_player.html` (open in a browser; swipe, tap to play)
- Storyboards: `outputs/storyboards/*.json`; reels: `outputs/reels/*.mp4`; media: `outputs/assets/`
- Per-call ledger: `reports/cost_log.jsonl`; model probe: `reports/model_probe.json`
