# CAPABLE: the complete A–Z (for outside review)

*Written 2026-11-27 (updated the same night with AI Pair) for wHACKiest 2026 (Track 4, UnlockED, final round, top 70 of all domains). Repo: `prorm/Whack`. Everything below was checked against the code on this date. Where something is DEMO, simulated, planned or unverified, this document says so.*

---

## 0. How to use this document (reviewers start here)

We are giving this to several AI reviewers and to people we trust. Please be harsh. We want to know:

1. **Is this AI slop?** That is, does it look impressive while lacking substance, or is there a real, defensible core?
2. **Does the story match the product?** Would a judge who opens the app believe what the film and pitch say?
3. **What is the weakest point a judge will attack, and what should we fix in the next 24–48 hours?**
4. **Is the business model credible for a student team, or is it decoration?**

Section 14 gives our own honest self-assessment, and section 15 lists known weaknesses. Please don't just repeat them back: tell us whether we ranked them correctly and what we missed.

---

## 1. CAPABLE in one paragraph

**CAPABLE turns what employers actually need into practice you can't fake, and turns that practice into proof anyone can verify.**

- An organization pastes its own job requirement. The **Work Compiler** maps it onto a shared capability graph: the tasks, the capabilities behind them, and the prerequisites the employer never wrote down.
- A learner's **Career GPS** plans the shortest path from their current evidence to that role, skipping what they have already proven.
- They practise in **labs** where the grading is done by code, not by AI:
  - **CodeLab**: a failing payment webhook handler.
  - **DataLab**: a messy payout reconciliation.
  - **FLUX Learn**: narrated, interactive solar-technician lessons.
- **Revision reels** bring back what they got wrong on a 1/3/7/21-day schedule.
- To prove a skill, they solve an **unseen** incident. The server re-runs their code in a sandbox against hidden tests and issues an **Ed25519-signed receipt**.
- Anyone can verify that receipt on their own phone from a QR code. The learner can **revoke** it, after which the link returns 410.
- When an employer changes its requirement, the system recompiles and shows only the **delta**, so the learner learns only what is new.
- **AI Pair**, in every lab, grades how well someone works *with* AI: brief the assistant without leaking secrets, catch the call it gets confidently wrong, and prove it with a test or a meter reading. It serves software engineers and electricians alike.

**Pitch tagline:** "Prove it. Don't claim it."

---

## 2. Context and history (so you understand why it looks the way it does)

### How the project evolved
The codebase went through several pivots in a short time, and that history explains much of its sprawl:

1. **ScrollProof / meme-reel skill feed** ("Sheru bhai" meme formats, TrendGenome, brainrot storyboard compiler). This is now *retired from the product path*, but the code and media are still in the repo.
2. **FLUX engine:** solar physics, a memory ladder, work orders, Field Scars (user-generated content), Lab Blueprints, Scroll Fuel (a "pay a toll to keep scrolling" browser extension).
3. **UnlockED / CAPABLE:** proof passport, jobs, an employer seat.
4. **FLUX Learn becomes primary:** narrated lessons; reels are demoted to revision only.
5. **Capability layer (current):** Work Compiler, Career GPS, CodeLab, DataLab, Opportunity Exchange, signed receipts.
6. **CAPABLE X:** the final-round reframe for engineering students ("everyone grinds LeetCode, AI broke the signal"), plus a narrated motion film.
7. **AI Pair (same night):** AI fluency becomes a graded capability in every lab, and the film grows to 9:04 with an "AI gap" problem scene and an AI Pair solution scene.

### Repository state
- **Cleaned on 2026-11-28.** Every older product generation (ScrollProof meme reels, careers, moonshot, Scroll Fuel and its extension, the on-device engine experiment, the feasibility lab, old films and pitch docs) was removed from the repo. The app now has 28 routes, all on the current product, and everything is committed.
- `.env` and `google_credentials.json` are gitignored and not tracked.

### Who built it and with what
- **Team of four:** Pranav, Swastik, Prajwal and Harsh.
- **Heavy use of AI coding agents** (Claude Code and others) for code, media scripts and documents. Reviewers should weigh this. Our position is that what matters is whether the *rules and verification* are sound and tested, not who typed them.

---

## 3. The problem as we frame it

### The relatable hook (the film's cold open)
- Every engineering student follows the same script: grind LeetCode, memorise system design, build the same three projects, polish the same résumé.
- About 15 lakh engineering graduates a year are chasing the same few jobs.
- Then AI learned to do the prep: it solves the puzzle in seconds, writes the résumé, and helps on coding tests even where that is banned.
- So the signals hiring relies on (DSA scores, take-homes, résumés, certificates) no longer prove ability.

### The two-sided failure
- **Aarav (learner):** 400 problems solved, notes, projects, 214 applications, and still no interview. He cannot *show* that he can do the job.
- **Maya (employer):** drowning in identical, AI-polished applications. She can't tell who can actually debug a production incident, so she falls back on brand-name colleges, referrals, or expensive manual interviews.
- **Root cause:** what an employer needs is written in prose, learning is organised by courses, and proof lives in certificates. None of the three speak the same language, and none of them test unseen work.

### Statistics used in the film (please sanity-check them; this is where judges probe)
| Claim on screen | Source as cited | Our confidence |
|---|---|---|
| Mass fresher hiring in India fell ~80% in three years (FY22 ~600K → FY25 ~120K) | Xpheno (reported in press) | Medium. It is a staffing-firm estimate, not official data. |
| ~8 in 10 candidates use AI on coding tests | Karat 2026 / CodeSignal reports | Medium. The exact wording and survey population need checking. |
| ~15 lakh engineering graduates a year | AICTE-derived, commonly quoted | Medium to high, as an order of magnitude |
| Recruiter fees of 15–30% of first-year CTC | Industry norm | High, as a range |

Other figures from the earlier research packs are listed in `reports/final/CAPABLE_X_PLAN.md`.

---

## 4. The thesis (why we think this is new)

1. **Start from demand, not from courses.** The employer's own words are compiled into capabilities. Most platforms start from a catalogue of content.
2. **Proof means unseen work graded by code.** It is not watch time, not multiple choice, and not an LLM's opinion. The learner never sees the verified incident during practice.
3. **Proof is portable and revocable.** It is a signed receipt that anyone can verify offline in a browser, and the learner can kill it.
4. **The market changes, and only the delta is relearned.** Recompiling a changed requirement shows only the new capabilities.
5. **Revision uses the scroll habit.** Reels exist only for concepts already learned, ordered by your own past mistakes.
6. **We admit AI is in the room, and we teach working with it.** We test what AI does not cover for you: reading an unfamiliar system, fixing it without regressions, explaining the fix to a human, and, through AI Pair, catching the assistant when it is confidently wrong. *(Section 14 says how far the product backs this.)*

### What we say competitors do
| Competitor | What they do |
|---|---|
| Other Track 4 teams | Mostly voice-first skill passports with AI-scored proof |
| LeetCode / HackerRank | Test puzzles, not jobs |
| Coursera / Udemy | Sell content and certificates |
| Naukri / LinkedIn | Match on claims |
| Recruiters | Charge 15–30% and still screen manually |

---

## 5. Product A–Z (every module, what it really does, its status)

Status key: **REAL** (works end to end, deterministic, tested), **DEMO** (works but uses fictional data or people, labelled DEMO on screen), **PLANNED** (named in the UI or pitch, but not built), **LEGACY** (still in the repo, not on the product path).

### A. Capability graph (`app/src/os/taxonomy.ts`): REAL
- **37 capabilities** across 7 domains: software 10, cloud 7, data 5, energy 6, electrical 4, operations 2, communication 3. Three of them are AI-fluency capabilities added with AI Pair: AI-assisted production debugging, AI-assisted fault diagnosis (hazardous, simulation only) and safe AI use.
- Each capability has prerequisites, employer phrasing ("terms") matched on word boundaries, estimated hours, the lab that hosts it, and the **one proof kind that can evidence it**.
- Proof kinds:

  | Proof kind | Capabilities |
  |---|---|
  | codelab | 8 |
  | flux | 8 |
  | datalab | 3 |
  | arena | 3 |
  | human | 4 |
  | in-person | 1 |
  | **pending (no validated assessment, can never be awarded)** | **10** |

- Hazardous capabilities always force a *supervised* outcome. `site.safety` is in-person only.
- The graph is hand-authored. A model never writes ground truth.

### B. Work Compiler (`os/compiler.ts`, UI at `#/demand`): REAL
- Turns employer text into tasks → capabilities → implied prerequisites → the matching simulations, plus a diff against other requirements.
- Unknown tools are flagged *awaiting validation* instead of being guessed.
- **Real output on the Paylane DEMO requirement:** 4 tasks, 8 capabilities, 1 implied prerequisite (log analysis). Paylane, KiranaCart and Metro Ledger share 7 capabilities.
- **Optional Gemini "second opinion"** (`/api/capable/compile`): its output is limited to existing graph ids and runs under a hard cent budget. It is never the source of truth.
- **Limitation:** matching is keyword and phrase based. A judge's unusual job description may compile to fewer tasks, or flag terms as unknown.

### C. Demand graph: REAL logic on DEMO data
- Takes nine fictional organizations in four clusters (backend/payments, cloud, solar/electrical, operations) and normalises them into a shared foundation plus employer-specific branches.
- Shows the most-requested capabilities, near-identical employers, and demand that has no validated test yet.

### D. The delta (market change): REAL
- Preset: KiranaCart's requirement changes to "ship the service in Docker containers through a CI/CD pipeline".
- Recompiling adds only **linux, containers and ci-cd**. All three are *pending*, because InfraLab does not exist.
- This is honest, but it means the "learn only what's new" moment ends on "no test exists yet".

### E. Career GPS (`os/path.ts`, `#/gps`): REAL
- Five intents: start from zero, a specific job, already skilled, switching, or earning now.
- Plans the shortest path through prerequisites from your evidence to the role.
  - Proven steps are skipped.
  - A skill you *declare* goes straight to an unseen task: "prove it, don't re-learn it".

### F. CodeLab (`os/codelab.ts`, `os/ui/Labs.tsx`, `scripts/codelab_sandbox.mjs`, `#/codelab`): REAL, but narrow
- **The task:** one ~25-line payment webhook handler (`handleWebhook(event, db)`), with one bug injected per incident.
- **Four incident variants:**
  - `duplicate` (orders credited twice): **practice only**
  - `units` (fractional paise)
  - `failed` (failed payments credited)
  - `refund` (over-refunds)
- **Verified trials draw from `units`, `failed` and `refund`.** The server picks the variant from the seed, so the learner never practised it.
- **Expected results come from a reference handler**, so no expected value is hand-typed. The same grading module runs in a browser Web Worker (practice) and on the server (verified), so the two can never disagree.
- **Server sandbox:** a child process using Node's permission model (no file writes, child processes or workers), a small heap, string code generation disabled, a fresh `vm` context with no `process`/`require`/`import`, a 500 ms vm timeout, and a 4 s wall-clock kill. The code itself says this is "defence in depth for a local demo, not a hardened multi-tenant sandbox".
- **Hidden regression tests**, then an Ed25519-signed receipt.
- **Incident report:** a free-text root cause, fix, and how you know nothing else broke. It is *reviewed by a trainer, not by code*. The trainer is DEMO.
- **No anti-AI controls:** no time-box, no paste detection, no proctoring, no live follow-up questions. See section 14.

### F2. AI Pair (`os/aipair.ts`, `os/ui/AiPair.tsx`, `#/ailab`): REAL, new
- **Why:** every field now runs on AI and almost nobody is trained to work with it. Vibe-coding builds a demo; production and live wires need judgement. AI Pair grades that judgement.
- **Three graded steps, the same in both tracks:**
  1. **Brief:** choose the context to give the assistant. The evidence it needs is required; secrets (`.env`, customer CSV, an Aadhaar photo, a gate code) fail the trial; noise is reported, not failed.
  2. **Review:** the assistant is fluent and confident, and in every trial one of its calls is wrong.
  3. **Prove:** a test (software) or a meter reading (trades) settles it, not the assistant's word.
- **Software track:** built on the CodeLab incidents. The copilot offers two patches, and both honestly pass every visible test. One is an over-eager change that breaks a hidden contract: it dedupes by order (swallowing refunds), "simplifies" branching (crediting declined cards), returns early for every non-capture (ignoring refunds), or ignores earlier refunds. The learner ships one and names the test that exposes the other. Whether a test exposes the trap is computed by **executing both patches** against the reference handler.
- **Trades track:** built on the Practical Arena circuit. A vision assistant names a faulty part at 88–97% confidence. It is wrong about half the time, and its plan always hides one unsafe step (skip the dead test, measure live, or bridge a part). The learner flags the unsafe step, measures the part it blamed, and names the real fault. Readings come from the arena's **circuit solver**.
- **Honest scope:**
  - The assistant is a **scripted simulation with no model call**, and it is labelled that way, so trials are reproducible and fair.
  - Guided practice is graded on the device. Unseen trials keep their seed on the server, which re-grades them and signs an Ed25519 receipt.
  - The trades track sends all four readings with the ticket, as the existing arena already sends its seed, so a determined learner could read them from network traffic.
- **Tests:** 5 unit tests plus 1 server test. Every trap passes the visible tests and fails a hidden one for every variant and seed tried. A test that cannot tell the two patches apart fails. Agreeing with a wrong AI, or skipping the meter, never passes.

### G. DataLab (`os/datalab.ts`, `#/datalab`): REAL, narrow
- Reconcile a seeded rider-payout export against gateway data. Flag every row that must not be paid, and give the reason for each.
- Grading checks rows that should have been flagged and weren't, rows flagged wrongly, and **wrong reasons**.
- Practice is checked on the device. The unseen settlement is graded and signed by the server.
- One task family.

### H. FLUX Learn: Rooftop Solar Technician (`app/src/flux/learn/`, `#/home`, `#/fl-course`, `#/fl-lesson?id=l1..l5`, `#/fl-project`): REAL, the deepest piece
- **5 narrated interactive lessons plus a project, about 35 minutes:**
  1. Push, flow and power (absolute basics: electricity as water)
  2. Series and parallel
  3. Cold makes volts (the panel temperature coefficient)
  4. The inverter's window (maximum voltage and the MPPT minimum)
  5. Your first job ticket
- **Every lesson follows the same loop:** cold open → teach → **forced prediction**, where common wrong guesses are named → experiment with live sliders and a goal → the rule as a line-by-line trace → test with hints → train on freshly seeded problems.
- **Project:** design a 14-panel roof against six live checks, then explain the design to the customer.
- **How it is built:**
  - Lessons are rendered live in the browser (not video files) and use 9 interaction types.
  - Narration is Google Chirp3-HD `en-IN` voice, with karaoke captions.
  - `course.test.ts` checks that **the numbers in the narration equal the numbers `physics.ts` computes**.
- **The mismatch:** this is our most polished learning content, and it is for **solar trades, not software engineers**. See section 14.

### I. FLUX single episodes: REAL
- **Payments story lesson** (`#/flux-pay`): idempotency and retry backoff, with two unseen checks.
- **EV charger** (`#/flux-ev`): a JSON **Lab Blueprint** episode.
  - Expressions are limited to a whitelist, and there is no `eval`.
  - A new episode is accepted only when the blueprint's own tests pass.

### J. Revision reels (`#/flux-reels`, `flux/memory.ts`, `flux/motion/`): REAL for FLUX tracks only
- **Revision only:** a reel appears only for a concept already in memory, and it never teaches anything new.
- **Schedule:** a 1/3/7/21-day ladder, a "memory battery", and a callback ordering rule: a concept you missed comes back first in a *later* session.
- **Motion reels:** SVG motion graphics driven by `physics.ts` (setup → forced prediction → payoff). Answering the quiz is optional ("just show me why").
- **No credit:** reel answers and watch time never award anything.
- **Gap:** the film shows Aarav's *CodeLab* mistake coming back as a reel. **That does not exist.** CodeLab misses are not fed into reels yet.

### K. Proof Passport and evidence (`flux/passport.ts`, `os/evidence.ts`, `#/sp-passport`): REAL
- **One evidence map** across FLUX checks and signed lab receipts. Each record shows its level and source.
- **Levels:**
  - Practice
  - System-assessed
  - Trainer-reviewed (DEMO trainer; the review is bound to the exact attempt id and evidence fingerprint, with a four-item checklist)
  - Identity-verified: **not available, and the UI says so**
- **Rules:**
  - Only the latest graded attempt at the current task version, with an intact fingerprint, counts.
  - Replacing evidence or starting a new attempt detaches any earlier review.

### L. Signed receipts, public verification and revoke: REAL, the strongest demo moment
- Receipts are signed with Ed25519 by the server. `GET /api/capable/key` serves the public key.
- `#/capable-public?t=<token>` **verifies the signature in the judge's own browser**.
- A QR code is shown on the passport.
- **Revoke:** `/api/proof/revoke` makes the link return **410 Gone**.
- `/api/proof/share` **re-grades from the seed and the raw answers**, so forged grades are refused.
- **Caveats:**
  - The signature proves the *record* is authentic. It does **not** prove *who* produced it, because there is no identity verification.
  - The QR code encodes `location.origin`, so the phone demo needs the server started with `--host 0.0.0.0` and the app opened through the laptop's LAN IP.

### M. Opportunity Exchange and employer seat (`os/market.ts`, `#/exchange`, `#/sp-employer`): DEMO
- Jobs, internships, apprenticeships, paid projects, sponsored cohorts and a hackathon, each labelled with its real commitment level.
- **Coverage per requirement**, with no hidden score; for example "5 of 8 proven".
- Learners choose who sees each piece of evidence, and can revoke access at any time.
- Employers can shortlist and invite to a supervised practical.
- **All organizations are fictional and labelled DEMO.** There are no real employers, no real postings and no messages sent.

### N. Practical Arena (`app/src/capable/PracticalArena.tsx`, `Workbench.tsx`, `arena.ts`, `#/capable`): REAL simulation
- A 3D electrical cabinet (React Three Fiber) with a supply, fuse, switch, lamp, neutral and earth.
- The learner probes terminals with a virtual multimeter, finds the fault, and repairs it.
- `scripts/capable_upgrade.mjs` independently replays the action trace against the server-issued seed, signs the result, and feeds the Proof Passport.

### O. Solar Forge and Mentor (`Forge.tsx`, `Mentor.tsx`, `solar.ts`): REAL, Mentor uses Gemini
- **Forge:** a field observation and diagnosis task.
- **Mentor:** voice or text questions in English or Kannada. Gemini can only pick from fixed tools (`explain`, `compare-cold`, `compare-warm`), never free advice, and it runs under a hard budget. Kannada text is **unverified** by a fluent human.

### P. Field Scars, user-generated content from experienced workers (`flux/cards.ts`, `sieve.ts`, `community.ts`, `#/sp-teach`, `#/capable-scars`): REAL logic, DEMO people
- An experienced worker turns a real site mistake into a playable card.
- **Moderation pipeline:**
  1. Provenance check
  2. "No Passive Scroll" validator
  3. A sieve that screens for AI-generation markers, duplicates and unsafe procedures
  4. 2-of-3 master review
  5. Challenge → patch or retire
- The Studio is gated behind having beaten a work order.
- Masters, vouches and bounties are same-device DEMO.

### Q. Goal-driven feed and job match (`flux/goal.ts`, `flux/skills.ts`): REAL
- The feed is ranked by the opportunity you are aiming for.
- `matchJob` gives an explainable match with one row per required skill.

### R. Removed in the cleanup
- The on-device learning engine experiment, Scroll Fuel (with its browser extension and Android skeleton), the ScrollProof and careers screens, moonshot, and the Python feasibility lab are no longer in the repo. `core/` keeps only the cost ledger, settings and Vertex client that the media and narration scripts use.

---

## 6. Architecture

```
Browser (Vite + React 19 + TS PWA, offline-first service worker)
 ├─ Pure deterministic core (no runtime AI): taxonomy, compiler, path, market, evidence,
 │   codelab, datalab, physics, memory, passport, assess, blueprint, fuel, sieve, community
 ├─ Practice grading in a Web Worker (3 s kill)
 └─ Public verifier: fetches /api/capable/key, checks the Ed25519 signature locally

Node server (scripts/capable_server.mjs, SQLite)
 ├─ /api/capable/start|grade  kinds: code, data (seeds stay server-side)
 │    └─ code → scripts/codelab_sandbox.mjs (child process, --permission,
 │       --disallow-code-generation-from-strings, vm context, 4 s kill)
 ├─ /api/capable/compile      optional Gemini, restricted to graph ids, cent-budgeted
 ├─ /api/capable/key, /api/capable/public/<token>
 ├─ /api/proof/share (re-grades from seed + raw answers), /api/proof/revoke (→ 410)
 └─ /api/review, /api/mission, /api/sync (trainer review, legacy flows)

Media pipeline (offline, cost-logged): Chirp3-HD TTS, Gemini/Imagen stills, a few Veo plates, Remotion films
```

### Design principles
- **AI is never the grader or the source of truth.** It is a proposer (compiler second opinion), a constrained explainer (Mentor), and a producer of media assets.
- **Every number the learner sees is computed by code.** Narration and generated lessons are checked against the code.
- **Honesty is enforced in code, not only in copy:** pending capabilities can't be awarded, the identity level is visibly unavailable, and DEMO labels are required.

---

## 7. Product rules we never break
- A credential exists only when a simulation passed **and** an approved review is bound to that exact attempt and evidence id (for reviewed skills).
- Feed answers, reel answers and watch time never award anything.
- A new attempt or new evidence detaches any old review.
- Demo people, listings, reviewers and fixtures are always labelled **DEMO**. No real company names are used as demo employers.
- The contractor/employer view is a same-device preview: no outbound messages and no fake sharing.
- Hazardous skills only ever lead to a *supervised* practical.
- We never claim placements, hiring rates or identity verification.

---

## 8. Testing and verification
- **65 automated tests, all passing** (`cd app && npm run test:all`, run 2026-11-28, after the cleanup removed the tests of deleted code):
  - flux 41 (engine, curriculum, proof, Field Scars)
  - os 16 (including AI Pair)
  - capable server/upgrade 8
- **What the tests cover:**
  - grading
  - review binding
  - the memory ladder
  - fuel rules
  - the user-generated content sieve
  - the compiler, paths, the delta and evidence
  - narration matching physics
- **Playwright walkthroughs:** `scripts/verify_*.mjs` (unlocked, flux, learn, careers, scroll fuel, arena, capable) and `capable_live_smoke.mjs`.
- **Not yet done:** a load test, a security review of the sandbox, or any test with real users.

---

## 9. Media, film and pitch assets

### Films and deck
| Asset | What it is |
|---|---|
| `out/CAPABLE-X-Film.mp4` | **9:04 narrated motion-graphics film**, made in Remotion in code: 1920×1080 at 30 fps, −14 LUFS, original synthesized score, word-synced animation, 36 scenes (85 narrated beats). Each scene is listed below. |
| `pitch/index.html` | Web pitch deck (vanilla JS, presenter view). Uses the **ink-and-gold** palette and was built for an *older* 5-minute script; its slides need updating to the CAPABLE X pitch. |

### Scenes in the CAPABLE X film, in order
1. The grind
2. The AI wave
3. The application flood
4. Aarav
5. Maya
6. Two people, worlds apart
7. The race
8. The evidence
9. The collapse
10. The pipeline
11. Neither side wins
12. The flip
13. The unit
14. The loop
15. The compiler
16. The graph
17. The GPS
18. The lab
19. The reels
20. Unseen work
21. AI in the room
22. The AI gap (an electrician's confident AI app, a copilot patch that breaks refunds, vibe-coding vs production)
23. AI Pair (brief it, catch it, prove it, with real product footage)
22. The lanes
23. The receipt
24. The contrast
25. The exchange
26. The delta
27. Not again
28. The chain
29. CAPABLE versus the rest
30. Why now
31. Domains
32. The rail
33. The money
34. Meet CAPABLE
35. The mantra
36. The end card

### Pitch documents
| Document | Status |
|---|---|
| `reports/final/CAPABLE_X_PITCH.md` | **Current master pitch:** run of show, word-for-word script for 4 speakers, five live demo moments, business model, competition, 12-question Q&A bank, checklist |
| `CAPABLE_X_PLAN.md` | Strategy and build plan |

### Other assets

### Spend
- **Total paid AI spend for the whole project: $5.36** (logged in `reports/cost_log.jsonl`, 567 calls).

  | Type | Spend |
  |---|---|
  | video (Veo plates) | $2.92 |
  | image | $1.04 |
  | audio/TTS | $0.81 |
  | text | $0.59 |

### Code size (approximate)
| Area | Size |
|---|---|
| `app/src` | ~18,000 lines in 122 files |
| `scripts/` | ~6,900 lines |
| `remotion/src` | ~7,300 lines |
| `core/` (Python) | ~1,400 lines |

---

## 10. Business model (as pitched; every price is a hypothesis to test)
- **Learners: free, forever.** This is the supply side, and the moat.
- **Employers pay per verified shortlist.** This is positioned against recruiter fees of 15–30% of first-year CTC.
- **Enterprises license the compiler and verification API** for internal upskilling and role changes.
- **Colleges and placement cells pay for outcome data:** which capabilities their students have proven against live demand.
- **The flywheel:**
  1. More employer requirements make the graph better.
  2. A better graph makes paths and labs more relevant.
  3. More relevant paths mean more verified learners.
  4. More verified learners make shortlists more valuable to employers, which brings more requirements.
- **Go-to-market:**
  1. Bengaluru placement cells plus backend/payments roles.
  2. Trades through FLUX (solar and EV), with skilling partners.
- **Pilot design:** in `reports/final/PILOT_PLAN.md`.
- **Not measured:** no revenue, no letters of intent, no real employer or college conversations recorded in the repo.

---

## 11. Real vs DEMO vs planned (one table)

| Thing | Status |
|---|---|
| Capability graph, compiler, diff, GPS | **Real**, deterministic, tested |
| CodeLab: 1 handler, 4 bug variants, sandbox, hidden tests | **Real**, narrow |
| AI Pair: software and trades tracks, brief/catch/prove, signed receipts | **Real**; the assistant is a labelled scripted simulation |
| DataLab: 1 reconciliation family | **Real**, narrow |
| Solar course (5 lessons + project) | **Real**, the deepest content |
| Payments and EV episodes | **Real**, one episode each |
| Revision reels for FLUX concepts | **Real** |
| Revision reels for CodeLab mistakes | **Not built** (shown in the film) |
| Ed25519 receipts, browser verification, revoke → 410 | **Real** |
| Practical Arena 3D, trace replay | **Real** |
| Employers, jobs, trainers, masters, learners | **DEMO**, fictional |
| InfraLab (linux / containers / ci-cd) | **Planned**: shown as "pending" |
| PeopleLab, CreativeLab | **Planned**: named only |
| Identity verification | **Not built** (the UI says so) |
| Anti-AI controls in verified trials | **Not built** (AI Pair grades working *with* AI instead; CodeLab still has no time-box or proctoring) |
| Real users, pilot data, revenue | **None yet** |
| Hosting | Local laptop server only, no public deployment |

---

## 12. Five demo moments planned for the final
1. **A judge's own job description is compiled live** into tasks, capabilities and hidden prerequisites. *Risk:* unusual wording may compile to very little.
2. **Career GPS** skips what Aarav has proven, then the revision reels appear.
3. **An unseen CodeLab incident** is fixed, re-run on the server against hidden tests, and signed.
4. **A judge scans the QR code, and their phone verifies the signature.** Then we revoke, and the link dies (410). *Risk:* needs a LAN setup.
5. **The market changes,** and only the delta is added: linux, containers, ci-cd, all pending.

---

## 13. Numbers at a glance
| | |
|---|---|
| Capabilities in graph | 37 (10 pending) |
| Demo organizations / requirements | 9 / 9, in 4 clusters |
| CodeLab incident variants | 4 (1 practice, 3 verified) |
| FLUX Learn lessons | 5 + 1 project, about 35 minutes |
| Hash routes in app | 28, all current |
| Automated tests | 65, all passing |
| Total AI spend | $5.36 |
| Repo | Cleaned and committed on 2026-11-28 |
| Film | 9:04, 38 scenes |

---

## 14. Our honest self-assessment: is it AI slop?

**Short answer: the core is not slop. The packaging and the sprawl are at risk of looking like it.**

### What is genuinely solid (hard to fake, and judges can test it)
- **Deterministic, code-graded proof.** The verified incident is drawn server-side, never shown in practice, re-run in a restricted sandbox against hidden tests generated from a reference implementation, and signed. That is a real verification pipeline, not an LLM rubric.
- **Verification the judge can do themselves.** Ed25519 signatures checked in the judge's own browser, with revocation. Few hackathon projects can hand a judge a phone and say "check it yourself."
- **Honesty enforced in code.** "Pending" capabilities can't be awarded, the identity level is shown as unavailable, DEMO labels are mandatory, and narration numbers are tested against the physics engine.
- **The demand-first model.** Compiling the employer's prose → a shared graph → a diff is a real, defensible idea. "Only the delta" is a clean story.
- **Cost discipline and tests.** 65 tests, a $5.36 total spend, and a ledger for every call.

### Where it looks like slop, or where a sharp judge will hit us (ranked)

1. **The story and the product don't match (the biggest risk).**
   - The film and pitch are about *engineering students grinding LeetCode*.
   - But the app opens at `#/home` on a *solar technician* course, and the deepest content is solar.
   - What software engineers actually get is **one 25-line webhook function with four bugs**, plus one DataLab task.
   - A judge who opens the app after the film will feel the gap.

2. **The anti-AI claim is only partly enforced.** *(Update: AI Pair now reframes this. Working with AI is itself graded, and the assistant is wrong on purpose. But the plain CodeLab trial is still easy to hand to an LLM.)*
   - The film opens with "AI solves the puzzle in 4 seconds", but our CodeLab incident is short enough that any LLM fixes it instantly.
   - There is no time-box, no explanation checked against the code diff, no live viva, no randomised codebase, and no telemetry on the editing process.
   - The "explain it to a human" part is a free-text box reviewed by a DEMO trainer.
   - **As it stands, CAPABLE has the same problem it says it solves.** This is the most dangerous question in the Q&A.

3. **Breadth over depth.** *(Update: the pivot residue is gone. Old product generations and overlapping pitch docs were removed on 2026-11-28.)*
   - What remains is still wide: several labs, each about one task deep.

4. **Everything market-side is DEMO.**
   - No real employer, college, learner or letter of intent.
   - "Employers pay per verified shortlist" is untested.
   - The business model is plausible but standard (marketplace plus SaaS plus data), and the moat argument (the flywheel) is asserted, not shown.

5. **The delta demo ends on "pending".**
   - The proudest moment (only linux/containers/ci-cd are new) lands on three capabilities we can't test.
   - It is honest, but it also shows how thin the lab coverage is: 10 of 34 capabilities are pending, and 4 more are human-only.

6. **Keyword compiler.**
   - Phrase matching on curated terms. A judge's real job description may produce a weak result live.
   - The Gemini second opinion helps, but needs the network.

7. **Identity.** A signed receipt proves the record, not the person. Anyone can have a friend, or an AI, do the trial.

8. **The film is 7:49.** Beautiful, but far longer than a judge's attention. Only ~36 s are used in the pitch. It also makes claims the product doesn't back yet (CodeLab-mistake reels).

9. **Brand inconsistency.** The film uses navy and teal "signal", the deck uses ink and gold, and the app has several styles from different eras.

10. **Repo hygiene.** *(Fixed on 2026-11-28: legacy code removed, README rewritten, everything committed.)* The film itself is not in git (230 MB) and has to be shared separately.

### Verdict
CAPABLE has a **real, defensible core**: demand compilation, unseen code-graded work, and portable signed proof. That separates it from "LLM wrapper plus pretty UI" projects. But it is currently **wrapped in more promise than product** for the exact audience the pitch targets. The fix is not more features. It is **closing the gap between the story and the demo** for software engineers, and making the AI-resistance claim true.

---

## 15. What we think we should fix, in priority order

### Before the final (24–48 h, highest leverage)
1. **Make the anti-AI claim real in CodeLab:**
   - Time-box the verified trial (for example 20 minutes).
   - Make the incident a *small multi-file service* with noisy logs rather than one function, so pasting it into an LLM is not trivial.
   - Require a **"why" answer that code can check**: name the log line, the event id and the invariant that broke, generated from the seed so it is unique per trial.
   - Add a 2-minute "explain your diff" recorded voice note for the human review.

   Even two of these shrink the attack surface a lot.
2. **Make the software path the default for the pitch.** Add a `#/home` entry for "Backend & payments engineer" (Compiler → GPS → CodeLab → Passport) so what the judges see after the film matches it. Keep solar as "it works across domains".
3. **Either build CodeLab-mistake reels or cut them from the film.** Feeding a failed CodeLab variant into the memory ladder as a reel card is small, and it makes a film claim true.
4. **Harden the live compiler moment:** prepare 3 to 5 real-looking job descriptions that compile richly, and invite the judge to pick one, rather than relying on free text.
5. **Commit everything, clean the README, and hide the legacy routes** from the navigation.
6. **One pitch document, one brand.** Retire the older pitch documents, and align the deck with the film's palette or the reverse.

### After the hackathon
- Build InfraLab (container and CI tasks), so the delta story ends in a test, not "pending".
- Run a real pilot with one placement cell and two or three employers. Measure whether verified shortlists beat résumé screening on interview-to-offer rate.
- Add identity binding: a proctored practical, or college SSO plus a live viva.
- Grow the variant pool: generate incidents procedurally from service templates so they can't be memorised.
- Run an external security review of the sandbox before any multi-tenant use.

---

## 16. Questions we want reviewers to answer
1. After watching the first 36 s of the film and opening `#/codelab`, does the product feel like it delivers the promise? Where exactly does it break?
2. Which of the five demo moments would actually make you, as a judge, sit up? Which would you cut?
3. Is "employers pay per verified shortlist" believable? Who would you charge first, and how much?
4. What is the single strongest counter-argument to "unseen work graded by code beats LeetCode + résumé in the AI era"?
5. Is the honesty (DEMO labels, "pending", "identity not verified") a strength in front of judges, or does it read as "not finished"?
6. Given 48 hours, would you deepen CodeLab, build InfraLab, or polish the demo flow?
7. Does anything here look like it was generated to impress rather than to work?

---

### File map for reviewers who can read code
| Topic | Files |
|---|---|
| Rules (pure, tested) | `app/src/os/*.ts`, `app/src/flux/{physics,memory,passport,assess,skills,goal,blueprint,fuel,sieve,community,cards}.ts` |
| Labs UI | `app/src/os/ui/Labs.tsx`, `app/src/os/ui/Pages.tsx` |
| Server and sandbox | `scripts/capable_server.mjs`, `scripts/codelab_sandbox.mjs`, `scripts/capable_upgrade.mjs`, `scripts/capable_gemini.mjs` |
| Learn | `app/src/flux/learn/course.ts`, `scenes.tsx`, `script.json` |
| Film | `remotion/src/capx/`, `scripts/capable_x_vo.py`, `scripts/capx_score.mjs` |
| Pitch | `reports/final/CAPABLE_X_PITCH.md`, `CAPABLE_X_PLAN.md` |
