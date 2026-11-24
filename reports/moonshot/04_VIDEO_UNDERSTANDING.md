# Video understanding shootout

One 23-second staged visual trace with fixed action starts at 0, 4, 8, 13 and 18 seconds. The independently authored key includes the wrong intermediate closing value, corrected closing value, observed count and signed variance. Timestamp recall uses a ±2 s tolerance. A selected action label or a nonempty citation is weaker than semantic verification. Every metric describes this synthetic clip, not general worker video performance.

| Condition | Actions / 5 | Times / 5 | Facts / 4 | Latency | Usage estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3.5 Flash-Lite, narrated native | 5 | 5 | 3 | 2.64 s | $0.00212 |
| 3.8 Flash LOW, narrated native | 5 | 5 | 4 | 13.92 s | $0.00421 |
| 3.5 Flash-Lite, five timestamped frames | 4 | 2 | 3 | 2.78 s | $0.00308 |
| 3.8 Flash LOW, five timestamped frames | 4 | 4 | 4 | 6.24 s | $0.00612 |
| 3.5 Flash-Lite, silent native | 4 | 3 | 3 | 2.32 s | $0.00160 |
| 3.5 Flash-Lite, occluded native | 4 | 4 | 3 | 2.39 s | $0.00160 |

The still-photo run found three of four facts and proposed three actions without timestamps. Text recovered three calculable facts and proposed zero recorded actions. Missing intermediate value 114 was persistent in Flash-Lite. A follow-up-conditioned response attached the visible 12 to TIN-24 even though 12 belongs to the next row. In another segment it ran a displayed and narrated instruction together into a single quote. Grounding review must inspect row association, timing, and whether captions are exact quotes.

Initial 3.8 calls with MINIMAL returned HTTP 400. LOW corrected the request profile. Three Flash-Lite completions wrapped their result in a one-item array. The runner recovered and scored the raw responses without further inference. Provider acceptance and local parsing are separate outcomes. [3.8 Flash settings](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash) · [Run metadata](EXPERIMENT_RESULTS.jsonl) · [Independent timestamps and answers](../../moonshot/fixtures/golden.json)

**Decision.** Native narrated input is the first route for short source capture. A few timestamped stills can lower latency with the stronger model but lost one action here and were costlier than native with both models. Escalation improves the intermediate fact in this case, with a significant time tradeoff. Keep stills for uploads with explicit evidence gaps. [Narrated source](../../moonshot/media/source-narrated.mp4) · [Occluded source](../../moonshot/media/source-occluded.mp4)
