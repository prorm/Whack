# Final QA: what was executed tonight (2026-11-24)

Everything below was run on this machine against the production build (`npm run build`) served by `scripts/scrollproof_server.mjs`. Nothing is estimated.

## Unit tests (`cd app && npm run test:all`)
| Suite | Result |
|---|---|
| `src/flux/*.test.ts` (FLUX physics, memory, fuel, UGC, **new `proof.test.ts`**) | **44 pass, 0 fail** |
| `src/engine/*.test.ts` | 35 pass, 0 fail |
| `src/moonshot/*.test.ts` | 8 pass, 0 fail |

New `proof.test.ts` (13 tests) covers:
- graph integrity (prerequisites exist, no cycles, every assessment maps to its competencies, site safety cannot be proven in-app, all jobs DEMO)
- seeded, deterministic tasks that vary across seeds
- graders pass right answers and name wrong methods; garbage never passes
- the solar work order grades max and min as separate competencies
- **no false awards**: reels and memory never evidence a skill; a failed attempt, a tampered record or an out-of-date task version does not count
- **assessment versioning**
- trainer review: needs all 4 checklist items, is bound to attempt id + fingerprint, and a copied review or a newer attempt detaches it
- **consent and revocation**: an employer sees only records shared with them; revoking removes them
- **match eligibility changes after assessment**; hazardous work stays supervised; a failed retake removes eligibility
- **deterministic goal-feed ranking**: foundations first, intuition before drills, proof slot after each gap, callbacks only from an earlier session, repair reels first after a named mistake, proven skills leave the gap list

## Browser walkthrough (`scripts/verify_unlocked.mjs`, Playwright 1.63, Chromium, 400×860)
**30/30 steps passed, 0 console errors.** Screenshots are in `outputs/unlocked_qa/`. The run includes deliberate failure paths:
- the server refuses a forged record whose grade does not match a fresh re-grade (422)
- another device cannot revoke a link (404); a revoked link returns 410
- the seeded learner is 2/3; the goal feed opens on a REPAIR motion reel for their named mistake
- a wrong motion-reel prediction plays the overflow payoff; the proof slot appears after the gap reels; pause/resume works
- a wrong unseen work order is graded *not proven*; a new unseen variant passes
- the match flips to "Eligible for a supervised practical assessment"
- consent share → employer sees learner + DEMO candidates → inspect answers → shortlist → invite → learner inbox
- after revoking consent, the employer no longer sees the learner
- approval without all four checklist items is refused; approval binds to attempt + fingerprint
- a public share link renders the server-regraded record; revoking stops it
- a new attempt detaches the trainer review
- an employer-posted mission appears for the learner; a hazardous skill forces supervision
- the payments goal builds a different feed (idempotency first)
- all 7 motion reels: intro → forced prediction → payoff, correct answers graded right
- reduced motion: static frame, question still forced
- offline (service worker): the reel feed renders with the network off

## Regression walkthroughs (existing scripts, re-run against the new build)
| Script | Result |
|---|---|
| `scripts/verify_flux.mjs` (both episodes end to end, reels, time-warp, callback rule) | **OK, 0 errors.** Updated for the new feed order: 7 motion reels now lead, so reel indices are offset by 7. |
| `scripts/verify_flux_ugc.mjs` (Field Scars gate → sieve → 2-of-3 review → feed → challenge → patch; EV blueprint) | **OK, 0 errors** |
| `scripts/verify_scroll_fuel.mjs` | **Not re-run tonight** (needs the extension build). The tollbooth only accepts thumb-native kinds, and `motion` is not one of them, so it is unaffected by design. |

Typecheck: `tsc -b` clean. Lint (`oxlint`): warnings only (fast-refresh exports, plus pre-existing set-state-in-effect warnings), 0 errors.

## Media spend (CostLedger)
2 Veo 3.1 Lite plates (6 s, with audio) cost **$0.60**. Lifetime ledger: **$4.35 of the $5.00 cap**. I set `ENABLE_LIVE_VIDEO_GEN=true` only for that one command, on your instruction to use Veo. The `.env` file still says `false`.

## Known issues and limitations (unresolved)
1. **Hose plate:** in the Veo clip the boot lands near the hose end, and the flow does not visibly collapse. The motion graphics on top carry the actual intuition (flow halves everywhere). Regenerating it would cost about $0.30.
2. **EV blueprint episode, pre-existing:** "New work order" in `BlueprintEpisode` uses `seed + 1`, and the blueprint RNG gives the same variant for nearby seeds. The new proof page uses random seeds up to 1e6 and is not affected. Fix the RNG mixing in `blueprint.ts` and re-run its tests.
3. **Same-device seats:** the learner, DEMO trainer and DEMO employer share one device. Same-device employer shares live in localStorage. Only public share links are server-side.
4. **Inventory/payout tracks** (the older career path at `#/careers`) are not yet in the unified competency graph or the new passport.
5. **Kannada:** not implemented for the FLUX/motion pathway. No language claims beyond English.
6. **Motion reels have no voice-over**, only on-screen kinetic captions and synthesized SFX.
7. **No QR code** for share links (no new dependency added). The link is copyable.
8. Playwright does not capture audio, so the recorded demo video is silent. Narrate over it.

## Reproduce
```
cd app && npm run test:all && npm run build
node ../scripts/scrollproof_server.mjs --port 4180 --data .data/demo.sqlite
PLAYWRIGHT_MODULE=<playwright>/index.mjs SP_URL=http://127.0.0.1:4180 node ../scripts/verify_unlocked.mjs
PLAYWRIGHT_MODULE=<playwright>/index.mjs FLUX_URL=http://127.0.0.1:4180 node ../scripts/verify_flux.mjs
PLAYWRIGHT_MODULE=<playwright>/index.mjs SP_URL=http://127.0.0.1:4180 node ../scripts/record_demo.mjs   # silent demo video
```
Demo seed/reset: `#/home?demo=seed` and `#/home?demo=reset`, or the buttons under "Demo controls" on the Learn tab.
