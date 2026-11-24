# GO / CONDITIONAL GO / NO-GO by subsystem

Rubric 0–5 (documented in FINAL_REPORT.md §Rubric). U = UNVERIFIED (needs humans); scores are the evaluator's judgement from the evidence cited, not user-study results.

| Subsystem | Decision | Factual | Pedagogy | Personalisation | Localisation | Reliability | Cost | Why (evidence) |
|---|---|---|---|---|---|---|---|---|
| Opportunity-to-Skill (closed-vocabulary extraction + curated graph) | **CONDITIONAL GO** | 4 | 3 | n/a | 3 | 3 | 5 | 0/84 invented pay/location/employer, 0 injection wins; recall weak on WhatsApp shorthand (1–2/6). Condition: show extracted skills for human confirmation; use 3.8 Flash for Kannada script. |
| Learning Twin (diagnostic, mastery + uncertainty, path) | **GO (demo) / research for real learners** | 5 | 3 (U) | 4 | 3 | 5 | 5 | Paths differ for diagnosed reasons; 7 scenarios + offline merge tested. Mastery thresholds untested on real learners. |
| Deterministic adaptation policy (R1–R7) | **GO** | 5 | 3 (U) | 3 | n/a | 5 | 5 | Explainable, tested; effect on learning unmeasured. |
| Contextual bandit for individual modality | **NO-GO for the hackathon** | n/a | n/a | 1 | n/a | 2 | 5 | Synthetic sim: needs ~100–500 interactions per learner to beat a fixed default. Keep as guarded, population-level research only. |
| Universal compiler (course / reading / audio) | **CONDITIONAL GO** | 4 (numbers) / U (prose) | 3 (U) | 2 | 2 (U) | 4 | 5 | 64/64 exercise answers correct, 0 invented example ids; prose and Kannada need human review. Precompile + review once per concept; never compile at runtime. |
| Interactive visual + practical exercise | **GO** | 5 | 4 (U) | 2 | 3 | 5 | 5 | Deterministic, offline, no AI. |
| Memory Remix reels (cached media + on-device overlays) | **GO** | 5 | 3 (U) | 4 | 3 | 4 | 5 | Learner's own mistake quoted, fresh example, answer hidden, no AI per reel, cached clips 135–445 KB. Real-device swipe/video PENDING. |
| Server-rendered personalised MP4 reels | **NO-GO at scale** | 5 | 3 | 4 | 3 | 4 | 2 | 72 s render + 6.8 MB per 10 s reel per learner; fine for one showcase reel only. |
| Fresh Veo per learner | **NO-GO** | n/a | n/a | n/a | n/a | 2 | 1 | ~$0.12 and 45–99 s per 4 s clip (v1 measurement). |
| Proof Lab (deterministic grading, evidence levels, consent) | **GO** | 5 | 4 | n/a | 3 | 5 | 5 | 11 adversarial tests + 4 regression tests pass. Identity verification and real trainer workflow not built. |
| Offline / weak-connectivity PWA | **CONDITIONAL GO** | n/a | n/a | n/a | n/a | 4 | 5 | Desktop Chrome offline + latency tests pass; 1.5 MB precache. Condition: real Android checklist. |
| Kannada experience | **CONDITIONAL GO** | U | U | n/a | 2 (U) | 3 | 5 | Machine checks pass (script ratio, numbers, glossary for Flash-Lite); quality and pronunciation unverified. |
