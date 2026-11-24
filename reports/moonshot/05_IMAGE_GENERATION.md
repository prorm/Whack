# Image generation and editing

One text-only prompt asked for plain stock tins, a carton and an unlabelled tabletop with negative space. Exact educational text stays in the renderer. Two models generated one 1K vertical asset each. One reference edit requested a change in lighting around the Lite image. The reference was compressed to JPEG to fit the local upload bound.

| Operation | Usage-priced USD | Latency | PNG bytes | Artifact |
| --- | ---: | ---: | ---: | --- |
| 3.1 Flash-Lite Image | 0.03362 | 3.08 s | 866,753 | [Lite](../../moonshot/media/image-lite.png) |
| 3.1 Flash Image | 0.06724 | 8.45 s | 1,782,667 | [Flash](../../moonshot/media/image-full.png) |
| 3.1 Flash-Lite reference edit | 0.03389 | 5.49 s | 681,704 | [Lighting edit](../../moonshot/media/image-edit.png) |

All three outputs measured 768 × 1376. In a visual inspection, the Lite image and its lighting edit kept the hand, carton and arrangement in nearly the same positions. The stronger-generation comparison added a notebook and changed the tin arrangement, though it was generated from text without the same reference. It therefore tests visual variety. Acceptance rates, character identity across shots and long-run reuse remain unknown. Use source footage or a programmatic stock table where learning depends on the real row or number. Compress optional illustrations. [Published image pricing and sizes](https://cloud.google.com/model-garden/pricing) · [Usage metadata](COST_LEDGER.jsonl)
