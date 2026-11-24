# Skill Mirror

The inventory rubric checks expected closing stock and signed difference against an independently verifiable calculation. Twelve authored records include zero stock, exactly matching counts, shortages and surpluses. Both fields accept any valid calculation method. Explanations are optional private audio or video and can be attached from files. Recording runs only after an explicit browser action.

| Case | Observed behavior or current boundary |
| --- | --- |
| Correct, alternative valid method | Correct values pass. Method and identity remain unverified |
| Reversed variance or added sales | Targeted feedback when those signatures match |
| Omitted, fractional or ambiguous | Invalid input is rejected. Neither review nor credential is inferred |
| Copied answer or fabricated workflow | Numeric match alone cannot prove authorship. No copy-detection efficacy claim |
| Contradictory speech, missing step, low-quality video | Explanation stays private. A human reviewer must inspect it in a future consented media process |
| Third-party evidence request | Wrong device token returns unavailable, and consent withdrawal removes the summary and payload |

The server regrades the exact recorded worksheet and binds a receipt to a payload hash. The opportunity view repeats only the skill and review state after opt-in. Employment readiness stays unknown. [Rubric tests](../../app/src/moonshot/domain.test.ts) · [Browser validation](../../moonshot/benchmarks/browser-results.json)
