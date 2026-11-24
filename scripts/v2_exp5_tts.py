"""Experiment 5: measure the cost/latency of ONE personalised TTS line (the only metered per-learner reel asset)."""
import json, sys, time, wave, io
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT))
from google.genai import types
from core.v2_llm import V2LLM, log_result, spend_summary
props = json.loads((ROOT / "outputs/feasibility_v2/exp5_reel_props.json").read_text(encoding="utf-8"))
text = props["hook"].replace('"', "")
llm = V2LLM("exp5")
out = ROOT / "reel/public/remix_hook_voice.wav"
model = "gemini-3.8-flash-tts"
est = llm.guard(model, len(text), 1500, "exp5_tts")
with llm.ledger.track("exp5_tts_hook", model, "text") as rec:
    r = llm.client.models.generate_content(model=model, contents=text, config=types.GenerateContentConfig(
        response_modalities=["AUDIO"], speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")))))
    rec.input_tokens = r.usage_metadata.prompt_token_count or 0
    rec.output_tokens = r.usage_metadata.candidates_token_count or 0
    data = r.candidates[0].content.parts[0].inline_data.data
    out.write_bytes(data)
with wave.open(str(out)) as w:
    dur = w.getnframes() / w.getframerate()
row = {"experiment": "exp5", "step": "tts_hook", "model": model, "latency_ms": rec.latency_ms, "usd": round(rec.usd, 6),
       "audio_tokens": rec.output_tokens, "seconds": round(dur, 2), "wav_bytes": out.stat().st_size, "est_worst_usd": round(est, 5)}
log_result(row); print(row); print(spend_summary())
