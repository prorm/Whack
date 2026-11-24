# Demo script: about 170 seconds

**The recorded demo is the real app:** `docs/media/scrollproof_demo.mp4` (170 s, 1280×720). The soundtrack is the app's own lesson narration, placed at the exact moments each line played, over the lesson music bed. Chapter times are in `docs/media/scrollproof_demo_chapters.txt`. To re-record: `node scripts/record_demo.mjs` (see README).

To demo live: `cd app && npm run demo`, then open `http://127.0.0.1:4173/#/home?demo=reset` in a 1280×720 window with sound on.

| Time | Screen (exact action) | What the audience hears or sees |
|---|---|---|
| 0:00–0:15 | **Homepage**: the live lesson preview, then the five career tracks with their depth labels. Start the solar course → course map 0/5. | *"ScrollProof starts with learning, not a feed. Pick a career; this one goes from 'what is a volt?' to sizing a real rooftop string."* |
| 0:15–0:40 | **Start lesson 1.** Cold open (06:47, inverter fault), then "Electricity is water": push, flow, power. | The app's narrator speaks; karaoke captions; the variables panel rolls. |
| 0:40–0:60 | **Experiment:** drag Push to 41.6 V and Flow to 13 A → *Goal reached*. **Test:** type 500 → hint (not the answer), then 540.8. | Every number is computed by code. Wrong answers get a hint. |
| 1:00–1:04 | Load the seeded learner (lessons 1–4 done). Open **Lesson 3**. | *"Let's jump ahead to a learner on lesson 3."* |
| 1:04–1:43 | **Predict:** pick "Fewer volts" → the common wrong guess is named. **Experiment:** drag the thermometer down until 12 panels cross 600 V (*INVERTER TRIPS*). **Explain:** the datasheet rule appears line by line. | The learner discovers the rule before being told it. |
| 1:43–2:01 | **Project:** Mr. Sharma's 14 panels. Inverter A, 2 × 7 → "Array not oversized ✗". Switch to B → all checks ✓. Write the explanation → **Submit**. | Real project work, saved to the Proof Passport with the explanation kept for trainer review. |
| 2:01–2:08 | **Prove it alone:** unseen work order (new city, panel and inverter) → *PROVEN · system-assessed*. | Proof is a task you have never seen, graded by code. |
| 2:08–2:17 | **Job match: 4/4.** *Eligible for a supervised practical assessment. Not a licence.* Tick records → agree → **Share**. | The job lists exact skills. The learner controls consent. |
| 2:17–2:28 | **Employer seat (DEMO):** inspect evidence → **Shortlist** → **Invite to supervised practical**. | Employers see answers, not a score. Nothing is sent. |
| 2:28–2:31 | **Learn:** the invite banner, *DEMO · not a job offer*. | |
| 2:31–2:50 | **Revise:** a reel for a learned concept (*One hose*), then **Just show me why**. | *"Reels are for remembering, not learning. Optional, short, and only for what you learned."* |
| 2:50 | Back to Learn. | *"ScrollProof. Learn by doing. Remember by scrolling. Get hired through proof."* |

## If something goes wrong live
- **Share links fail:** you are on `vite preview`. Use `npm run demo`.
- **No sound:** check the 🔇 button in the lesson header. Muted lessons still run, with captions timed to the real narration.
- **Revise says "Nothing to revise yet":** that is correct on a fresh device. Finish a lesson, or load `#/home?demo=seed`.
