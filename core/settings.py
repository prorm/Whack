"""Single place that reads .env + config/models.json."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)  # process env wins over .env


def _bool(v: str | None, default: bool = False) -> bool:
    if v is None or v == "":
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    project: str | None
    text_location: str
    media_location: str
    use_vertex: bool
    api_key: str | None
    credentials_path: str | None
    max_budget_usd: float
    enable_live_video: bool
    reports_dir: Path
    outputs_dir: Path


@lru_cache
def settings() -> Settings:
    cred = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred and not Path(cred).is_absolute():
        cred = str((ROOT / cred).resolve())
    if cred and Path(cred).exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred
    s = Settings(
        project=os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT"),
        text_location=os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv("GCP_LOCATION") or "global",
        media_location=os.getenv("VERTEX_MEDIA_LOCATION", "us-central1"),
        use_vertex=_bool(os.getenv("GOOGLE_GENAI_USE_VERTEXAI"), default=True),
        api_key=os.getenv("GOOGLE_API_KEY") or None,
        credentials_path=cred,
        max_budget_usd=float(os.getenv("MAX_TEST_BUDGET_USD", "5.00")),
        enable_live_video=_bool(os.getenv("ENABLE_LIVE_VIDEO_GEN"), default=False),
        reports_dir=ROOT / "reports",
        outputs_dir=ROOT / "outputs",
    )
    s.reports_dir.mkdir(exist_ok=True)
    s.outputs_dir.mkdir(exist_ok=True)
    return s


@lru_cache
def model_registry() -> dict:
    return json.loads((ROOT / "config" / "models.json").read_text(encoding="utf-8"))
