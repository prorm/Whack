# Cost breakdown (feasibility v2)

- Pre-v2 ledger spend: **$0.6150** (brief reported $0.62; the conservative figure $0.62 is used for cap checks).
- v2 incremental spend (measured, all metered Vertex calls): **$0.2112** of the $2.00 v2 cap.
- Lifetime (conservative): **$0.8312** of the $5.00 cap.
- Cache hits (served from disk, $0, not in ledger): **14**.
- Claude Code subscription usage is NOT in this ledger (not a Vertex cost).

| Experiment / prefix | Calls | Failed | USD |
|---|---|---|---|
| exp1 | 84 | 0 | 0.1304 |
| exp3 | 19 | 0 | 0.0793 |
| exp5 | 1 | 0 | 0.0015 |

Most expensive single v2 call: `exp3_kn_tts` on `gemini-3.8-flash-tts` at $0.00894.
Most expensive operation in the project overall: a 4 s Veo 3.1 Lite clip ($0.12 silent, measured in v1). No Veo was generated in v2.
