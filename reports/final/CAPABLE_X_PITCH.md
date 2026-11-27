# CAPABLE X: the final-round pitch

Four speakers, one laptop, one phone handed to a judge, a hard stop at **5:00**.
**Film 0:00–0:36 → story 0:36–1:50 → live demo 1:50–3:50 → business 3:50–4:30 → close 4:30–5:00.**

> **The idea in one breath:** For ten years, getting hired meant grinding the same puzzles and polishing the same résumé. AI now does both for free, so those signals are dead. CAPABLE replaces them with the one signal AI can't fake for you: the work itself, compiled from what employers actually need, proven on a task you've never seen, and updated the moment the job changes.

**The four lines every judge should repeat afterwards:**
1. The job description becomes the curriculum.
2. The work becomes the proof.
3. The proof becomes opportunity.
4. When the world changes, the pathway changes with it.

---

## Why this version wins

- **It starts with the room's own life.** Every judge has been, has hired, or has taught a student grinding LeetCode and system design. Then AI solves the puzzle in seconds. That's the relatable moment, and it lands in the first 30 seconds.
- **The demo has moments the judges take part in.** A judge's own job description gets compiled live. A judge verifies a signed proof on their own phone, then watches it die when the learner revokes it.
- **It names who pays.** Learners never pay; employers, enterprises and colleges do. The moat is a network effect, not a feature.
- **It answers the obvious attack before it's asked:** "If AI can do the work, what are you testing?" We test what still matters with AI in the room: reading a system you've never seen, fixing it without breaking anything, and explaining it to a human.
- **It turns AI from the threat into the curriculum.** Every field now runs on AI and almost nobody is trained to work with it. **AI Pair** (`#/ailab`) grades exactly that: brief the assistant without leaking secrets, catch the call it gets confidently wrong, and prove it with a test or a meter reading. The same lab serves a backend engineer and an electrician. Vibe-coding builds a demo; this proves production judgement.

---

## Run of show

| Clock | Who | Screen | What happens |
|---|---|---|---|
| 0:00–0:36 | Film | `out/CAPABLE-X-Film.mp4`, 0:00–0:36 | The grind → "Then AI learned to do the prep" → 11,000 applications a minute → 97 of 100 never reach an interview |
| 0:36–1:20 | **Pranav** | Slides: Aarav & Maya, signal collapse | The two people who should find each other, the arms race, the diagnosis |
| 1:20–1:50 | **Swastik** | Slide: the loop | The flip: start with the work. The one closed loop. |
| 1:50–2:15 | **Swastik** narrates, **Prajwal** drives | `#/demand` | **Moment 1: a judge's job description, compiled live** |
| 2:15–2:35 | **Prajwal** | `#/gps` → `#/flux-reels` | **Moment 2: the path skips what you know; your mistakes come back as reels** |
| 2:35–3:10 | **Prajwal** | `#/ailab` → Unseen trial | **Moment 3: AI Pair. The copilot is confidently wrong; catch it, prove it, get it signed** |
| 3:10–3:30 | **Prajwal**, a judge | QR → judge's phone → `#/capable-public` | **Moment 4: "Don't trust us. Verify it." Then revoke, refresh, gone** |
| 3:30–3:50 | **Harsh** narrates, **Prajwal** drives | `#/demand` → apply change → `#/exchange` | **Moment 5: the world changes, only the delta is added** |
| 3:50–4:30 | **Harsh** | Slides: why nobody, business model, moat | Who pays, why it compounds, why now |
| 4:30–5:00 | **Pranav** + film | Film 8:50–9:04 (mantra → CAPABLE) | The close |

**Checkpoints.**
- If the demo starts after 2:00, drop Moment 2. Its 20 seconds are the cheapest to lose; the reels are already in the film.
- If the clock reads more than 4:40 at the close, skip the spoken close and play only the last 15 seconds of the film.

---

## The script

### 0:00–0:36 · FILM (no one speaks)
Play the cold open. Let it land. The last frame on screen is "3/100 reach an interview."

### 0:36–1:20 · Pranav: make them feel it (~105 words)
**[Slide: Aarav, a final-year student, 400 problems solved, 214 applications]**
That's Aarav. He did everything right. Four hundred problems. System design notes. Three projects. Two hundred and fourteen applications.

**[Slide: Maya, an engineering lead, 1,100 applications for one role]**
That's Maya. She needs one junior engineer who can find out why payments are failing and fix it. She has eleven hundred applications, and she can't tell which ones are real. Nine in ten employers now believe they've rejected real people because the application *looked* fake.

**[Slide: SIGNAL COLLAPSE]**
This isn't a talent shortage. It's a signal collapse. Education starts with content. Hiring starts with a résumé. **Neither starts with the work.**

### 1:20–1:50 · Swastik: the flip (~75 words)
**[Slide: the loop]**
So we flipped it. CAPABLE starts with the work.
An employer describes the work in their own words. We compile it into tasks and capabilities on a shared graph. Each learner gets the shortest path from what they've already proven to what's demanded. They practise on real incidents, prove it on one they've never seen, and carry signed proof to every employer who needs it.
When the job changes, we update only what changed. Let us show you.

### 1:50–2:15 · Moment 1: "Give us your job description" (Swastik narrates, Prajwal drives)
- **Do:** Hand a judge one of three printed job descriptions, or ask them to read one aloud from their own company. Prajwal pastes it into **Demand intelligence**.
- **Say:** "That took a tenth of a millisecond, on this laptop. Your work tasks. The capabilities, each with the evidence it needs. Prerequisites you never wrote down. And anything our graph doesn't know isn't faked: it says *awaiting validation*. **A job description just became a curriculum.**"
- **Backup:** if the judge declines, paste Paylane's requirement. Its real output is 4 tasks, 8 capabilities and 1 implied prerequisite.

### 2:15–2:35 · Moment 2: the path and the reels (Prajwal)
- **Do:** In `#/gps`, tick "I already know this" on Programming, and the path shortens. Switch to `#/flux-reels`: revision reels show only concepts the learner has already met, and a missed question pushes its callback reel to the top in a later session.
- **Say:** "He never sits through what he can already prove. And when he gets something wrong, it comes back as a thirty-second reel on day one, three, seven and twenty-one. The scroll habit does the revision."
- **Honest scope:** the live reels cover the FLUX tracks (solar, payments, EV), not yet CodeLab incidents. The film shows the CodeLab version as the story.

### 2:35–3:10 · Moment 3: AI Pair, catch the copilot (Prajwal)
- **Do:** Open `#/ailab` (Software track) and click **Unseen trial**. The server draws an incident the learner never practised.
  1. **Brief:** tick the ticket, the production log, `payments.js` and the handler's contract. Leave `.env` and `customers.csv` alone, and say so out loud.
  2. **Review:** the copilot offers two patches. Both say "I ran your visible tests: 2/2 pass. Safe to merge." Read the trap's claim aloud, then ship the other one.
  3. **Prove:** pick the test that exposes the trap, then click **Submit for server grading**.
- **Say:** "Every field now runs on AI, and nobody is trained to work with it. So every CAPABLE lab has an AI Pair mode. The copilot is fluent and confident, and in every trial one of its calls is wrong. Both patches pass every test he can see. One of them quietly breaks refunds. He doesn't need to out-type the AI. He needs to catch it. **Vibe-coding gets you a demo. This proves production judgement.**" On the receipt: "Graded by code, signed by the server. AI in grading: none."
- **Cheat card** (the server picks one of three incidents; the trap is the patch whose claim matches):

  | Trap patch says | Ship the other one. The test that exposes it |
  |---|---|
  | "Round to whole paise, and I simplified the branching…" | "A declined card, then a real payment" |
  | "Only a captured payment is money, so return early for every other event type." | "₹640 captured, then refunds of ₹200 and ₹500" (or "A refund for an order we never saw") |
  | "Refuse any refund larger than the captured amount, with 422." | "₹640 captured, then refunds of ₹200 and ₹500" |

- **If a judge asks about the trades:** switch to *Trades · electrical fault*. The vision assistant names a part at about 90% confidence (it is wrong about half the time) and hides one unsafe step in its plan. Flag the unsafe step, measure the part it blamed, and repair whichever part reads **OL**.
- **The classic CodeLab fix is still there** (`#/codelab` → Unseen incident) if you'd rather show code being written. Fixes: wrap the conversion in `Math.round(...)`; change `startsWith('payment.')` to `=== 'payment.captured'`; add `if (paise > captured - refunded) return { status: 422, body: 'refund exceeds captured amount' }`.

### 3:10–3:30 · Moment 4: "Don't trust us. Verify it." (Prajwal and a judge)
- **Do:** Click **Share**. A QR code for the public link goes on screen. A judge scans it, and their phone opens `#/capable-public`. The page fetches the receipt and our public key, then checks the **Ed25519 signature in their own browser**. Then Prajwal clicks **Revoke**; the judge refreshes and the link is dead (410).
- **Say:** "That signature was checked on your phone, not on our server. And when the learner says stop, it's gone."
- **Network (important):** the server binds `127.0.0.1` by default, and the QR encodes whatever address the page was opened on. Start it on the hotspot with `--host 0.0.0.0`, then open the app at `http://<laptop-LAN-IP>:4173` before you share, so the QR points somewhere the phone can reach. Rehearse this twice.
- **Fallback:** open the same link in a second laptop tab. The browser-side verification is identical.

### 3:30–3:50 · Moment 5: the world changes (Harsh narrates, Prajwal drives)
- **Do:** In Demand intelligence, click **Apply KiranaCart's new requirement**, then `#/exchange`.
- **Say:** "And then the world changes. Docker and CI/CD are now required. Most systems send Aarav back to the start. CAPABLE recompiles the role and adds only the delta: containers, CI/CD and the Linux they depend on. Everything he proved still counts, and since no lab can validate those three yet, it says so. **It never invents competence.** The market changed. The pathway changed. The learner didn't start again."

### 3:50–4:30 · Harsh: why nobody did this, who pays, the moat (~100 words)
**[Slide: the chain]**
Why doesn't this exist? Because hiring is a chain of separate businesses. Courses sell completions, job boards sell listings, screening software sells filters, and staffing earns when people churn. Nobody owns the loop.

**[Slide: who pays]**
Learners never pay to prove what they can do. Employers pay per verified shortlist, a fraction of the fifteen to thirty percent recruiters charge. Enterprises license verification, and AI Pair to upskill their own teams on working with AI safely. Colleges pay for outcome data they can finally show.

**[Slide: flywheel]**
And every employer who joins makes every receipt worth more. That's the moat.

### 4:30–5:00 · Pranav: the close (~45 words, then the film)
Today, Aarav spends two years grinding puzzles a machine can solve, and only then asks if they matter. Maya spends months filtering, and still wonders if her hire can do the work. Both questions arrive too late. **CAPABLE asks them first.**
**[Play film 8:50–9:04: the four-line mantra, then "CAPABLE."]** Stop. Don't add a thank-you over the logo.

---

## The product, in one picture

```
Employer's words ─► 01 Work Compiler ─► 02 Shared Capability Graph ─► 03 Career GPS
                                                                           │
   09 Market Delta ◄─ 08 Opportunity Exchange ◄─ 07 Signed Receipt ◄─ 06 AI Pair ◄─ 05 Unseen Proof ◄─ 04 Labs + Revision Reels
   (role changes → recompile, add only the delta, nothing proven is lost)
```

**The trust rule:** AI teaches and explains. Code verifies what can be measured. Humans judge what needs judgement. **No capability is ever awarded by an AI's opinion.**

**What's real today** (pure, tested core: 65 tests passing across 3 suites, `npm run test:all`):
- Work Compiler, the 37-capability graph, blueprint and change diff, Career GPS, coverage
- CodeLab (grading in the browser worker plus a server sandbox with unseen variants), DataLab
- FLUX labs (solar, payments, EV), Practical Arena, Solar Forge, revision reels with the 1/3/7/21 memory ladder
- **AI Pair** (`#/ailab`) for software and the trades: brief, catch, prove. The assistant is a labelled, scripted simulation. Whether its call is right comes from executing its patch against the reference handler, or from the Practical Arena circuit solver. Guided practice runs on the device; unseen trials are re-graded and signed by the server.
- Ed25519 receipts with in-browser verification, sharing, revocation (410)
- An optional Gemini "second opinion" restricted to graph ids

**DEMO:** every person, company, listing and pay figure, all labelled on screen.

**Never claim:** placements, hiring-rate improvements, identity verification, measured learning gains. A signature proves the assessment record, not who sat it.

---

## Business model

| Who | Pays for | Pricing hypothesis (to test in the pilot) | Why they pay |
|---|---|---|---|
| **Learners** | Nothing, ever | Free | Proof they own and carry. Free learners are the supply side of the network. |
| **Employers (startups, MSMEs)** | Verified shortlist per role | A flat fee per role filled, a fraction of a recruiter's 15–30% of first-year salary (on a ₹6 LPA hire, ₹90k–1.8L today) | Candidates arrive with evidence per requirement. Less screening time, fewer bad hires. |
| **Enterprises** | Verification API + audit log; **AI Pair seats** to upskill existing teams on working with AI safely | Per assessment run or an annual licence; per seat per year for AI Pair | Deterministic, name-blind-ready grading is auditable, which matters for the EU AI Act and lawsuits like *Mobley v. Workday*. |
| **Colleges, ITIs, training programmes** | Demand-synced curriculum + outcome telemetry | Per student per year | Outcome evidence for accreditation (NAAC/NBA/NCVET); placement cells get verified shortlists to send out. |

**Unit logic:** compiling a requirement and grading a deterministic task cost almost nothing. The expensive part of hiring, which is screening and the bad-hire risk, is exactly what we remove. Revenue scales with roles filled and assessments run; cost scales with neither.

**Moat (a flywheel):** more employers → a sharper shared graph → every receipt counts at more places → more learners → more employers. Underneath sit two compounding assets: the compiled demand graph and the library of validated assessment contracts. A competitor can copy a screen, but not years of compiled demand and validated tasks.

**Go-to-market:**
1. **Beachhead:** backend and payments roles at Bengaluru startups, plus the placement cells of Tier-2/3 engineering colleges. Unstop's 2026 survey found 84% of undergrads unplaced; placement officers have every reason to try something that produces shortlists.
2. **Second wedge:** skilled trades through the FLUX labs we already run (solar, electrical, EV), voice-first and in the learner's own language, with MSMEs via industry associations.
3. **Enterprise:** the verification API and internal mobility, once receipts have a track record.

**Pilot (next 4 weeks):** 30 learners, 3 trainers, 3 employers. One question: does verified work change who gets an interview? We measure interview rate for receipt-holders against résumé-only candidates, employer screening minutes per candidate, and how often employers call the evidence decisive.

---

## Competition: where everyone else stops

| | Starts from | Proof is | When the job changes |
|---|---|---|---|
| LeetCode / HackerRank | Generic puzzles | A score on a puzzle AI solves in seconds | Nothing |
| LinkedIn / Naukri | The candidate's claims | Self-reported tags | Edit your profile |
| Coursera / Udemy / bootcamps | Content | A completion certificate | Buy another course |
| Staffing agencies | The vacancy | A recruiter's opinion | Re-hire (4.75 hires per seat per year) |
| Most Track 4 finalists (voice passports, QR skill cards) | The worker's profile | AI-scored videos or customer stamps | Nothing |
| AI tutors and "prompt engineering" courses | A chatbot or a video | A certificate for watching | A new course |
| **CAPABLE** | **The employer's actual work, compiled** | **Unseen work, graded by code, signed, revocable, including how well you work with AI** | **Recompile; add only the delta** |

Line for the stage: *"Most teams built a better passport. We built the system that decides what a passport should contain, and keeps it true when the work changes."*

---

## Q&A bank

1. **"AI can solve your tasks too."** Good: then working with it well is the skill. AI Pair grades exactly that, and the assistant is wrong in every trial on purpose. Beyond that, AI is in the room and we say so. Proof comes from an unseen variant the server draws, in a locked sandbox with hidden checks, plus a human-reviewed incident report. We test reading an unfamiliar system, fixing without regressions, and explaining it. Those skills still matter with AI, and they're what employers now hire for. We don't claim identity proctoring; it plugs in as a separate layer.
2. **"How is this different from HackerRank?"** They test generic puzzles. We compile one employer's real work, share the foundation across employers, and recompile when the role changes. The puzzle score dies when AI solves it; our receipt describes work that was done.
3. **"Cold start: why would employers write requirements?"** It's one paragraph in their own words, which replaces the job description they already write, and it returns a verified shortlist. Colleges bring the first learners.
4. **"Who validates the assessments?"** Every lab is a tested contract in code. A capability without a validated lab is marked *awaiting validation* and can never be awarded. The film shows this on purpose.
5. **"Is it only for software?"** No. The same graph and receipts already run solar, EV, electrical and data labs offline-first on a basic phone. Voice-first frontline verification is the next build.
6. **"What stops a learner faking the incident report?"** It goes to a human reviewer, bound to that exact attempt. Changing the attempt or the evidence detaches the review.
7. **"Privacy?"** The learner owns the receipt and shares it per employer with explicit consent. Revoke kills the link (410). Employers see only what was shared.
8. **"Bias?"** Grading is deterministic and identical for every candidate, so it's auditable by construction. Next we're building a name-blind employer seat and an audit log.
9. **"Business model, really?"** The employer pays per verified shortlist, at a fraction of a recruiter fee. Enterprises pay for the API; colleges for outcome data. Learners are free forever.
10. **"What's real versus mock-up?"** The compiler, graph, path, labs, grading, receipts, verification, revocation and AI Pair are real: 65 passing tests. The people and companies are DEMO, labelled on screen.
11. **"Why now?"** AI made faking a signal free, and it made compiling demand and generating fresh work cheap. The technology that broke the signal can rebuild it, as long as it's never the judge.
12. **"Your AI Pair assistant is scripted. Isn't that fake?"** Deliberately, and it says so on screen. A live model changes every week, so a trial would never be reproducible or fair across candidates. Scripting it means every candidate faces the same quality of mistake, and the right answer is computed (we execute the patch, or solve the circuit), never hand-typed. Next: a library of real model mistakes, captured and validated, fed into the same contract.
13. **"What will you do in 30 days?"** Run the 4-week pilot above, ship the name-blind seat and the verified-employer registry, and add a voice-first frontline lab.

---

## Before you go on stage

- [ ] `cd app && npm run build && node ../scripts/capable_server.mjs --port 4173 --host 0.0.0.0 --data .data/demo.sqlite` (the phone moment needs `--host 0.0.0.0`; plain `npm run demo` binds localhost only), then open `#/home?demo=reset` once. Keep tabs ready on `#/demand`, `#/gps`, `#/ailab`, `#/codelab`, `#/exchange` and `#/flux-reels`.
- [ ] Phone and laptop on the same hotspot. Server started with `--host 0.0.0.0`, app opened via the laptop's LAN IP (otherwise the QR points at 127.0.0.1). The share QR opens on a phone, and the signature verifies there. Rehearse twice.
- [ ] Three printed job descriptions for the judges (a backend one, a cloud one, an operations one).
- [ ] Film cued at 0:00, and a second player cued at 8:50 for the close.
- [ ] The AI Pair cheat card and the CodeLab fixes on a card in Prajwal's pocket.
- [ ] A full timed run under 4:45.
