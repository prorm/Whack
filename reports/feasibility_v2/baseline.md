# Baseline: repository audit (Phase 0)

Audited 2026-11-24 before any v2 change. Nothing below is inferred from the earlier prompt; each line was checked.

## What exists

| Area | Location | State at audit |
|---|---|---|
| Product PWA | `app/` (Vite 8, React 19, TypeScript 7) | Builds clean (`npm run build`). oxlint: 0 errors, 3 warnings. Hand-written service worker generated at build (`sw-template.js` + plugin in `vite.config.ts`). |
| Washer work-order flow | `app/src/domain.ts`, `screens.tsx` | Deterministic grading, review bound to attempt+evidence, consent-gated contractor preview, demo labels. |
| Reel feed | `app/src/Feed.tsx` | 4 authored reels, scroll-snap, wheel/keyboard nav, one personalisation rule (missed quiz -> callback first in a later session). |
| Feasibility lab v1 | `core/`, `schemas/`, `scripts/run_feasibility.py`, `config/models.json` | Python 3.12 venv; compiles. Cost ledger `reports/cost_log.jsonl`. |
| Reel pipeline | `scripts/make_reel_assets.py`, `reel/` (Remotion 4.0.546) | `npx tsc --noEmit` clean. Flagship reel `outputs/reels/scrollproof_reel_share.mp4` (9.6 MB) + master (47.4 MB). |
| Cached media | `outputs/reel_assets/v1..v3_*.mp4` (3 Veo 3.1 Lite clips, 2.6–4.6 MB), `outputs/assets/*.png` (Gemini images) | Present, reused in v2, never regenerated or overwritten. |

## Baseline health

| Check | Result |
|---|---|
| App production build | pass (507 ms) |
| App lint | 0 errors, 3 warnings (react set-state-in-effect, only-export-components) |
| Reel type-check | pass |
| Python compile | pass |
| **Automated tests** | **None existed.** All earlier verification was scripted browser checks, not a re-runnable suite. |

## Ledger reconciliation

`reports/cost_log.jsonl` at audit: 63 rows, **$0.615**, 2 failed (unbilled) rows. By modality: text $0.085, image $0.170, video $0.360.
The brief reports $0.62; the v2 budget guard uses **max(ledger, 0.62) = $0.62** as the conservative pre-v2 figure.

## Capabilities already demonstrated before v2 (re-checked here, not assumed)

| Claim from earlier work | Re-checked in v2? |
|---|---|
| Gemini 3.8 Flash / 3.5 Flash-Lite reachable | Yes (model_inventory.md) |
| Veo 3.1 available | Yes, metadata only (no new Veo calls in v2) |
| Imagen 4 Fast unavailable | Yes, still 404 |
| Offline reload in Chrome | Yes, re-verified after v2 changes with the server killed (exp7) |
| Real-device mobile behaviour | No: still PENDING (real_device_checklist.md) |
| Kannada quality / pronunciation | No: still UNVERIFIED (needs fluent humans) |

## Tooling inventory

- Node 22.20 runs TypeScript tests natively (`node --test`, type stripping): no test dependency needed.
- Browser automation: Claude-in-Chrome (desktop Chrome, docked window: phone viewports emulated with a 390×844 same-origin iframe; this is NOT a device test).
- Accessibility: axe-core 4 added as an app devDependency during v2 (not previously available).
- ffmpeg full build present; Remotion's bundled headless Chrome present.
- No Playwright/Puppeteer; no CDP network throttling. Slow-network tests use a fault-injecting static server (`scripts/v2_static_server.mjs`: per-request latency, media 404s). Bandwidth throttling was not possible.
