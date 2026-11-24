# ScrollProof 4.0: feasibility v2 final report

**Central question:** can ScrollProof create a better learning journey for an individual, help them remember, and produce meaningful evidence of capability without becoming expensive, unreliable or a generic AI wrapper?

**Short answer.** The *mechanics* are feasible and cheap today. The parts that need to be trustworthy are deterministic code, which tests showed working. The parts that need to be engaging reuse cached AI media, so they don't cost per learner. AI is confined to messy-input understanding and one-time content compilation, and code checks every number either produces. **What is not yet shown is the outcome:** no data here shows that learners learn or remember better. That needs the real-user study in §6. Treat every "personalised" or "effective" claim as a hypothesis until then.

Incremental v2 spend: **$0.211** (cap $2.00). Lifetime: **$0.83** conservative (cap $5.00). No Veo generated in v2.

---

## 1. Which capabilities actually work today? (MEASURED)

- **Job text → assessable skills** with a closed competency vocabulary. Results across 84 runs:
  - Schema-valid every time.
  - 0 invented pay, location or employer.
  - 0 prompt-injection successes; scam signals flagged 6/6.
  - Pass rates: 3.8 Flash 24/28, 3.1 Flash-Lite 22/28, 3.5 Flash-Lite 19/28.
  - Prerequisites, diagnostics and assessable tasks come from a hand-authored graph, not the model. Model-guessed prerequisites missed about 3 graph prerequisites per case, so this matters.
- **Lesson compilation.** One verified concept becomes a course, step-by-step reading and audio scripts in English and Kannada. Every exercise number is recomputed by code: 64/64 correct across two models, at $0.024–0.046 per concept (one-time).
- **Five modes, one learner record.** Course, reading, audio, interactive visual and practical sheet share one progress record. Switching mode or language keeps progress, and this was verified across an offline reload.
- **Memory Remix reels** come from the learner's own record:
  - The reel quotes the learner's actual mistake ("20% of 350 = 370"), repairs it, and asks a fresh question.
  - The answer is hidden until the attempt; the answer is entered in the feed.
  - The review schedule updates; watching alone gives no credit; retrying the same reel doesn't count twice.
  - Cost: 0 AI calls and 0.02 ms to plan; the reel spec is 462 B.
- **Proof Lab:**
  - Unseen spreadsheet variants are graded deterministically.
  - Misconceptions are detected per cell, and copied answers are flagged.
  - Ambiguous answers go to a human; AI feedback cannot override a grade.
  - Replacing evidence revokes approval, and restarting drops a stale approval.
  - Employer views require consent and are minimised.
  - Every step is written to an audit log.
- **Offline, weak connectivity and accessibility (desktop Chrome):**
  - Offline reload plus completing the lesson and the work order work with the server killed.
  - Cold load at 800 ms/request: first render 2.0 s, offline-ready 7.3 s, 1.5 MB precache.
  - axe: 0 WCAG A/AA violations on 7 screens after fixes.

## 2. What works only with synthetic data?

- **Learning Twin paths and policy decisions:** 3 fictional personas with scripted answers. The paths differ for diagnosed reasons, but the mastery thresholds (0.75, Beta prior) are untested on real people.
- **Bandit behaviour:** an offline simulation with assumed effect sizes.
- **Demo learner, demo reviewer, demo listings, sample evidence:** all labelled DEMO.

## 3. What requires human validation?

- **Prose correctness** of compiled lessons: only 2 prose claims were machine-checkable.
- **Pedagogical quality** of every mode (rubric scores marked U).
- **Kannada:** meaning and register (3.8 Flash writes colloquial code-mix, Flash-Lite writes formal Kannada), and pronunciation of `kn_basic_sample.m4a`.
- **Trainer review of practical evidence:** this is the credential's real trust anchor, and its cost isn't measured.
- **The real-device checklist:** all PENDING.

## 4. What is not technically reliable yet?

- **Messy WhatsApp shorthand extraction:** 1–2/6 pass. It fails safe (missed skills, not invented ones), but needs a confirmation step.
- **Kannada-script job text on Flash-Lite** (0/2), and voice-note provenance checking (transliteration variants break quote matching).
- **Learning an individual's best modality with a bandit:** needs roughly 100–500 interactions per learner in simulation.
- **TTS directions:** Gemini TTS reads style directions aloud and rejects system instructions. Mitigated by giving no directions and transcribing every take.
- **Identity verification** (not built), **multi-device sync** (event-merge logic is tested, but there's no server), and **user text scaling** (px headings).

## 5. Cost

- **Real incremental cost:** $0.2112 in v2 (exp1 $0.130, exp3 $0.079, exp5 $0.0015), with 14 cache hits at $0. Claude Code usage isn't in this ledger.
- **Most expensive operation:** in the whole project, a 4 s Veo 3.1 Lite clip at $0.12 silent (v1). In v2, the single most expensive call was the Kannada TTS narration sample at $0.009.
- **Getting 10× cheaper:**

| Lever | Effect (from unit_economics.md) |
|---|---|
| Never generate video per learner; reuse 20 cached plates | A $3.94 → C $0.006 per learner/month (~650×) |
| Plan reels on device deterministically instead of LLM + server render | B $0.34 → C $0.006 (~57×); removes 72 s render + 6.8 MB per reel |
| Compile each concept once, review it, cache it | Lesson cost becomes one-time: about $0.05 per concept, not per learner |
| Use Flash-Lite where the measurements allow (English extraction, compile) | 2–4× cheaper than 3.8 Flash; keep 3.8 for Kannada script |
| Captions by default, TTS only for an opt-in hook | Saves $0.0015 × reel views |

## 6. Adaptation: measurement plan (Experiment 4, not yet run)

- **Design:** randomised, two arms, individual level. *Adaptive* (policy R1–R7 + Memory Remix) versus *fixed* (the same content in a fixed order, the same number of minutes).
- **Population:** about 60–100 learners from the target groups (≥30 per arm gives ~80% power to detect a 0.6 SD difference; smaller effects need more).
- **Outcome:**
  - **Primary:** score on an unseen, equivalent percentage/spreadsheet task at **72 hours and 7 days** after the last session, with item variants never shown during learning.
  - **Secondary:** transfer to the practical payout sheet, time to mastery, dropout.
  - Watch time is logged but never used as an outcome.
- **Logging:** every action already carries its rule id and reason (`policy.ts`), plus the learner event log. A bandit may run only at population level, only for *modality*, with ≥30 outcomes per arm per context before it can override the default. Bandit data must stay separate from real-learner results.
- **Pre-registration:** fix hypotheses, metrics and the analysis before recruiting. Report null results.

## 7. What makes ScrollProof different from a generic AI tutor

1. **Evidence over chat.** Mastery comes from scored answers with uncertainty, credentials need deterministic grading plus human review bound to a specific attempt and evidence, and the trust boundary is enforced in tested code.
2. **Remix reels built from the learner's own mistakes.** The feed quotes your actual error, repairs it, and tests transfer with fresh numbers, on cached entertaining media and with no per-view AI cost.
3. **Opportunity-anchored.** Messy local job posts become concrete, assessable tasks, safely: no invented pay or employer, and scams flagged.
4. **Built for weak connectivity.** No runtime AI dependency; the whole learn → practise → prove loop works offline after a 1.5 MB first load.

A generic AI tutor generates text on demand and grades with the same model. Here the AI is upstream, and everything that decides an outcome is checkable code.

## 8. Can the core experience run on weak connectivity?

Yes in desktop Chrome, with caveats:
- The app makes no runtime API calls.
- First load at 800 ms/request: 2.0 s to first render, 7.3 s to offline-ready.
- After that, everything works offline, and navigation now falls back to the cached shell after 2.5 s on a slow link.
- **Not measured:** bandwidth-limited 2G or real devices.

## 9. Smallest impressive end-to-end demo we can confidently build

About 3 minutes, all offline-capable, $0 runtime AI:
1. Paste a messy WhatsApp incentive-tracker job post. It becomes an OpportunitySpec: skills shown for confirmation, pay "not stated" and not invented. This is precomputed live: about $0.003, ~4 s on 3.8 Flash.
2. A short diagnostic, then the learner's path (Persona B style): percentages → commission.
3. Lesson in two modes (worked example, interactive visual). The learner gets "20% of 350" wrong with 370, and the misconception is detected.
4. Back to the feed: the **Misconception repair** reel quotes "20% of 350 = 370", Sheru repairs it, and a fresh in-feed question is answered correctly. The schedule updates.
5. The **unseen payout sheet** in the Proof Lab is auto-graded "correct". The trainer demo approves a video. The passport shows the separate levels (auto-check, human review, identity *not verified*).
6. The contractor preview stays blocked until consent, then shows a minimised view and a match with its reason.
7. Airplane mode: reload, continue, nothing lost.

---

## 10. FINAL DECISION: build or cut

**Recommended hackathon architecture (one):** *Architecture C, "cached media + deterministic on-device engine", with AI used only offline upstream.*

- **Product thesis:** a fun reel feed that remembers *your* mistakes and turns local job posts into practical tasks you can prove, with evidence a contractor can trust and a cost of fractions of a paisa per learner.
- **Minimal feature set:**
  1. Feed with Memory Remix reels plus the existing hook reels.
  2. Percentages lesson in 5 modes.
  3. Diagnostic and learning path.
  4. Proof Lab payout sheet, evidence and trainer review.
  5. Passport with separate evidence levels.
  6. Consent-gated contractor preview.
  7. Precomputed OpportunitySpec for 2–3 real-looking (demo-labelled) posts.
  8. Offline PWA.
- **Demo journey:** §9.
- **Reuse (already built and tested):**
  - `app/src/engine/*`: twin, policy, remix, proof, graph.
  - The `#/learn` slice, Remix reel in the feed, washer flow, PWA and service worker.
  - The Remotion reel and composition, cached Veo clips, Gemini images.
  - `core/opportunity.py`, `core/compiler.py`, the budget-guarded `V2LLM`.
- **Build next:**
  1. Diagnostic UI (the engine already exists).
  2. Proof Lab payout sheet wired into the existing evidence → trainer → passport screens, replacing or alongside the washer flow.
  3. An OpportunitySpec confirmation screen with precomputed specs bundled.
  4. rem-based typography and 44 px nav dots.
  5. Feedback text that uses the learner's own numbers.
- **Postpone:**
  - Contextual bandit decisions.
  - Live per-learner TTS or server-rendered reels.
  - Fresh Veo of any kind.
  - Voice-note job input (provenance brittle).
  - Identity verification, multi-device sync, real employer contact.
- **Largest technical risk:** content correctness beyond the numbers. Prose and Kannada from the compiler need human review, so the content pipeline must include a review step per concept.
- **Largest product-validation risk:** we have no evidence yet that remix reels improve delayed recall or that contractors value the passport. Run the §6 study and 5–10 contractor interviews before claiming either.
- **Implementation sequence:**
  1. Diagnostic UI.
  2. Payout-sheet Proof Lab in the UI.
  3. Opportunity confirmation screen.
  4. Accessibility fixes.
  5. Fluent Kannada review of `lesson.json` and the UI strings.
  6. Real-Android checklist.
  7. Pilot study protocol.
- **Estimated cost to run the demo:** $0 for the offline path. About $0.01 per live run if the OpportunitySpec and one TTS hook are generated on stage. Under $0.25 for 20 rehearsals.

---

## Rubric (0–5) used in go_no_go.md

| Score | Factual | Pedagogical | Personalisation | Localisation | Reliability | Cost efficiency |
|---|---|---|---|---|---|---|
| 0 | errors in assessed content | harmful/confusing | none | broken | fails often | unaffordable |
| 1 | frequent errors | little value | cosmetic only | machine-only, unreadable | fails in common cases | > $1 per learner/month |
| 2 | occasional errors | some value, unclear | superficial (wording) | understandable, awkward | fails in edge cases often | $0.1–1 |
| 3 | no errors found, partial verification | plausible design, unvalidated | evidence-driven in tests | machine checks pass, human review pending | edge cases handled, some open | $0.01–0.1 |
| 4 | deterministic checks on all numbers, prose partly verified | aligned with known practice (retrieval, worked examples), unvalidated | evidence-driven and tested across personas | fluent review done | tested + adversarial | < $0.01 |
| 5 | fully verified (deterministic or human) | shown to improve outcomes | shown to help real learners | fluent review + pronunciation check | proven in field | ~0 marginal |

No subsystem scores above 3 on pedagogy, because no learning outcome was measured.
