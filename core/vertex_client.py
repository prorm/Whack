"""Dual-endpoint Vertex AI wrapper (google-genai SDK only).

* text_client  -> location=global        (Gemini 3.x text / multimodal / image models)
* media_client -> VERTEX_MEDIA_LOCATION  (Imagen 4, Veo 3.1 long-running operations)

Every call goes through CostLedger. Paid image/video calls are budget-guarded first.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from google import genai
from google.genai import types

from .cost_ledger import CostLedger, estimate_images, estimate_video
from .settings import model_registry, settings


class ModelUnavailable(RuntimeError):
    pass


class VertexClients:
    def __init__(self, ledger: CostLedger):
        s = settings()
        self.ledger = ledger
        if s.use_vertex:
            if not s.project:
                raise RuntimeError("Set GOOGLE_CLOUD_PROJECT (or GCP_PROJECT) for Vertex AI")
            self.text_client = genai.Client(vertexai=True, project=s.project, location=s.text_location)
            self.media_client = genai.Client(vertexai=True, project=s.project, location=s.media_location)
            self.backend = f"vertex:{s.project} text@{s.text_location} media@{s.media_location}"
        else:
            if not s.api_key:
                raise RuntimeError("GOOGLE_GENAI_USE_VERTEXAI=False needs GOOGLE_API_KEY")
            self.text_client = self.media_client = genai.Client(api_key=s.api_key)
            self.backend = "gemini-developer-api"
        self.resolved: dict[str, str] = {}
        self.probe_log: list[dict] = []

    # ------------------------------------------------------------------ probe
    def _client_for(self, model_id: str) -> genai.Client:
        loc = model_registry()["models"].get(model_id, {}).get("location", "global")
        return self.media_client if loc == "media" else self.text_client

    def probe(self, roles: list[str] | None = None) -> dict[str, str]:
        """models.get() each candidate (free metadata call); pick the first available per role."""
        reg = model_registry()
        cache: dict[str, tuple[bool, str]] = {}
        for role, spec in reg["roles"].items():
            if roles and role not in roles:
                continue
            chosen = None
            for mid in spec["candidates"]:
                if mid not in cache:
                    t0 = time.perf_counter()
                    try:
                        self._client_for(mid).models.get(model=mid)
                        cache[mid] = (True, f"ok ({int((time.perf_counter() - t0) * 1000)} ms)")
                    except Exception as e:
                        cache[mid] = (False, f"{type(e).__name__}: {str(e)[:90]}")
                ok, note = cache[mid]
                self.probe_log.append({"role": role, "model": mid, "available": ok, "note": note})
                if ok and chosen is None:
                    chosen = mid
            if chosen:
                self.resolved[role] = chosen
                if chosen != spec["candidates"][0]:
                    self.probe_log.append({"role": role, "model": chosen, "available": True,
                                           "note": f"FALLBACK from {spec['candidates'][0]}"})
        out = settings().reports_dir / "model_probe.json"
        out.write_text(json.dumps({"backend": self.backend, "resolved": self.resolved, "log": self.probe_log}, indent=2))
        return self.resolved

    def model(self, role: str) -> str:
        if role not in self.resolved:
            raise ModelUnavailable(f"No available model for role '{role}'. Run probe() first / check config/models.json")
        return self.resolved[role]

    # ------------------------------------------------------------------- text
    def ping_ttft(self, role: str, test: str = "preflight_ttft") -> dict:
        mid = self.model(role)
        with self.ledger.track(test, mid, "text") as rec:
            t0 = time.perf_counter()
            ttft = None
            text = ""
            usage = None
            for chunk in self.text_client.models.generate_content_stream(
                model=mid, contents="Say 'ready' in one word.",
                config=types.GenerateContentConfig(thinking_config=_low_thinking(mid)),
            ):
                if ttft is None:
                    ttft = int((time.perf_counter() - t0) * 1000)
                text += chunk.text or ""
                usage = chunk.usage_metadata or usage
            _fill_usage(rec, usage)
            rec.extra["ttft_ms"] = ttft
        return {"model": mid, "ttft_ms": ttft, "total_ms": rec.latency_ms, "reply": text.strip()[:40]}

    def generate_json(self, role: str, prompt: str | list, schema: type | None, test: str,
                      temperature: float = 0.9) -> tuple[str, dict]:
        mid = self.model(role)
        cfg = dict(response_mime_type="application/json", temperature=temperature,
                   thinking_config=_low_thinking(mid))
        if schema is not None:
            cfg["response_json_schema"] = schema.model_json_schema()
        with self.ledger.track(test, mid, "text") as rec:
            resp = self.text_client.models.generate_content(
                model=mid, contents=prompt, config=types.GenerateContentConfig(**cfg))
            _fill_usage(rec, resp.usage_metadata)
            text = resp.text or ""
            rec.bytes_out = len(text.encode())
        return text, {"model": mid, "latency_ms": rec.latency_ms, "usd": rec.usd,
                      "in_tokens": rec.input_tokens, "out_tokens": rec.output_tokens,
                      "thought_tokens": rec.thought_tokens}

    # ------------------------------------------------------------------ image
    def generate_image(self, role: str, prompt: str, out_path: Path, test: str,
                       reference: bytes | None = None, aspect: str = "9:16") -> dict:
        mid = self.model(role)
        kind = model_registry()["models"][mid]["kind"]
        self.ledger.guard(estimate_images(mid, 1), f"{test} via {mid}")
        with self.ledger.track(test, mid, "image") as rec:
            if kind == "imagen":
                resp = self.media_client.models.generate_images(
                    model=mid, prompt=prompt,
                    config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio=aspect))
                data = resp.generated_images[0].image.image_bytes
            else:
                contents: list = []
                if reference:
                    contents.append(types.Part.from_bytes(data=reference, mime_type="image/png"))
                contents.append(prompt)
                rec.extra["retries_429"] = 0

                def _bump(n):
                    rec.extra["retries_429"] = n

                resp = with_backoff(lambda: self.text_client.models.generate_content(
                    model=mid, contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                        image_config=types.ImageConfig(aspect_ratio=aspect))), on_retry=_bump)
                data = None
                for part in (resp.candidates[0].content.parts if resp.candidates else []):
                    if part.inline_data and part.inline_data.data:
                        data = part.inline_data.data
                        break
                if data is None:
                    reason = resp.candidates[0].finish_reason if resp.candidates else resp.prompt_feedback
                    raise RuntimeError(f"no image returned ({reason})")
                _fill_usage(rec, resp.usage_metadata)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(data)
            rec.images, rec.bytes_out = 1, len(data)
            rec.extra["path"] = str(out_path)
        return {"model": mid, "latency_ms": rec.latency_ms, "usd": rec.usd, "bytes": rec.bytes_out, "path": str(out_path),
                "retries_429": rec.extra.get("retries_429", 0)}

    # ------------------------------------------------------------------ video
    def generate_video(self, role: str, prompt: str, out_path: Path, test: str, seconds: int = 4,
                       audio: bool = True, image: bytes | None = None, poll_s: float = 5.0,
                       timeout_s: float = 600) -> dict:
        if not settings().enable_live_video:
            raise PermissionError("ENABLE_LIVE_VIDEO_GEN is not true: Veo call refused")
        mid = self.model(role)
        self.ledger.guard(estimate_video(mid, seconds, audio), f"{test} via {mid}")
        with self.ledger.track(test, mid, "video") as rec:
            rec.extra["audio"] = audio
            kwargs = dict(model=mid, prompt=prompt, config=types.GenerateVideosConfig(
                aspect_ratio="9:16", duration_seconds=seconds, resolution="720p",
                generate_audio=audio, number_of_videos=1))
            if image:
                kwargs["image"] = types.Image(image_bytes=image, mime_type="image/png")
            t0 = time.perf_counter()
            op = with_backoff(lambda: self.media_client.models.generate_videos(**kwargs))
            while not op.done:
                if time.perf_counter() - t0 > timeout_s:
                    raise TimeoutError(f"Veo op still running after {timeout_s}s: {op.name}")
                time.sleep(poll_s)
                op = self.media_client.operations.get(op)
            if op.error:
                raise RuntimeError(f"Veo error: {op.error}")
            res = op.response or op.result
            if not res or not res.generated_videos:
                raise RuntimeError(f"Veo returned no video (filtered={getattr(res, 'rai_media_filtered_reasons', None)})")
            vid = res.generated_videos[0].video
            data = vid.video_bytes
            if not data and vid.uri:
                data = self.media_client.files.download(file=vid)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(data)
            rec.video_seconds, rec.bytes_out = seconds, len(data)
            rec.extra.update(path=str(out_path), image_conditioned=bool(image))
        return {"model": mid, "latency_ms": rec.latency_ms, "usd": round(rec.usd, 4), "bytes": rec.bytes_out,
                "seconds": seconds, "path": str(out_path), "image_conditioned": bool(image)}


def with_backoff(fn, tries: int = 4, base_s: float = 12.0, on_retry=None):
    """Retry 429 RESOURCE_EXHAUSTED (per-minute quota) with exponential backoff."""
    for i in range(tries):
        try:
            return fn()
        except Exception as e:
            if "429" not in str(e) or i == tries - 1:
                raise
            if on_retry:
                on_retry(i + 1)
            time.sleep(base_s * 2 ** i)


def _low_thinking(model_id: str):
    # Storyboards are formatting-heavy, not reasoning-heavy: keep thinking cheap where supported.
    if model_id.startswith("gemini-3"):
        return types.ThinkingConfig(thinking_level="low")
    return None


def _fill_usage(rec, usage) -> None:
    if not usage:
        return
    rec.input_tokens = usage.prompt_token_count or 0
    rec.output_tokens = usage.candidates_token_count or 0
    rec.thought_tokens = usage.thoughts_token_count or 0
