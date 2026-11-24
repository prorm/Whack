"""Join official routing notes with read-only API evidence and measured operations."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "reports/moonshot"
DOC = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models"
PRICE = "https://cloud.google.com/model-garden/pricing"
discovery = json.loads((OUT / "publisher_discovery.json").read_text(encoding="utf8"))
experiment = [json.loads(line) for line in (OUT / "EXPERIMENT_RESULTS.jsonl").read_text(encoding="utf8").splitlines()]
rates = json.loads((ROOT / "moonshot/config/budget.json").read_text(encoding="utf8"))["routing"]
known = {
    "gemini-3.8-flash": ("strong reasoning, document, image, audio and video understanding","generateContent; LOW/MEDIUM/HIGH","1,048,576 input; 65,536 output","Global, supported multi-region and regional endpoints",DOC+"/gemini/3-8-flash"),
    "gemini-3.5-flash-lite": ("economical text, documents and multimodal understanding","generateContent; structured output","See model-specific limits and video rules","Global; regional locations vary",DOC+"/google-models"),
    "gemini-3.1-flash-lite": ("economical text and multimodal analysis","generateContent","Audio input rate differs from text","Global; regional locations vary",DOC+"/google-models"),
    "gemini-3.1-pro-preview": ("long-context reasoning, documents and multimodal understanding","generateContent; preview","1,048,576 input; 65,536 output; tiers above 200k","Global",DOC+"/guides/gemini-3-8-flash"),
    "gemini-3.1-flash-lite-image": ("image generation and image-conditioned editing","generateContent IMAGE","1K image output for tested request; input price per token","Global",DOC+"/google-models"),
    "gemini-3.1-flash-image": ("image generation and image-conditioned editing","generateContent IMAGE","512–4K output tiers","Global and selected regions",DOC+"/google-models"),
    "gemini-omni-1.2-flash": ("video/image input, video generation/editing","Interactions API","Up to 15 s video per documentation","Check service-specific region",DOC+"/google-models"),
    "gemini-3.8-live": ("bidirectional realtime multimodal","Live API","Streaming session limits and pricing differ","Check Live regional locations",DOC+"/google-models"),
    "gemini-3.8-flash-tts": ("text to speech","generateContent AUDIO","Voice/language lists and text window depend on model","Check TTS locations",DOC+"/google-models"),
    "gemini-embedding-2": ("text and multimodal embeddings","embedContent","Request limits differ by modality","Check model's global and regional availability",DOC+"/model-versions"),
    "veo-3.1-lite-generate-001": ("video creation from text/image","predictLongRunning","4, 6 or 8 seconds; fixed quota; 720p options","us-central1 probe",DOC+"/veo/3-1-generate"),
    "veo-3.1-fast-generate-001": ("video creation from text/image","predictLongRunning","Check resolution, duration and audio limits","us-central1 probe",DOC+"/veo/3-1-generate"),
    "veo-3.1-generate-001": ("video creation from text/image","predictLongRunning","Check resolution, duration and audio limits","us-central1 probe",DOC+"/veo/3-1-generate"),
    "gemma-3-1b-it": ("small open text model for edge","local runtime / optional deployment","Memory and redistribution terms depend on build","Local edge or project deployment","https://ai.google.dev/gemma/docs"),
}
catalog = {}
for publisher, inventory in discovery["publisher_lists"].items():
    for name in inventory["names"]:
        model = name.split("/")[-1]
        catalog[(publisher, model)] = {"publisher":publisher,"id":model,"catalog_listed":True}
for probe in discovery["models"]:
    key = probe["publisher"], probe["id"]
    catalog[key] = {**catalog.get(key, {"catalog_listed":False}), **probe}

for (publisher, model), item in catalog.items():
    category, operation, limit, region, source = known.get(model, ("Consult publisher model card",None,None,None,DOC+"/model-versions" if publisher=="google" else DOC))
    item.update({"display_name":item.get("display") or model,"version":item.get("version") or model,
        "modality":category,"supported_operations":operation,"limits":limit,"documented_regions":region,
        "project_status": "operation-tested" if any(run.get("model")==model and run.get("success") for run in experiment)
        else "metadata-visible" if item.get("status")==200 else "metadata-request-failed" if "status" in item else "catalog-only",
        "authentication":"project ADC + operation IAM and entitlement","rate_source":PRICE,
        "global_standard_usd_per_million":rates.get(model),"deployment":"no managed endpoint for documented publisher serverless route" if model in known and not model.startswith("gemma") else "verify deployment and provider activation per operation",
        "minimum_billable_resources": "request usage on verified serverless route" if any(run.get("model")==model and run.get("success") for run in experiment) else None,
        "safety":"Provider policies and operation filters apply. This run sends synthetic fixtures only.",
        "provider_latency_sla":None,"documentation":source,"measured_experiments":[run["id"] for run in experiment if run.get("model")==model and run.get("success")],
        "verified":"2026-11-24"})

adjacent = [
    {"id":"chirp_3","publisher":"Google Cloud Speech-to-Text","modality":"transcription, language support and diarization vary","deployment":"managed API","project_status":discovery["services"]["speech.googleapis.com"]["state"],"documentation":"https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3"},
    {"id":"kn-IN-Chirp3-HD-Aoede","publisher":"Google Cloud Text-to-Speech","modality":"Kannada synthesis","deployment":"managed API","project_status":discovery["services"]["texttospeech.googleapis.com"]["state"],"documentation":"https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types"},
    {"id":"translation-llm","publisher":"Google Cloud Translation","modality":"translation","deployment":"managed API","project_status":discovery["services"]["translate.googleapis.com"]["state"],"documentation":"https://docs.cloud.google.com/translate/docs/advanced/translation-llm"},
    {"id":"semantic-ranker-512@latest","publisher":"Google Cloud Discovery Engine","modality":"reranking","deployment":"managed API","project_status":"not probed","documentation":"https://docs.cloud.google.com/generative-ai-app-builder/docs/ranking"},
]
document = {"verified":"2026-11-24","registered_custom":discovery["registered_custom"],"publisher_lists":{k:{**v,"count":len(v["names"])} for k,v in discovery["publisher_lists"].items()},
            "quota":discovery["quota"],"apis":discovery["services"],"models":list(catalog.values()),"adjacent_services":adjacent}
(OUT / "model_atlas.json").write_text(json.dumps(document,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(f"{len(catalog)} unique publisher IDs plus {len(adjacent)} adjacent service entries")
