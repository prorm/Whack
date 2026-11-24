# Speech and localization

The 23-second English reference is an authored script carried by a local synthetic narrator. Both transcriptions came from actual Gemini inference on that recording. Raw WER lowercases and tokenizes the strings and counts spoken vs numeral forms as differences. It therefore mixes transcription quality with formatting choices. It is one clip, not an estimate of natural speech WER.

| English audio path | Raw WER | Latency | Usage estimate |
| --- | ---: | ---: | ---: |
| Gemini 3.5 Flash-Lite | 15.58% | 1.64 s | $0.000449 |
| Gemini 3.1 Flash-Lite | 12.99% | 1.66 s | $0.0004705 |

Both recognized 120, 30, 18 and 128 as literal numbers. They did not extract 132 in their transcripts because the narrator explains that calculation without speaking the final digits. Test visually inferred results separately from speech.

Mixed Kannada-English **text** was translated to English by Flash-Lite and 3.8 Flash LOW. Both preserved eight of eight protected lexemes, including SKU, literal formula, numbers and sign. A second Cloud path synthesized the same Kannada-oriented script with Standard-A and Chirp3-HD-Aoede. Speech naturalness, whether TIN-24 is intelligible, and how the voices pronounce the formula require fluent human review. This was synthetic voice output. No speaker voice was cloned. [Code-mixed source and captions](../../moonshot/datasets/tin-24.json) · [Results](EXPERIMENT_RESULTS.jsonl)

| Kannada voice | Size | Latency | Usage estimate | Review sample |
| --- | ---: | ---: | ---: | --- |
| Chirp3-HD-Aoede | 59,712 B | 2.27 s | $0.00273 | [Listen](../../moonshot/media/tts-kannada-chirp.mp3) |
| Standard-A | 106,752 B | 1.05 s | $0.000364 | [Listen](../../moonshot/media/tts-kannada-standard.mp3) |

Keep English audio and timestamped captions available. Expose Kannada text and a labelled synthetic sample as drafts, and fall back to source text offline. Review original narration plus translated subtitles first, optional voiced translation second, and defer direct dubbing. Cloud Speech-to-Text and Translation were disabled for this project. Native code-switched audio, Hindi, diarization, speech-to-speech and translated timing remain pending. [Cloud voice catalog](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types) · [Pricing](https://cloud.google.com/text-to-speech/pricing)
