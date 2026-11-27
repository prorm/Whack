# CAPABLE

Employer demand → a shared capability graph → the shortest path from what you've proven → practice in work labs (with AI Pair) → unseen work graded by code → a signed, revocable receipt → opportunities. When a role changes, only the delta is relearned.

## Layout
- `app/` — the product: Vite + React + TS PWA. `npm run demo` (build + server on :4173), `npm run test:all` (65 tests), `npm run lint`.
  - `src/sp/` — the shell: Learn `#/home`, Revise, Proof, Jobs, Teach, the employer seat and public share view.
  - `src/flux/learn/` — FLUX Learn, the primary learning experience (`#/fl-course`, `#/fl-lesson?id=l1..l5`, `#/fl-project`). Curriculum is pure data in `course.ts`; `course.test.ts` checks narration numbers against `physics.ts`.
  - `src/flux/` — engine: `physics.ts`, `memory.ts` (1/3/7/21 ladder), `assess.ts` (seeded graders shared with the server), `passport.ts`, `skills.ts`, `goal.ts`; story episodes (`#/flux-solar`, `#/flux-pay`, `#/flux-ev` via JSON Lab Blueprints), revision reels (`#/flux-reels`), Field Scars (`#/flux-studio`, `#/flux-queue`).
  - `src/os/` — capability layer (`npm run test:os`): `taxonomy.ts`, `compiler.ts`, `path.ts`, `market.ts`, `evidence.ts`, `codelab.ts`, `datalab.ts`, `aipair.ts`; UI in `os/ui/` (`#/gps`, `#/demand`, `#/codelab`, `#/datalab`, `#/ailab`, `#/exchange`).
  - `src/capable/` — TradeLab: Practical Arena (3D), Solar Forge, Mentor, lab fault notes, signed receipts (`#/capable*`).
  - `sw-template.js` + `vite.config.ts` plugin — generated service worker precaching every built and public file.
- `scripts/capable_server.mjs` — static server + SQLite API. `capable_upgrade.mjs` issues/grades/signs lab trials; `codelab_sandbox.mjs` runs learner code. `capable_gemini.mjs` is the budgeted Gemini client (compiler second opinion, Mentor).
- `remotion/` — the CAPABLE X film only (`src/capx/`). Narration `scripts/capable_x_vo.py`, score `scripts/capx_score.mjs`, render `npm run render --prefix remotion` → `out/CAPABLE-X-Film.mp4` (gitignored).
- Media scripts (Python, `google-genai`): `scripts/course_tts.py`, `flux_media.py`, `motion_plates.py` use `core/` (`cost_ledger.py`, `settings.py`, `vertex_client.py`) and `config/models.json`. Caches live in `outputs/` (gitignored) and are reused at $0.
- Docs: `reports/final/CAPABLE_X_PITCH.md` (pitch + demo), `CAPABLE_X_PLAN.md`, `CAPABLE_A_TO_Z.md`, `PILOT_PLAN.md`.

## Product rules (never break)
- Only graded unseen work is evidence. Lessons, reels, watch time and feed answers never award anything.
- A capability with `proof.kind 'pending'` has no validated assessment and can never be awarded; the UI says so.
- Trainer review binds to the exact attempt id and evidence fingerprint; a new attempt or new evidence detaches it. Identity is never claimed as verified.
- Hazardous capabilities only ever lead to a supervised outcome; `site-safety` is in-person only.
- Every demo person, organization, listing, trainer and master is fictional and labelled DEMO. Never use real company names as demo employers. The employer seat is a same-device preview: nothing is sent.
- Share links are re-graded on the server from seed + raw answers; revoke makes them 410.
- Lab seeds for verified trials (CodeLab, DataLab, AI Pair code) stay on the server. CodeLab learner code runs only in the sandbox (`--permission`, no string code generation, 4 s kill). Never add `eval`.
- AI never grades and is never ground truth. AI Pair's assistant is a labelled scripted simulation; its traps must pass every visible test and fail a hidden one (tested). `/api/capable/compile` (Gemini) may only propose existing graph ids.
- Reels are revision only: only concepts already learned appear; a missed question moves its callback reel to the top in a LATER session.

## Vertex AI routing
- Gemini 3.x (text, image) → `location="global"`. Veo / Imagen → `VERTEX_MEDIA_LOCATION` (us-central1). Two clients in `core/vertex_client.py`.
- Never hardcode model ids: add them to `config/models.json` roles; `probe()` resolves available ids and logs fallbacks.
- Image models hit per-minute 429s: keep `with_backoff`.

## Budget safety
- Every paid call goes through `CostLedger` (`reports/cost_log.jsonl`, cumulative). `guard()` refuses past `MAX_TEST_BUDGET_USD`.
- Veo calls are refused unless `ENABLE_LIVE_VIDEO_GEN=true`. Ask the user before enabling it.

## Film
- Animations key off spoken words via `at(g, beat, "phrase")`. Change narration in `scripts/capable_x_vo.py`, then `node scripts/capx_score.mjs`, then render.
- Film numbers are the Work Compiler's real output on the Paylane DEMO requirement (4 tasks, 8 capabilities, 1 implied prerequisite; 7 shared; delta = linux/containers/ci-cd, all pending). Keep them in sync if `market.ts`/`taxonomy.ts` change.
- Product footage in `remotion/public/capx/cap/` is recorded from the running app. Film is 9:04; the pitch close plays 8:50–9:04.

## History
Older product generations (ScrollProof meme reels, careers, moonshot, Scroll Fuel + extension, the feasibility lab, old films and decks) were moved to `D:\Whackiest26_archive\2026-11-28\` on 2026-11-28 and are no longer part of the repo.
