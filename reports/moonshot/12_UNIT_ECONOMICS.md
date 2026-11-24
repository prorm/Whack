# Cost and operating economics

## Experiment accounting

22 fresh requests were attempted across reasoning, video understanding, speech and image operations. Usage-based cost with known usage was **$0.1642786**. Three validation failures lacked usage, so **$0.13566** remains reserved for unknown charges. The all-inclusive conservative estimate is **$0.2999386**. Durable admission holds totaled **$1.729808** and remain charged against admission to keep restarts fail-closed. These figures exclude historical spend. Provider invoiced amounts were unavailable. No deployments, hosted instances, storage resources or fresh generated-video operations were provisioned. [Moonshot ledger](COST_LEDGER.jsonl) · [Dry run](DRY_RUN_BUDGET.json)

## Projections

Assume USD $12/hour for paid contributor review and fluent-language review, eight minutes for playbook review, five for a translation check, and three for optional evidence review. Labor times and rates are scenarios. Assume 20% extra input work for parsing/retry, $0.08/GB delivery, and $0.023/GB-month storage for comparison. Amounts here represent one exercise and one cohort download.

| Unit | Calculation | Projected amount |
| --- | --- | ---: |
| One contributor capture analysis | 3.8 narrated model $0.00421 × 1.2 failure/retry reserve | $0.0051 plus capture time |
| One approved playbook | Capture inference + eight paid human minutes | $1.605 |
| One translated pack | Stronger mixed text translation $0.000304 + Kannada HD speech $0.00273 + five paid human minutes | $1.003 |
| One reusable reel asset | One measured Moonshot Lite image + one historic $0.12 shot as a hypothetical optional plate | $0.154 plus editing |
| One new Lite learner | 0.146 MB of initial HTTP responses × $0.08/GB, on-device grading and recall | about $0.000012 delivery |
| One human-reviewed worksheet | Three paid minutes | $0.60 additional |

All three modeled routes share a first approved, narrated and translated package costing about **$2.76**, with an optional converted media asset included. Assume 5 MB of monthly storage per package ($0.000115). In the per-learner generated route, add a fresh $0.12 shot, $0.03362 image, $0.00505 compile, $0.00303 speech/translation, and 6.8 MB delivery for each learner. Cached Rich uses about 0.35 MB each as a scenario, offline-first reuses the measured 0.146 MB cold Lite entry. All rows include one optional human review per learner, so the human workload dominates.

| Learners reusing the mission | Fresh outputs per learner | Cached Rich with local personalization | Offline-first Lite |
| ---: | ---: | ---: | ---: |
| 1 | $3.52 | $3.36 | $3.36 |
| 10 | $10.38 | $8.76 | $8.76 |
| 100 | $78.99 | $62.76 | $62.76 |
| 1,000 | $765.01 | $602.79 | $602.77 |

Potential savings are driven by reuse. The assumed reviewer labor remains material even when runtime AI spend is near zero. Measure preparation and moderation time, corrected releases and bandwidth in a real pilot before forecasting margins. [Provider rates](https://cloud.google.com/model-garden/pricing) · [Historical reference](../feasibility_v2/unit_economics.md)
