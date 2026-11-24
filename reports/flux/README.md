# FLUX: the CAPABLE learning engine

Open `#/flux` (also linked as "FLUX lessons" in the main nav).

## What it is
Lessons are machines the learner breaks, not videos they watch. Each episode runs:

1. **Cold open** (Veo clip + voiced narrator): a real failure, e.g. an inverter dying at 06:47 on an 8 °C morning.
2. **Bet**: predict the answer and stake a confidence level before any teaching. Calibration (Brier) is tracked and shown only to the learner.
3. **Sabotage lab**: a deterministic simulator with missions like "kill the inverter without adding a panel". The learner discovers the rule by scrubbing the clock and seasons, with a live gauge, day curve, frost and heat effects, and an X-ray view of the maths.
4. **Settle the bet**, then **Rule forge**: assemble the formula from tiles. Every wrong tile maps to a named misconception repair.
5. **Teach to learn**: find the wrong line in an apprentice's notebook.
6. **Customer boss fight**: explain the limit to a sceptical DEMO homeowner, with a trust meter. Jargon, false comfort and "company policy" lose.
7. **Unseen work order**: a new city, panel and inverter generated from a seed. Code grades it, names the exact wrong method and shows the worked solution.
8. **Wrap**: memory batteries and a day 1 / 3 / 7 / 21 schedule.

**Recall reels** (`#/flux-reels`) are full-screen, swipeable 5–15 s games: freeze-frame video, hot vs cold split taps, spot the fault on generated photos, rising number bubbles, and "cap or fact". The feed is ordered by `memory.ts`. Callback reels ("REMATCH") come first only in a later session, after a miss. Due concepts follow, weakest first. Use the demo time-warp on the hub to see the order change.

Episodes: **The Cold Morning Killer** (electrician → rooftop solar: string sizing against cold-morning Voc and the hot MPPT minimum) and **Charged Twice** (payments: lost replies, retries, idempotency keys; cut the network with scissors).

## Field Scars: user uploads without the slop (v2)
Users cannot upload lectures. They upload **scars**: a real failure, compiled into playable cards.

- **Three tiers, one feed, hard badges** (`cards.ts`): `FLUX LAB • TESTED PHYSICS / CODE` (or `TEAM-AUTHORED`), `REAL SITE CAPTURE • VERIFIED BY 2 MASTERS`, and `LIVE INDUSTRY PROBLEM • HIRING`. Every AI-generated photo also carries `AI-GENERATED DEMO PHOTO`, and every DEMO person or partner carries `DEMO`.
- **No Passive Scroll law:** `validateCard()` refuses any card that does not force a decision (exactly one correct option, a valid hotspot, an explanation). Community cards also need real media and two distinct verifiers.
- **Prove it to post it:** the Capture Studio (`#/flux-studio`) stays locked until the learner beats an unseen work order in that domain (solar or EV for trades, the code fix for tech), or a master vouches. The vouch is DEMO here.
- **Capture Studio:** photo or screenshot only, no text-only posts. The learner marks the fault, blurs faces, names and plates, writes one sentence on what failed and the wrong belief juniors hold, and can add an optional 20 s voice note. They play the compiled card before submitting. Re-encoding strips EXIF and GPS before anything is stored. One scar becomes two cards: Spot-the-Fault on the real photo, and Cap-or-Fact on the wrong belief.
- **Automated sieve** (`sieve.ts`). It blocks:
  - IPTC `trainedAlgorithmicMedia` markers, generator Software tags and embedded diffusion prompts
  - duplicates of known cards (dHash, ≤10/64 bits; a re-encoded FLUX image scores 0/64)
  - photos under 480 px
  - unsafe procedures: working live, bypassing an RCD or MCB, skipping earthing or PPE, upsizing breakers, disabling security checks. "Never … / don't …" sentences are allowed.
  - empty or overlong rules

  It warns on missing camera metadata and on generated-text tells. These are signals, not proof, and the UI says so.
- **2-of-3 master review** (`community.ts`, `#/flux-queue`): domain-scoped, one review per master, a rejection needs a reason, and an approval is impossible if the sieve blocked the card. Reviewers are same-device DEMO masters.
- **Challenge the Rule:** every card has a challenge button. Community cards go to a master, who can patch, retire or dismiss them, with a dated changelog shown on the card. Challenges on FLUX originals go to a team list, because tested-code cards only change with a new passing test.

## Lab Blueprints: full episodes without code
`blueprint.ts` defines a Threshold & Gauge template. It uses a whitelisted expression language with no `eval` (prototype names are rejected and covered by tests), missions, a sweep, a rule check, an unseen-work-order generator and a **code gate**: the blueprint's own tests must pass, or the episode refuses to open. **Episode 3, "The 9 PM Blackout"** (EV charger load and breaker sizing), is pure JSON in `blueprints/ev_charger.json` and is played by `BlueprintEpisode.tsx`.

## Scroll Fuel: gate the doomscroll with recall (v3)
`#/flux-fuel` opens it. Solving one thumb-native FLUX card adds Scroll Fuel. When the tank on a gated feed hits zero, a tollbooth slides over it, and solving the card returns the user to the same video.

- **Rules** (`fuel.ts`, tested in `fuel.test.ts`):
  - +10 min for a first-try correct card, +15 for a sponsored DEMO bounty.
  - Options unlock after 1.2 s, so blind mashing does not work.
  - A miss shows its explanation for 5 s, then a follow-up card on the same skill earns +5. The miss is graded into `memory.ts`, so it returns as a REMATCH next session.
  - After 3 cards the toll lets the user through anyway (+3 min), so nobody is trapped.
  - A free 2-minute DM break is available once an hour.
  - The tank caps at 30 min and drains only while a gated site is focused.
- **Tollbooth** (`Gate.tsx`, `#/flux-gate`): the same `ReelView` cards, chosen by the same feed order (callbacks first, due next), thumb-native kinds only. The page is not a credential and says so. It reports an unlock to whatever hosts it: the extension's parent page, the Android bridge (`CapableAndroid.unlock`), or the local tank.
- **Browser extension** (`extension/src/content.js`, `scripts/build_extension.mjs`): an MV3 extension that bundles the whole built app, so the deck runs offline inside the extension.
  - It gates Instagram, YouTube Shorts (only `/shorts`), Reddit and X; the user can toggle each.
  - The content script reads only the URL. It drains the tank, counts Reels/Shorts swiped and shows the tollbooth iframe at zero. It pauses page media and blocks page keys while the toll is up.
  - It accepts an unlock only from its own iframe, using `e.source` plus a nonce, so the page's own scripts cannot forge one; the test checks this.
  - Load it via `node scripts/build_extension.mjs` → `chrome://extensions` → Load unpacked → `extension/dist`.
- **In-app simulator:** a generic, clearly SIMULATED short-video feed in a phone frame at ×60 demo speed. It demos the full loop without the extension and imitates no real app.
- **Doomscroll-to-proof mirror:** monthly breaks, recalls, first-try rate and per-skill counts. It is labelled "practice mirror, not a credential", because toll answers never feed the Proof Passport.
- **Phones:** `android-gate/` holds a reference skeleton (UsageStatsManager + overlay WebView + JS bridge). It is **not compiled**. iOS can only show a Screen Time shield, not an overlay.
- **Verify:** `node scripts/build_extension.mjs --dev`, then `node scripts/verify_scroll_fuel.mjs`. This runs the simulator, then the real extension on a local unbranded fake-feed page: tank drains, toll appears, forged unlock is ignored, a card is solved, the overlay is removed.

## Rules kept
- No model runs at learn time. `app/src/flux/physics.ts` computes every number and is tested in `flux.test.ts` (`npm run test:flux`).
- Memory meters and reel answers never award anything. The work order says that credentials need trainer review.
- Characters, customer, datasheets and job tickets are labelled DEMO. The earning ladder is marked "unverified".
- Sim simplification, stated in the UI: full Voc once the sun is up (the conservative design convention).

## Media and cost
`scripts/flux_media.py` (plan / images / video / tts / sfx / ship) runs through `CostLedger` with roles in `config/models.json`.

| Item | Model | Cost |
|---|---|---|
| 11 stills (2 reference edits for character consistency) | gemini-3.1-flash-image | $0.737 |
| 6 image-conditioned clips, 38 s | veo-3.1-lite | $1.660 |
| 20 voice lines, 3-voice cast, every take transcribed for QA | gemini-3.8-flash-tts + 3.5-flash-lite | $0.077 |
| SFX (zap, alarm, power-up, frost, hum…) | synthesised locally | $0 |
| EV episode: 2 stills, 1 clip, 3 voice lines | same | $0.45 |
| **Total** | | **$2.92** |

Shipped pack: 50 files, 7.3 MB in `app/public/media/flux/`. Incidental brand marks (car and charger logos) and a number plate on generated media were blurred before shipping. The originals are kept in `outputs/flux/raw/`.

## Verify
```
cd app && npm run build && npx vite preview --port 4173
PLAYWRIGHT_MODULE=<path>/playwright/index.mjs node scripts/verify_flux.mjs
```
`node scripts/verify_flux_ugc.mjs` checks the whole Field Scars path: gate → duplicate blocked → fresh capture → 2-of-3 review → card in the feed with its badge → challenge → patch. It then plays the EV blueprint episode end to end. Fixtures live in `outputs/flux_qa/fixtures/`.

The walkthrough plays both episodes end to end, answers wrong on purpose, time-warps, asserts the callback rule and saves screenshots to `outputs/flux_qa/`.
