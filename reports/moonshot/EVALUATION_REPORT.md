# Evaluation report

| Area | Evidence type | Result |
| --- | --- | --- |
| Existing engine | Automated | 35/35. Graph, learner replay, proof, remix and scheduling regressions |
| Moonshot domain and reference data | Automated with authored gold | 8/8 unit tests plus 12 numeric keys, 12 guarded text inputs and 12 privacy cases |
| Capture extraction | Actual provider + synthetic controls | 3.8 Flash LOW recovered 5/5 action labels, 5/5 approximate timestamps and 4/4 numeric facts on one recording. Other conditions show missed actions, wrong row attribution and missing intermediate value |
| Query routing | Closed-scope synthetic instrument check | 12/12 source-span or abstention cases for explicit rules, versus 5/12 transcript lexical and 6/12 timestamped lexical. These questions informed the rules |
| Localization | Actual provider + deterministic lexemes | Both mixed-text translations kept 8/8 terms. Raw English WER 13.0–15.6% on one synthetic clip. Kannada samples need fluent review |
| Visual generation | Actual image creation and edit | Three images produced. Reuse, character consistency, teaching quality and acceptance rates unassessed by learners |
| Browser flow | Automated integration | Mobile/desktop and 200% text. Source correction, versioned moderation, reduced-motion recall, network loss, private recording, reconnect, trainer auth and consent, and text pack |
| Human outcomes | Pending | No observed worker expertise, learning gains, creator acceptance, hiring or aesthetic preference ratings |

### Significant failures and corrections

- Gemini 3.8 Flash rejected three requests at MINIMAL. LOW brought back valid output. Unknown fees remain reserved.
- Three JSON responses used a one-item list wrapper. Re-scored from raw captures with no extra inference.
- Some videos lost the initial 114, or associated the wrong row's 12 with TIN-24. One run claimed source wording that combined multiple observations. A syntactically valid timestamp and a nonempty quotation do not establish correctness.
- The reviewer UI blocks the planted C5 error. The source or reviewer is responsible for domain judgment. Model output has no pathway to automatically approve the lesson, worksheet or credential.
- Review flow is deliberately same-device. Production identity, cross-device recovery, wider permissions, genuine expert readiness and accessibility with physical screen readers remain open.
- Browser instrumentation found an endpoint-security request containing a synthetic form marker. App capture POST count was zero. The privacy report treats this as a browser-environment risk for any real pilot.

No model-judged or human preference metrics were used as acceptance evidence. Runtime is a production-style local server and Chromium. [Provider results](EXPERIMENT_RESULTS.jsonl) · [Browser results](../../moonshot/benchmarks/browser-results.json) · [Local comparisons](../../moonshot/benchmarks/local-results.json)
