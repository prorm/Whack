# CAPABLE

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

## FLUX learning engine (2026-11-24): see reports/flux/README.md
- `app/src/flux/`: `physics.ts` (solar string rules, work-order generator, misconception detector) and `memory.ts` (1/3/7/21 ladder, battery, callback ordering) are pure and tested (`npm run test:flux`). UI: `Flux.tsx` hub, `Episode.tsx` (solar), `PayLab.tsx` (payments), `Rooftop.tsx` sim, `Reels.tsx` feed. Routes `#/flux`, `#/flux-solar`, `#/flux-pay`, `#/flux-reels`.
- Media comes from `scripts/flux_media.py` (cached in `outputs/flux/`, shipped compressed to `app/public/media/flux/`). Never bake numbers into media.
- Field Scars (UGC): `cards.ts` (provenance + No Passive Scroll validator), `sieve.ts` (AI-marker/duplicate/unsafe-procedure screen), `community.ts` (2-of-3 master review, challenge → patch/retire), `Studio.tsx` (#/flux-studio, gated by a beaten work order), `Queue.tsx` (#/flux-queue). Masters, vouches and bounties are same-device DEMO.
- Lab Blueprints: `blueprint.ts` (whitelisted expressions, code gate = blueprint tests must pass) + `BlueprintEpisode.tsx`. New threshold episodes are JSON in `app/src/flux/blueprints/` (EV: #/flux-ev). Never add `eval`.
- Scroll Fuel: `fuel.ts` (tank/earn/escape/mercy rules, tested), `fuelStore.ts`, `Gate.tsx` (#/flux-gate tollbooth), `ScrollFuel.tsx` (#/flux-fuel + simulator). Browser extension: `extension/src/content.js` + `scripts/build_extension.mjs` → `extension/dist` (gitignored). Unlocks accepted only from our own iframe + nonce. Toll answers never award anything. `android-gate/` is an uncompiled skeleton.

## UnlockED final (2026-11-24): see reports/final/
- One product: CAPABLE (`app/src/sp/Sp.tsx`: Learn `#/home`, Jobs, Passport, Teach, Employer seat) on the FLUX engine. Old career home moved to `#/careers`. Meme/"Sheru bhai" reels are retired from the product path.
- Pure, tested core (`npm run test:flux` → `proof.test.ts`): `skills.ts` (competency graph + DEMO jobs + `matchJob`), `assess.ts` (seeded graders, shared with the server), `passport.ts` (records, fingerprint, levels, review binding, consent), `goal.ts` (opportunity-driven feed ranking). Store: `passportStore.ts`.
- Motion reels (`app/src/flux/motion/`): SVG motion graphics driven by physics.ts; setup → forced prediction → payoff. Veo plates (`scripts/motion_plates.py`, `app/public/media/motion/`) are backdrops only and badged.
- Server: `/api/proof/share` re-grades from seed + raw answers, `/api/proof/revoke`, `GET /api/proof/public/<token>` (410 after revoke).
- Hazardous competencies always force a supervised outcome; `site.safety` is in-person only and never evidenced in-app.
- Demo: `cd app && npm run demo`, then `#/home?demo=seed` / `#/home?demo=reset`. Walkthrough: `scripts/verify_unlocked.mjs`; video: `scripts/record_demo.mjs`.

## Product hierarchy (2026-11-24, supersedes "reels as the learning path")
- **FLUX Learn is the primary learning experience** (`app/src/flux/learn/`, home `#/home`, lessons `#/fl-lesson?id=l1..l5`, project `#/fl-project`). Narrated interactive lessons: teach → predict → experiment → trace → test → train → guided ticket → project. Curriculum is pure data in `course.ts`, tested by `course.test.ts` (narration numbers must match physics.ts).
- **Reels are revision only** (`#/flux-reels`, tab "Revise"): only concepts already in memory appear; motion-reel quizzes are optional. Never make reels the way a concept is first taught.
- Narration: `scripts/course_tts.py` (Chirp3-HD `en-IN-Charon`, cost-logged) → `app/public/media/learn/vo_<id>.m4a` + `vo.json`. Change a line in `script.json` → re-run it.
- House style for Learn = FACELESS AI Day 4/6 look: navy stage, mood tint, grid floor, glass panels, rolling mono numbers, karaoke captions.
