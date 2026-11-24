# Final QA: what was executed (2026-11-24)

Everything below ran on this machine against the production build (`npm run build`) served by `scripts/scrollproof_server.mjs`. Nothing is estimated.

## Unit tests (`cd app && npm run test:all`)
| Suite | Result |
|---|---|
| `src/flux/*.test.ts` + `src/flux/learn/*.test.ts` | **49 pass, 0 fail** |
| `src/engine/*.test.ts` | 35 pass, 0 fail |
| `src/moonshot/*.test.ts` | 8 pass, 0 fail |

**`learn/course.test.ts`** (new, 5 tests):
- every narrated line exists and has recorded audio
- every lesson teaches before it tests
- the narration speaks the numbers `physics.ts` computes (540 W, 330 V, 22 °C, +4.6 %, 51.9 V, 11.57 → 11, 35 V, 3.4 → 4)
- every experiment goal is unmet at the start and reachable on the slider grid
- training sets are seeded, vary across seeds and accept their own answers
- the project has exactly two valid designs (inverter B with 1 × 14 or 2 × 7), and each wrong design names its failing check

**`proof.test.ts`** (13 tests) covers:
- graph integrity, seeded graders, no false awards, versioning
- review binding, consent and revocation
- goal-feed ranking and the motion-card validation rule
- matching, which now includes the project: 3/4 → the project is the last gap; an oversized design fails; a valid one makes the learner eligible

## Browser walkthroughs (Playwright 1.63, Chromium)
| Script | Steps | Result |
|---|---|---|
| `verify_learn.mjs` (1280×860, plus mobile 400×860 screenshots) | 13 | **All passed, 0 console errors** |
| `verify_unlocked.mjs` (400×860) | 33 | **All passed, 0 console errors** |
| `verify_flux.mjs` (episodes + revision callbacks) | — | **OK, 0 errors.** It now finds reels by kind, because Revise only shows learned concepts. |
| `verify_flux_ugc.mjs` (Field Scars + EV blueprint) | — | **OK, 0 errors** |

`verify_learn.mjs` exercises:
- a course map with locked lessons
- lesson 1 from zero: the experiment goal; a wrong answer gets a hint, not the answer
- lesson 3: a wrong prediction is named; the thermometer experiment trips the inverter; the trace; the check; 3 fresh training problems
- lesson 4: 12 panels are damaged at dawn, 3 sleep all afternoon, 11 is the goal
- lesson 5: a guided ticket solved step by step
- the project: inverter A fails the sizing check, inverter B passes and is saved to the passport

`verify_unlocked.mjs` exercises:
- revision opens on a rematch of an earlier-session miss, then a repair reel
- the server refuses a forged grade (422), and a link revoked by its owner returns 410
- a wrong proof task, then a passing variant
- the project is the last gap; 4/4 makes the learner eligible for a supervised practical
- consent, then the employer inspects, shortlists and invites
- revoking hides the learner from the employer
- the trainer checklist is enforced, and a new attempt detaches the review
- an employer-posted mission appears for learners
- all 7 motion reels play; reduced motion works; the feed loads offline

Screenshots: `reports/final/screenshots/` (Learn in `learn/`) and `outputs/*_qa/`.

## Demo recording
`scripts/record_demo.mjs` drove the real app for 157 s at 1280×720 → `docs/media/scrollproof_demo.mp4`. The audio is the app's own narration (14 lines, placed at the logged start times and cut where the recording skipped ahead) over the lesson music bed. It is not a mockup.

## Spend
- Narration: 29 Chirp3-HD lines, $0.099.
- Earlier tonight: 2 Veo plates, $0.60.
- Lifetime ledger: **$4.45 of $5.00**.

## Known issues and limitations
1. Karaoke captions are timed by word length across the line's real duration, not word-level alignment. They can drift by a word on long lines.
2. Lesson audio needs a user gesture in some browsers. If playback is blocked, the lesson continues muted, with captions on the real timing.
3. The *One hose* Veo plate never shows the flow collapsing; the motion graphics carry the idea.
4. EV blueprint episode (pre-existing issue): "New work order" can repeat the same variant for nearby seeds.
5. Same-device DEMO seats (trainer, employer). The older inventory/payout path (`#/careers`) is not in the new course or passport.
6. Kannada is not implemented for FLUX Learn. Identity is not verified. No QR codes.
7. Lint reports warnings only (fast-refresh exports, some pre-existing), 0 errors.
