# ScrollProof: turn everyday scrolling into employability

**ScrollProof** is the product. **FLUX** is its learning and verification engine. Learners pick a job, and the reel feed becomes the shortest path to it. Unseen tasks graded by tested code prove each skill. A Proof Passport holds the evidence, and the learner decides which employer sees it.

## The loop (all of it runs in the build today)

| Step | What the learner/employer does | Where | What decides it |
|---|---|---|---|
| Pick a job | Choose a DEMO opportunity; see exact required skills | `#/home`, `#/sp-jobs` | `skills.ts` competency graph |
| Goal feed | Swipe intuition reels aimed at missing skills, with a visible "why" chip on every card | `#/flux-reels?goal=…` | `goal.ts` (pure, tested) |
| Prove | Unseen task from a fresh seed, graded by code; wrong methods are named | `#/sp-assess?c=…` | `assess.ts` (pure, tested) |
| Passport | Inspect task, rubric, version, raw answers vs key, misconceptions, fingerprint, review status | `#/sp-passport` | `passport.ts` (pure, tested) |
| Consent | Share chosen records with one employer; revoke any time | job page | `visibleTo()` |
| Employer | Post a skill mission, see consenting candidates, inspect answers, shortlist, invite (DEMO) | `#/sp-employer` | `matchJob()` |
| Teach | Field Scars: upload a real fault → sieve → 2-of-3 master review → playable cards; impact from real events | `#/sp-teach` | existing `community.ts`, `sieve.ts` |

## Reels: from memes to motion-graphics intuition

The meme / "Sheru bhai" format is retired from the product path. Seven new **intuition reels** are code-driven motion graphics (`app/src/flux/motion/`). Each one is about 10 seconds long:

1. **Setup** (≈5 s of kinetic type and an animated diagram). Tap to skip.
2. **Forced prediction.** The options appear and a timer starts. Nobody can scroll past passively.
3. **Payoff.** The animation shows *why*: the string crosses 600 V and trips, the glass overflows on the 12th panel, every panel's current halves, the flat goes dark at 9 PM.

| Reel | Concept | Intuition |
|---|---|---|
| Cold → more volts | `cold` | Thermometer falls, frost grows, needle climbs, the 12-panel string trips |
| The cliff (Veo plate: water at the brim) | `maxstring` | 11 panels fit, the 12th overflows: round a maximum down |
| Heat sags volts | `minstring` | 3 panels sleep under the wake-up line, the 4th wakes the inverter: round a minimum up |
| One hose (Veo plate: hose and boot) | `series` | A series string shares one current, so one shaded panel halves it everywhere; bypass diodes give it a way around |
| The 9 PM blackout | `evload` | House loads stack up through the evening; the 32 A charger trips the 40 A main; load balancing fits it in |
| Same key, one charge | `idem` | The reply is cut by scissors, the retry carries the same key, the server replays its reply |
| The thundering herd | `retry` | Synchronised retries keep a server down; backoff plus jitter spreads them out |

Every number on screen is computed at runtime from `physics.ts` or the EV blueprint. None is baked into media. The two Veo clips are atmospheric backdrops only, and every card that uses one carries the badge **AI VIDEO BACKDROP (VEO) • NUMBERS DRAWN BY CODE**. Reduced-motion users get the final frame and the same forced decision.

## What is different

- **The feed is directed by an opportunity.** It does not optimise for endless engagement. Ranking: earlier-session misses first → repairs for the misconception named in your last failed task → gaps for the job, foundations first, intuition before drills → a **proof slot** after each gap. Proven skills only return when due.
- **Evidence, not watch time.** Reels and memory meters never award anything. A skill is evidenced only by the latest graded attempt, at the current task version, with an intact fingerprint.
- **Honest levels.** The levels are Practice, System-assessed, Trainer-reviewed (DEMO trainer, bound to attempt id and fingerprint, 4-item checklist) and Identity-verified. Identity verification is **not available** in this prototype, and the UI says so.
- **Safety.** Any hazardous competency forces a supervised outcome, whatever the employer ticks. Site safety is never marked as evidenced in the app; it is always checked in person.
- **Zero runtime AI.** Learning, grading and matching are deterministic TypeScript running offline. The server re-grades from seed plus raw answers before it serves a share link.

## Feature boundaries (be exact when pitching)

| Claim | Status |
|---|---|
| Goal-directed reel feed, 7 motion reels, proof checks, passport, consent, employer shortlist/invite | **Built, tested, browser-verified** |
| Server-side share links with server re-grading and revocation | **Built** (needs `npm start` / `npm run demo`, not `vite preview`) |
| Trainer review | **DEMO trainer seat on the same device** |
| Employers, candidates, listings, pay figures | **DEMO / illustrative.** No partners, no real offers |
| Invites | Same-device preview. Nothing is sent. Not a job offer |
| Mentor rewards | Proposed only: no money moves |
| Identity verification, QR codes, multi-device accounts | Not built |
| Kannada pathway for the new FLUX/motion flow | **Not built tonight.** The older inventory path has a `kn` toggle; the Kannada text is unreviewed |
| Learning-outcome improvements, placements | **Not measured.** No users yet |

## Run it

```
cd app
npm run demo                 # build + ScrollProof server on http://127.0.0.1:4173
open http://127.0.0.1:4173/#/home?demo=seed     # reproducible seeded learner
open http://127.0.0.1:4173/#/home?demo=reset    # wipe this device
```
