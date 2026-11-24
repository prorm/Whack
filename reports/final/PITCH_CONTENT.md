# Pitch content: slide by slide

Mark every number as *illustrative* or *measured*. Nothing below is a user outcome. There are no users yet.

**1 · Title**
ScrollProof, powered by FLUX. *Scroll less aimlessly. Learn more meaningfully. Prove what you can do.* Learn · Prove · Earn.

**2 · Problem**
- Practical skills are invisible: informal workers can't show what they can do.
- Certificates are untrusted, and resumes say nothing about the actual task.
- Passive video builds fatigue, not competence. Watch time is not skill.
- Employers in the trades screen on paper, then train from scratch.

**3 · Insight**
Short-form attention is already there. Point it at a job, make every swipe a decision, and turn the decisions that matter into inspectable evidence.

**4 · Product: one loop**
Pick a job → goal-directed reels → unseen proof task → Proof Passport → consented employer view → supervised practical / interview invite. Experienced workers feed the loop back with Field Scars.

**5 · The reel is the USP**
Motion-graphics intuition reels, about 10 s each: setup → forced prediction → payoff that shows why. Every number is computed live by tested code. AI video is used only as a labelled backdrop where real footage sells an analogy (water at the brim, a kinked hose). Misses come back first next session. Every card shows why it is in your feed.

**6 · Proof, not certificates**
- Unseen tasks generated from seeds and graded deterministically. Known wrong methods are named ("rounded a safety limit up").
- Passport levels: Practice / System-assessed / Trainer-reviewed / Identity-verified (not available yet, and we say so).
- Share links are re-graded by the server from raw answers. Revocation is enforced server-side.
- Hazardous trades earn a supervised practical, never a licence.

**7 · Technology**
- React/TS PWA, works offline. Zero runtime AI in learning, grading or matching.
- Pure TypeScript engine: physics, assessments, passport and goal ranking, with 44 FLUX unit tests + 35 engine + 8 moonshot (all passing).
- SQLite server: sync, trainer review, share links.
- One-off media: Gemini images, Veo plates and TTS, all cached and cost-logged ($4.35 lifetime of a $5 cap; the 2 motion plates tonight cost $0.60).
- JSON Lab Blueprints let a practitioner add a new threshold-type episode without code. Their test cases must pass before the episode publishes.

**8 · Business model** (illustrative pricing hypotheses, not validated)
| Stream | Price | Customer |
|---|---|---|
| Successful-hire fee | ₹1,500–3,000 / hire | Local employers |
| Employer subscription | ₹1,499–4,999 / month | SMEs, contractors |
| Institutional licence | ₹100–300 / learner / month | ITIs, colleges, training centres |
| Sponsored skill missions | custom | Industry partners |
Learners pay ₹0. Mentor rewards come from employer revenue, weighted by verified learning gains. Zero runtime inference keeps the marginal cost of practice near zero; hosting, content, review and support still cost money.

**9 · Inclusion**
Offline PWA, low-data mode (Veo backdrops are skipped under Save-Data), reduced-motion support, captions as on-screen kinetic text, large touch targets, keyboard and screen-reader labels. A Kannada pathway exists for the older inventory flow. The FLUX/motion pathway is English-only today, and a fluent reviewer is needed before any Kannada claim.

**10 · Validation so far (honest)**
- Measured: automated tests and a 30-step browser walkthrough of the learner-to-employer path (see FINAL_QA.md).
- Not measured: learning gains, recall, placements, employer satisfaction. These are the pilot's job.

**11 · Pilot and ask**
4 weeks, 30 job seekers, 3 vocational trainers, 3 local employers, one role. Measure unseen-task improvement, delayed recall, trainer agreement with the auto-grade, interview conversion and placements (PILOT_PLAN.md). Ask: an ITI partner and 3 employers willing to define one skill mission each.

**Closing line:** *Don't show us what you watched. Show us what you can do.*
