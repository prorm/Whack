# Failure analysis

## Hard failure gates

| # | Gate | Status | Evidence |
|---|---|---|---|
| 1 | Critical factual error in assessed content | **Not observed** in the 64 structured exercise items (all recomputed). Prose explanations: only 2 claims machine-checkable, so prose correctness is **UNVERIFIED**, not "passed". | exp3 rows in `results.jsonl` |
| 2 | Incorrect practical answer marked correct | **Not observed.** All grading is deterministic; AI feedback cannot change a status (tested). Ambiguous text routes to human review. | `proof.test.ts` |
| 3 | Private evidence exposed without consent | **Not observed.** Employer view returns null without consent (audited); video withheld until a credential exists; minimised projection tested for leaks. | `proof.test.ts`, existing contractor preview |
| 4 | Feed interaction granting a credential | **Not observed.** Feed answers do not move mastery; recall reels move mastery and the review schedule but never credentials; credentials need auto-check + human review bound to attempt + evidence. | `learner.test.ts`, `remix.test.ts`, `domain.test.ts` |
| 5 | Paid call without a cost guardrail | **Not observed in v2.** Every v2 call went through `V2LLM.guard` (worst-case estimate before the call) or the v1 `CostLedger.guard`. Two v2 TTS calls used `llm.guard` + `ledger.track` directly. | `core/v2_llm.py`, ledger rows with `est_worst_usd` |
| 6 | Claiming to verify skills without evidence | **Not observed.** Identity is always `not_verified`; human reviewer marked demo; evidence levels reported separately. | `proof.ts::levels` |
| 7 | Opportunity inventing salary / employer / requirements | **Not observed for pay, location or employer** (0/84). Requirement over-reach: 4 extra competencies in 84 runs, all on one case (opp12: `add_sub`/`mult_div` listed as requirements; low severity). | exp1 rows |
| 8 | Offline workflow silently losing progress | **Not observed** in desktop Chrome: events written synchronously to localStorage; offline reload kept lesson mode, answers, language and work-order result. Real-device storage eviction: **PENDING**. | exp7 rows |
| 9 | Cross-learner contamination | **Not observed.** Twin rejects other learners' events; reel planner reads one twin; answering another learner's reel throws (tested). Single-device app has one demo learner; multi-user server sync is **not built**. | `learner.test.ts`, `remix.test.ts` |

## Failures and weaknesses found (and what was done)

| Finding | Severity | Status |
|---|---|---|
| Messy WhatsApp shorthand under-extracted ("order check with bill" -> only `invoice_reading`; "excel basic must" -> missed data entry). Pass 1–2/6 across models. | Medium: recall, not hallucination | Open. Mitigation: show extracted competencies to the learner/poster for confirmation; add shorthand examples to the prompt. |
| Flash-Lite failed both Kannada-script cases (missed `invoice_reading` from "GST bill ಓದಲು"). 3.8 Flash passed both. | Medium | Open: use 3.8 Flash (or 3.1 Flash-Lite, 1/2) for Kannada-script inputs. |
| Quote verifier rejected valid voice evidence because transliteration differs ("madi" vs "maadi"). | Harness limitation | Open: voice provenance needs fuzzy transliteration matching or transcript-first. Counted as failures, not excused. |
| Model-guessed prerequisites missed ~3 graph prerequisites per case on average. | By design | Prerequisites come from the curated graph, not the model. |
| One correct diagnostic answer gave mastery 0.67 < threshold, so learners were re-taught what they had just shown they knew. | High (personalisation) | **Fixed** (correct diagnostic = provisional mastery, re-checked by retrieval). Caught by tests. |
| Retrying the same reel until correct could farm recall evidence. | Medium | **By design now:** only the first attempt per reel counts (idempotent event id); tested. |
| Repair reel quoted a textbook mistake, not the learner's own. | Low | **Fixed:** quotes the learner's own wrong answer; tested. Feedback text still uses the canonical example (open). |
| Feed `role="feed"` without `article` children: 2 critical axe violations. | Medium (a11y) | **Fixed**; 0 violations after. |
| Network-first navigation waits on a slow network. | Medium (weak connectivity) | **Fixed:** cached shell after 2.5 s. |
| Remix poster 404 left a broken image icon. | Low | **Fixed**; 0 broken images with all media 404. |
| Feed nav dots 32×32 px (< 44 px). | Low | Open (each reel has a 48 px Skip button). |
| Headings / fine print use px and ignore user text scaling. | Medium (a11y) | Open: convert to rem. |
| In-app learner has no diagnostic screen; cold start recommends from the bottom of the graph. | Medium (demo quality) | Open: engine supports it; UI not built. |
| Gemini TTS reads style directions aloud; rejects system instructions. | Medium (audio) | Mitigated: no directions + transcription QA on every take. |
| Bandit cannot learn individual modality preference in realistic session counts. | Scientific limit | Bandit limited to population-level, guarded, modality-only; not used for decisions in the demo. |
