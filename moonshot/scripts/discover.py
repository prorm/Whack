"""Read-only publisher and service metadata. Writes no prior reports and prints no credentials."""
import json
import os
from pathlib import Path
from time import perf_counter

from google.auth import default
from google.auth.transport.requests import AuthorizedSession

from core.settings import settings


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "reports/moonshot"
services = ("aiplatform.googleapis.com", "speech.googleapis.com", "texttospeech.googleapis.com", "translate.googleapis.com")


def metadata(session, url, params=None):
    started = perf_counter()
    try:
        response = session.get(url, params=params, timeout=(6, 12))
        data = response.json()
        return response.status_code, round((perf_counter() - started) * 1000), data
    except (ValueError, OSError) as error:
        return 0, round((perf_counter() - started) * 1000), {"error": {"status": type(error).__name__}}


def main():
    config = settings()
    credentials, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    session = AuthorizedSession(credentials, max_refresh_attempts=1)
    discovery = {"verified": "2026-11-24", "publisher_lists": {}, "registered_custom": {}, "services": {}, "models": []}
    for publisher in ("google", "anthropic", "mistralai", "meta", "deepseek", "qwen"):
        token = None
        names = []
        for _ in range(3):
            params = {"pageSize": 100, "listAllVersions": "true"}
            if token:
                params["pageToken"] = token
            status, elapsed, data = metadata(session, f"https://aiplatform.googleapis.com/v1beta1/publishers/{publisher}/models", params)
            names.extend(entry.get("name") for entry in data.get("publisherModels", []) if entry.get("name"))
            token = data.get("nextPageToken")
            if not token:
                break
        discovery["publisher_lists"][publisher] = {"status": status, "latency_ms_last_page": elapsed, "names": names, "truncated": bool(token)}
    region = config.media_location
    host = f"https://{region}-aiplatform.googleapis.com"
    code, elapsed, data = metadata(session, f"{host}/v1/projects/{config.project}/locations/{region}/models", {"pageSize": 100})
    discovery["registered_custom"] = {"region": region, "status": code, "count_returned": len(data.get("models", [])), "truncated": bool(data.get("nextPageToken")), "latency_ms": elapsed}
    for api in services:
        url = f"https://serviceusage.googleapis.com/v1/projects/{config.project}/services/{api}"
        code, elapsed, data = metadata(session, url)
        discovery["services"][api] = {"status": code, "state": data.get("state"), "latency_ms": elapsed}
    quota_url = f"https://serviceusage.googleapis.com/v1beta1/projects/{config.project}/services/aiplatform.googleapis.com/consumerQuotaMetrics"
    code, elapsed, data = metadata(session, quota_url, {"pageSize": 100})
    discovery["quota"] = {
        "status": code, "latency_ms": elapsed, "truncated": bool(data.get("nextPageToken")),
        "matched_metrics": [item.get("metric") for item in data.get("metrics", []) if any(word in str(item.get("metric", "")).lower() for word in ("veo", "video", "imagen", "image"))],
    }
    for publisher, model, location in json.loads((ROOT / "moonshot/config/candidates.json").read_text()):
        base = "https://aiplatform.googleapis.com" if location == "global" else f"https://{location}-aiplatform.googleapis.com"
        route = f"/v1beta1/publishers/{publisher}/models/{model}"
        code, elapsed, data = metadata(session, base + route)
        discovery["models"].append({
            "publisher": publisher, "id": model, "probe_region": location, "status": code, "latency_ms": elapsed,
            "display": data.get("displayName"), "version": data.get("versionId"), "launch_stage": data.get("launchStage"),
            "error_type": data.get("error", {}).get("status"),
        })
        temp = OUT / ".discovery.tmp"
        temp.write_text(json.dumps(discovery, indent=2) + "\n", encoding="utf-8")
        os.replace(temp, OUT / "publisher_discovery.json")
    print("Publisher metadata saved:", len(discovery["models"]), "candidates; quota status", discovery["quota"]["status"])


if __name__ == "__main__":
    main()
