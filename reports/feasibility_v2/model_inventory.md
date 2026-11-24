# Model / API inventory

Probed 2026-11-24T00:50:20 on project `hackathons-512621` with free metadata calls (`models.list`, `models.get`). Listing counts: global: 36 models, us-central1: 127 models.

| Model | Location | Available | Price (USD) in config | Price source | Used in v2 for |
|---|---|---|---|---|---|
| `gemini-3.8-flash` | global | yes | input_per_1m=0.75, output_per_1m=3.75 | brief (intro promo to 2026-12-31) | exp1 extraction, exp3 compile |
| `gemini-3.7-flash` | global | yes | not in config (guard uses conservative $2/$12 per 1M) | - | - |
| `gemini-3.6-flash` | global | yes | not in config (guard uses conservative $2/$12 per 1M) | - | - |
| `gemini-3.5-flash` | global | yes | input_per_1m=1.0, output_per_1m=5.0 | assumed | - |
| `gemini-3.5-flash-lite` | global | yes | input_per_1m=0.3, output_per_1m=2.5 | brief | exp1 extraction, exp3 compile, TTS QA (v1) |
| `gemini-3.1-flash-lite` | global | yes | input_per_1m=0.25, output_per_1m=1.5 | assumed | exp1 extraction |
| `gemini-3.1-pro-preview` | global | yes | not in config (guard uses conservative $2/$12 per 1M) | - | - |
| `gemini-3-flash-preview` | global | yes | input_per_1m=0.5, output_per_1m=3.0 | assumed | - |
| `gemini-3.8-flash-tts` | global | yes | input_per_1m=0.5, output_per_1m=10.0 | assumed (audio output tokens) | exp3 Kannada narration sample, exp5 personalised hook |
| `gemini-3.5-transcribe` | global | yes | not in config (guard uses conservative $2/$12 per 1M) | - | - |
| `gemini-3.1-flash-lite-image` | global | yes | per_image=0.034 | brief | not called in v2 (reused v1 images) |
| `gemini-3.1-flash-image` | global | yes | per_image=0.067 | assumed | - |
| `imagen-4.0-fast-generate-001` | us-central1 | **no** | per_image=0.02 | brief | unavailable |
| `veo-3.1-lite-generate-001` | us-central1 | yes | per_second_audio=0.05, per_second_silent=0.03 | brief | not called in v2 (reused v1 clips) |
| `veo-3.1-fast-generate-001` | us-central1 | yes | per_second_audio=0.1, per_second_silent=0.1 | brief | - |

## Supported operations actually exercised

- Structured JSON output with `response_json_schema` (Pydantic schemas): 84/84 exp1 + 18/18 exp3 responses parsed and validated.
- Audio input (voice-note understanding): gemini-3.5-flash-lite / 3.1-flash-lite / 3.8-flash accepted an mp3 inline part (exp1 case opp14).
- TTS: gemini-3.8-flash-tts returns a WAV container (`audio/wav`), not raw PCM; it rejects `system_instruction` (400) and sometimes reads style directions aloud (v1 finding).
- Thinking control: `thinking_level='low'` accepted by Gemini 3.x text models.

## Price caveat

Prices labelled `brief` come from the hackathon brief and were not verified against a live Google price sheet in this run; `assumed` entries are placeholders. All cost figures in this report scale linearly with these prices and can be recomputed with `scripts/v2_unit_economics.py`.
