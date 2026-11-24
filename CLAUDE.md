# ScrollProof

Learn a trade skill in a meme-format reel feed → prove it on an unseen work order → trainer reviews practical evidence → proof passport → local job match.

## Layout
- `app/` — the product: Vite + React + TS PWA (feed, work order, evidence, trainer demo view, passport, contractor preview). No runtime AI calls. `npm run build && npx vite preview --port 4173`.
  - `src/domain.ts` — all grading / binding / matching rules (pure, deterministic). Change rules here only.
  - `sw-template.js` + `vite.config.ts` plugin — generated service worker precaching every built and public file.
- Feasibility lab (Python, `google-genai` only): `core/`, `schemas/`, `trends/registry/`, `config/models.json`, `scripts/run_feasibility.py`. Outputs to `outputs/`, reports to `reports/`.

## Product rules (never break)
- A credential exists only when: simulation passed AND an approved trainer review is bound to that exact attempt id AND evidence id, with all four checklist items ticked. Feed answers and watch time never award anything.
- Replacing evidence or starting a new attempt detaches any earlier review.
- Demo people, listings, reviewer and the evidence fixture are always visibly labelled DEMO.
- Contractor view is a same-device preview: no outbound messages, no fake sharing. Evidence shows there only with explicit learner opt-in.
- Personalisation is one rule: a missed in-feed question moves that skill's callback reel to the top in a LATER session.

## Vertex AI routing (lab)
- Gemini 3.x (text, image) → `location="global"`. Veo / Imagen → `VERTEX_MEDIA_LOCATION` (us-central1). Two clients in `core/vertex_client.py`.
- Never hardcode model ids in code: add them to `config/models.json` roles; `probe()` resolves available ids and logs fallbacks (Imagen 4 Fast is 404 in this project → `gemini-3.1-flash-lite-image`).
- Image models hit per-minute 429s: keep `with_backoff`.

## Budget safety
- Every call goes through `CostLedger` (`reports/cost_log.jsonl`, cumulative). `guard()` runs before every paid image/video call and refuses past `MAX_TEST_BUDGET_USD`.
- Veo calls are refused unless `ENABLE_LIVE_VIDEO_GEN=true`. Ask the user before enabling it.
- Run `--dry-run` before any paid tier. Generated assets are cached in `outputs/assets/` and reused at $0.

## Feasibility v2 (2026-11-24) — see reports/feasibility_v2/FINAL_REPORT.md
- On-device engine (pure TS, offline): `app/src/engine/` — `graph.ts` (curated graph + percent calculator + misconception detector), `learner.ts` (event-sourced Learning Twin), `policy.ts` (rules R1–R7 + guarded bandit), `remix.ts` (Memory Remix planner), `proof.ts` (Proof Lab grading, evidence levels, audit, consent). Tests: `cd app && npm run test:engine` (node --test, no deps).
- Hand-authored ground truth lives in `content/` (competency graph, percentages ConceptSpec). Never replace it with model output.
- v2 LLM calls go through `core/v2_llm.py` (worst-case guard, +$2 v2 cap, $5 lifetime, disk cache). Prerequisites come from the graph, never from the model.
- Numbers in generated lessons must be {op, args}; code recomputes every answer. Prose and Kannada remain UNVERIFIED until a fluent human reviews them.
