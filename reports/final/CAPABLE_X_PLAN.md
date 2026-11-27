# CAPABLE X: the plan for the final

**Thesis (the one sentence every judge should be able to repeat):**
The job description becomes the curriculum, the work becomes the proof, the proof becomes opportunity, and when the world changes, the pathway changes with it.

**What we are:** not a skills app, not a course platform, not a job board. CAPABLE is the verification-and-adaptation layer between work and learning: a compiler that turns employer demand into learnable, provable capability, and recompiles only the delta when the work changes.

Film: `out/CAPABLE-X-Film.mp4` (7 min 49 s, narrated, 1080p). The stage pitch is in `CAPABLE_X_PITCH.md`. Source: `remotion/src/capx/`. How to edit it is at the end of this file.

---

## 1. What the competition looks like

We read the READMEs of the Track 4 (UnlockED) finalists closest to us. Almost all of them converge on one pattern:

| Team | Core idea | Where it stops |
|---|---|---|
| KelasaPass | Voice-first WhatsApp job matching + "every finished job becomes proof" | Proof = customer stamps on jobs already done. No demand model. |
| SkilledIN | Short live video challenge "checked by AI" + customer stamps | **AI is the judge.** Static skill tags. |
| KaamVaani | Voice signup, 5 km matching, 30 s video proof "AI-scored, peer-endorsed", QR card | AI-scored. Trust score is opaque. |
| NakaPulse + WorkProof | 60-second voice match + offline QR skill card | Card records claims and ratings. |
| KaushalProof, Kasauti | Prove a trade live on your phone, get a digital credential | One-off credential. No recompile when work changes. |
| KaamSetu | Voice-first hyperlocal job board | Matching only. |

**The pattern:** voice-first, hyperlocal, a QR/skill passport, and an AI or a crowd deciding whether the skill is real. They all **verify a claim, on one side of the market, once.**

**Our three differences:**
1. **We start from demand, not from the worker.** The employer's own words compile into tasks, capabilities, prerequisites and evidence contracts on a shared graph. Everyone else starts with a profile.
2. **We generate the work; we don't score a claim.** Unseen task variants, drawn by the server and graded deterministically. AI never awards anything. Their "AI-scored video" is exactly the signal the research shows is collapsing.
3. **We recompile.** When a role changes, CAPABLE computes the delta, and everything already proven keeps counting. No one else has a model of change.

**How to say it on stage:** "Most teams here built a better passport. We built the system that decides what a passport should contain, and keeps it true when work changes. Their apps could run on our rail."

---

## 2. The problem, reduced to five root flaws (from the research audit)

| Root flaw | Evidence we use (source on screen in the film) | CAPABLE engine that attacks it |
|---|---|---|
| **Demand is uncompiled.** Recycled job posts, "3+ years", no tasks | 72% of employers recycle middle-skill JDs (HBS Hidden Workers); 35% of "entry-level" posts want 3+ years | 01 Work Compiler, 02 Shared Graph |
| **Signals are gameable.** AI résumés, proxies, cheating | 95 applications per role (was 28); 3 of 100 reach an interview; 90% of employers think they rejected real people as "fake" (Greenhouse 2026) | 05 Unseen Proof, three-lane rule |
| **Skills-based hiring is in name only** | 85% say they hire for skills; real change in fewer than 1 in 700 hires (HBS & Burning Glass 2024) | 05 + 06: a verifiable evidence layer, which is what the HBS study says is missing |
| **Learning is static, work mutates** | 39% of core skills change by 2030 (WEF); $458.7B training spend, 8% of CEOs see impact | 03 Career GPS, 08 Market Delta |
| **Proof isn't portable and is re-taxed every time** | Unpaid take-homes, 14% career-switch pay cut, India's graduate youth unemployment 29.1% vs 3.4% for youth who can't read or write (ILO–IHD, 2022 data) | 06 Signed Receipt, 07 Opportunity Exchange ("prove once, apply everywhere") |

Plus the exclusion flaw (frontline, informal, non-English, no HR): addressed by offline-first labs today and the voice-first frontline track below.

---

## 3. The architecture (what the film explains)

One closed loop, seven stages. Every arrow is a data contract, and each contract is pure and tested.

```
Employer words ──► 01 WORK COMPILER ──► Requirement → tasks + capability ids + implied prerequisites + evidence contract
                        │
                        ▼
               02 SHARED CAPABILITY GRAPH ──► Blueprint: shared foundation + per-employer branches
                        │
 Learner evidence ─────►▼
               03 CAREER GPS ──► Plan: proven (skip) / prove / learn / review / in-person / pending
                        │
                        ▼
               04 WORK LABS (CodeLab, DataLab, FLUX, Solar Forge, Practical Arena) ── practice on real incidents
                        │
                        ▼
               05 UNSEEN PROOF ──► server draws a variant; seed stays server-side; sandbox; hidden checks
                        │
                        ▼
               06 SIGNED RECEIPT ──► task version, submission hash, checks, conditions, Ed25519 signature; consent + revoke
                        │
                        ▼
               07 OPPORTUNITY EXCHANGE ──► per-requirement coverage, no hidden score, same receipt counts everywhere
                        │
   role changes ───────►▼
               08 MARKET DELTA ──► diffBlueprint(): add only new capabilities; proven evidence keeps counting;
                                    no validated lab → "awaiting validation", never awardable
```

**The trust rule (the line judges remember):** AI teaches and explains. Code verifies what can be measured. Humans judge what needs judgement. No capability is ever awarded by an AI's opinion.

### Real today vs DEMO vs planned (say this honestly when asked)

- **Real and tested** (`npm run test:all`): Work Compiler, the 34-capability graph, blueprint and change diff, Career GPS, coverage, CodeLab grading in the browser worker and the server sandbox, DataLab grading, FLUX labs (solar, payments, EV), Practical Arena, Ed25519 receipts, sharing and revocation (410 after revoke), the Gemini "second opinion" limited to graph ids.
- **The numbers in the film are the compiler's real output** on the Paylane requirement: 4 tasks, 8 capabilities, 1 implied prerequisite (log analysis); 7 shared capabilities across the three backend employers; the change adds exactly `linux`, `containers`, `ci-cd`, all three pending because InfraLab is planned.
- **DEMO:** Aarav, Maya, Paylane, KiranaCart, Metro Ledger, every listing and pay figure.
- **Planned:** everything in section 4 below.
- **Never claim:** hiring rates, placements, identity verification, measured learning gains. A signature proves the assessment record, not who took it.

---

## 4. What to build next: the upgrade plan

Ranked by (judge impact × research backing) ÷ build risk. Each item names the pain point it answers.

### Tier 1: build before the final (each is a day or less, and each makes a live demo moment)

**1. Receipt Verifier, public and offline** (pain: proof can't be trusted or carried)
- A page at `#/verify` (and a 30-line CLI) where anyone pastes or scans a receipt and checks the Ed25519 signature against CAPABLE's published public key, offline, without asking our server.
- It shows: valid signature, task version, checks, conditions, and whether the share token has been revoked (that part needs to be online).
- Demo moment: a judge verifies Aarav's receipt on their own phone. **"Don't trust us. Verify it."**

**2. Name-blind employer seat + fairness ledger** (pain: Mobley v. Workday, EU AI Act "high-risk" hiring AI, 85% vs 8.6% name bias in embedding screeners)
- The employer seat shows candidates as `Candidate 7F3A`, with no name, college or photo, until the learner opts to reveal them. The film already shows this.
- Every decision an employer takes in the seat (shortlist, pass) is appended to a hash-chained audit log with the coverage that was visible at that moment.
- A "four-fifths check" panel over the DEMO cohort, clearly labelled synthetic, shows what an auditor would see.
- Pitch line: *"Deterministic grading is auditable by construction. Black-box screeners are not."*

**3. Verified Employer Registry** (pain: ₹8 crore fake-offer rings, I4C biometric-harvesting alert)
- Employer requirements are signed by an organization key, so the learner sees "Verified demand" against unverified postings.
- Opportunities from unsigned sources can't request evidence.
- It protects learners, and it turns "compiled demand" into an asset nobody can spoof.

**4. One continuous "Aarav & Maya" demo path** (pain: our demo shows modules, and the film tells one story)
- A `?demo=aarav` seed that drives the exact film sequence: Maya's requirement, compile, three employers, Aarav's path with programming skipped, guided incident, unseen incident, receipt, Maya's seat at 5 of 8, the Docker/CI/CD change, delta, awaiting validation.
- Same names, same numbers as the film, so the live demo feels like the film coming true.

### Tier 2: working prototype for the final, framed as the next release

**5. Voice-first frontline verification** (pain: 2.1B informal workers, 4.9% formal vocational training in India, ~15% desktop LMS completion)
- Practical Arena / FLUX tasks get voice prompts and voice answers in Kannada and Hindi (we already have the Chirp3 pipeline), runnable on a low-end phone.
- The unseen work order is read aloud; the worker answers by tapping or speaking numbers; grading stays deterministic. Hazardous competencies still force a supervised, in-person outcome.
- This answers KelasaPass, SkilledIN and KaamVaani on their own ground, with what they lack: tasks compiled from demand, unseen variants, no AI judge.

**6. MSME "Hiring in a box"** (pain: 39% of US SMBs have no HR; Indian MSMEs face 45% attrition and only 7.7% offer training)
- Three one-click templates: store operations, accounts assistant (GST reconciliation in DataLab), electrical maintenance (Practical Arena).
- The owner picks a template, CAPABLE compiles it, and candidates arrive pre-verified, with per-requirement coverage.
- Where no lab exists, the template says "awaiting validation". It never fakes a check.

**7. Stall Radar / Adjacency GPS** (pain: 24.2% of mid-career professionals stalled; reskilling into adjacent roles cuts stall risk by over 80%)
- From existing evidence, list the roles that are one or two capabilities away by graph overlap, ranked by the size of the gap.
- Example: "You are 2 capabilities from Payments Support Engineer and 3 from Cloud Support."
- Small to build on `path.ts` + `blueprint()`, and a strong demo for the "white-collar too" question.

**8. Transfer-verified L&D, the enterprise wedge** (pain: $458.7B training spend, 8% CEO ROI, 12% apply learning on the job)
- After a course, CAPABLE schedules unseen work checks at 30, 60 and 90 days, using the same assessment contracts.
- L&D reports "proven on unseen work at day 60" instead of "completed".

### Tier 3: roadmap slide only (don't build, show the direction)

- **Live internal capability graph** for enterprises (internal mobility; talent hoarding).
- **Demand-synced curriculum + outcome telemetry** for colleges and ITIs (NAAC/NBA/NCVET evidence; PMKVY placement tracking was discontinued).
- **Cross-border capability equivalency** (MPI: about 2.1M underutilised college-educated immigrants in the US).
- **Regional capability pools** so MSMEs stop losing five months of training to poaching.
- **Pre-graduation employer-backed capability sprints** (an internship cuts underemployment odds by 48.5%).

---

## 5. Why nobody has built this (have this answer ready)

1. **Incentives.** The chain is separate businesses, and each optimises its own link: courses sell completions, job boards sell listings, ATS vendors sell filtering, staffing earns on churn (4.75 hires per seat per year). Owning the loop means giving up a business model built on the broken link.
2. **Authoring cost.** Real, unseen, gradable work used to cost an assessment team weeks per role. The Work Compiler, blueprint tests and variant generation bring that close to zero, and AI makes it cheaper still, as long as AI never grades.
3. **Change.** Static taxonomies die in 12 to 18 months (Gartner and RedThread figures in the audit). A diff-based graph is designed for change.
4. **Why now.** AI made faking a signal free. The same technology made compiling demand and generating work cheap. The film's line: "the technology that broke the signal can rebuild it, as long as it's never the judge."

## 6. Business model and moat

- **Learners:** free, forever. Their receipts are theirs.
- **Employers:** pay per compiled requirement and per verified shortlist, a fraction of the 15–30% staffing fee. Enterprises license the verification API, which includes the audit log.
- **MSMEs:** hiring-in-a-box through industry associations and aggregators, on a free or low tier.
- **Institutions:** outcome telemetry subscription (accreditation evidence).
- **Moat:** (a) the shared demand graph sharpens with every employer, and (b) the library of validated assessment contracts. Each new contract makes every receipt more useful. Receipts are portable, so learners have no reason to leave, and employers come to where verified people are.

## 7. Pilot (what we'd measure, and the only claims we'll make)

Four weeks, 30 learners, 3 trainers, 3 employers. One question: **does verified work change who gets an interview?** Measures: interview rate for receipt-holders against résumé-only candidates, employer screening time per candidate, the share of interviews where the employer says the evidence was decisive, and learners passing an unseen task on the first attempt compared with after the GPS path. Until the pilot reports, we claim mechanisms, not outcomes.

## 8. Final-round pitch structure (5 minutes)

| Time | What | Notes |
|---|---|---|
| 0:00–1:15 | The film's cold open + Aarav & Maya + "signal collapse" (cut from the film, 0:00–1:35) | Let the film carry the emotion; don't talk over it |
| 1:15–1:55 | Live: "We start with the work." Paste Maya's requirement → compile | Pause on "A job description just became a curriculum." |
| 1:55–3:15 | Live: shared graph → GPS skip → unseen CodeLab incident → signed receipt → **judge verifies the receipt on their phone** (Tier 1 #1) | The strongest trust moment in the room |
| 3:15–3:55 | Live: apply the Docker/CI/CD change → delta → awaiting validation | "The market changed. The pathway changed. The learner didn't start again." |
| 3:55–4:30 | Why nobody does this + rail (enterprises, MSMEs, frontline, colleges) | One slide or the film's rail scene |
| 4:30–5:00 | The mantra, then the final "CAPABLE." | Then stop. |

**Likely judge questions:**
- *"AI can solve your tasks too."* Yes, and AI is allowed while learning. Proof comes from an unseen variant in a locked sandbox, hidden checks, reproducible grading, and a human reviewing the incident report. We don't claim identity verification; proctoring is a pluggable layer.
- *"How is this different from HackerRank or LinkedIn Skills?"* They test generic puzzles or collect self-tags. We compile one employer's actual work into tasks, share the foundation across employers, and recompile the delta when the role changes.
- *"Cold start: why would employers write requirements?"* Because it takes one paragraph in their own words, and it replaces a JD they already write. The first three employers each get a shortlist with evidence.
- *"Is this only for software?"* No. The same graph and receipts already run solar, EV, electrical and data labs offline-first, and voice-first frontline is the next build.

---

## Appendix: the film

- **Narration:** `python scripts/capable_x_vo.py` (Chirp3-HD `en-IN-Charon`, rate 1.06, cached per line in `outputs/capable_x_vo/`, cost-logged; the full run cost $0.19). Edit a line in `BEATS`, re-run, and only that line is billed. `--estimate` builds timings with no paid calls.
- **Score:** `node scripts/capx_score.mjs`. An original synthesized score (no samples, no licences), timed to the chapters and ducked under the voice. Re-run it after any narration change.
- **Picture:** `remotion/src/capx/` (`kit.tsx` primitives, `scenesA.tsx` problem, `scenesB.tsx` solution, `CapableX.tsx` composition, HUD, captions, SFX). Every animation is keyed to the spoken word with `at(g, beat, "phrase")`, so timings follow the voice automatically.
- **Render:** `cd remotion && npx remotion render CapableX ../out/CAPABLE-X-Film.mp4 --concurrency=8 --crf=18`.
- **Budget:** `MAX_TEST_BUDGET_USD` was raised from 5.00 to 5.50 (with approval) for this narration.
