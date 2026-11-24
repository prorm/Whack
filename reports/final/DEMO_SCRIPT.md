# Demo script: about 160 seconds

**The recorded demo is the real app:** `docs/media/scrollproof_demo.mp4` (157 s, 1280×720). The soundtrack is the app's own lesson narration, placed at the exact moments each line played, over the lesson music bed. Chapter times are in `docs/media/scrollproof_demo_chapters.txt`. To re-record: `node scripts/record_demo.mjs` (see README).

To demo live: `cd app && npm run demo`, then open `http://127.0.0.1:4173/#/home?demo=reset` in a 1280×720 window with sound on.

| Time | Screen (exact action) | What the audience hears or sees |
|---|---|---|
| 0:00–0:10 | **Learn**: the course map, 0/5. Scroll to show the locked path, the project and the proof. | *"ScrollProof starts with learning, not a feed. One course: from 'what is a volt?' to sizing a real rooftop string."* |
| 0:10–0:34 | **Start lesson 1.** Cold open (06:47, inverter fault), then "Electricity is water": push, flow, power. | The app's narrator speaks; karaoke captions; the variables panel rolls. |
| 0:34–0:49 | **Experiment:** drag Push to 41.6 V and Flow to 13 A → *Goal reached*. **Test:** type 500 → hint (not the answer), then 540.8. | Every number is computed by code. Wrong answers get a hint. |
| 0:49–0:57 | Load the seeded learner (lessons 1–4 done). Open **Lesson 3**. | *"Let's jump ahead to a learner on lesson 3."* |
| 0:57–1:20 | **Predict:** pick "Fewer volts" → the common wrong guess is named. **Experiment:** drag the thermometer down until 12 panels cross 600 V (*INVERTER TRIPS*). **Explain:** the datasheet rule appears line by line. | The learner discovers the rule before being told it. |
| 1:20–1:46 | **Project:** Mr. Sharma's 14 panels. Inverter A, 2 × 7 → "Array not oversized ✗". Switch to B → all checks ✓. Write the explanation → **Submit**. | Real project work, saved to the Proof Passport with the explanation kept for trainer review. |
| 1:46–1:57 | **Prove it alone:** unseen work order (new city, panel and inverter) → *PROVEN · system-assessed*. | Proof is a task you have never seen, graded by code. |
| 1:57–2:06 | **Job match: 4/4.** *Eligible for a supervised practical assessment. Not a licence.* Tick records → agree → **Share**. | The job lists exact skills. The learner controls consent. |
| 2:06–2:17 | **Employer seat (DEMO):** inspect evidence → **Shortlist** → **Invite to supervised practical**. | Employers see answers, not a score. Nothing is sent. |
| 2:17–2:21 | **Learn:** the invite banner, *DEMO · not a job offer*. | |
| 2:21–2:40 | **Revise:** a reel for a learned concept (*One hose*), then **Just show me why**. | *"Reels are for remembering, not learning. Optional, short, and only for what you learned."* |
| 2:40 | Back to Learn. | *"ScrollProof. Learn by doing. Remember by scrolling. Get hired through proof."* |

## If something goes wrong live
- **Share links fail:** you are on `vite preview`. Use `npm run demo`.
- **No sound:** check the 🔇 button in the lesson header. Muted lessons still run, with captions timed to the real narration.
- **Revise says "Nothing to revise yet":** that is correct on a fresh device. Finish a lesson, or load `#/home?demo=seed`.
