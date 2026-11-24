# Demo script: 165 seconds

Setup: `cd app && npm run demo`, then open `http://127.0.0.1:4173/#/home?demo=seed` in a phone-sized window (400×860). Sound on.
A silent screen recording of exactly this path is at `outputs/demo_video/scrollproof_demo.mp4` (166 s, real app). Chapter times are in `outputs/demo_video/chapters.txt`. Record your narration over it, or perform it live.

| Time | Screen (exact action) | Narration |
|---|---|---|
| 0:00–0:09 | **Learn** tab, hero. Scroll once to the job cards. | "Millions of people can do the work but can't prove it. Short video already owns their attention. What if every swipe got them closer to a job?" |
| 0:09–0:17 | Goal card: *Solar installation apprentice · 2/3 proven*. Point at the rows: two proven, one "Retake". | "Meera picked a job. ScrollProof knows exactly which skills it needs, and which ones she has already proven. No score: three rows." |
| 0:17–0:32 | Tap **Open my feed**. The first reel is the *cliff* motion reel with the chip "Fixes your mistake on WO-JAIPUR-1777". Let the intro play, then pick **12**. | "Her last work order failed because she rounded a safety limit *up*. So the first reel in her feed is about exactly that. It's a motion graphic, not a meme. Predict first… twelve panels overflow the glass: 623 volts. A maximum is a cliff. Round down." |
| 0:32–0:52 | Swipe up through one more repair reel, then to the **proof slot**. | "Every card says why it's here. Pause, skip, come back: no penalty. When the gap is trained, the feed offers proof, not more content." |
| 0:52–1:05 | **Prove it now** → unseen work order (new city, panel, inverter). Type max and min → **Submit**. | "A task she has never seen, generated from a fresh seed and graded by tested code. No AI at runtime. Wrong answers get the *named* mistake, not just a red cross." |
| 1:05–1:15 | **See my job match** → *Eligible for a supervised practical assessment. Not a licence.* | "Three of three. And because this is electrical work, the best a simulation can earn is a supervised practical. We never pretend an app licenses someone to work live." |
| 1:15–1:18 | Tick records → agree → **Share**. | "Nothing leaves her passport until she chooses. She can revoke it." |
| 1:18–1:35 | **Employer** tab (paper theme). Candidates ranked by requirement rows. **Inspect** shows her exact answers versus the key. **Shortlist** → **Invite to supervised practical** → send. | "The employer posts what the work needs and sees only consenting candidates: the exact task, version and answers behind each claim. Shortlist, invite. Everything here is a DEMO employer, and nothing is sent." |
| 1:35–1:39 | **Learn** tab: the invite banner. | "Back on her phone: an invite, clearly labelled not a job offer." |
| 1:39–1:51 | **Passport** → inspect a record: rubric, raw answers, fingerprint, trainer-review binding. | "The Proof Passport is inspectable. Every claim shows the task version, rubric, answers, misconceptions and review status. The fingerprint detects edits. It does not prove identity, and we say so." |
| 1:51–1:56 | **Teach** tab. | "Experienced workers give back. They upload a real site mistake. It passes a safety sieve and two master reviews, then becomes a card. Rewards are proposed for verified learning gains, never views." |
| 1:56–2:45 | Montage: *Cold → more volts*, *One hose*, *9 PM blackout*, *Thundering herd*. | "Under the hood is FLUX. Every reel is a decision: predict, then watch the physics prove you right or wrong. Every number is computed live, so the same engine generates the next unseen task. Solar, EV and payments today, one blueprint at a time." |
| 2:45 | Back to **Learn** hero. | "ScrollProof. Don't show us what you watched. Show us what you can do." |

## If something goes wrong live
- **No share link?** You are on `vite preview`. Use `npm run demo`, which starts the server.
- **Feed starts with REMATCH instead of the cliff?** You answered reels earlier in this session. Reload `#/home?demo=seed`.
- **Offline question from judges:** load the app once, turn off the network and open `#/flux-reels`. The feed and proof checks still work. Share links need the server.
