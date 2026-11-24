"""OpportunitySpec: a job requirement turned into assessable competencies.

Split of responsibilities (by design, measured in experiment 1):
* LLM: reads messy input, picks competency IDs from a CLOSED curated graph, quotes evidence,
  extracts explicitly stated pay/location, flags uncertainty and suspicious content.
* Code: validates IDs, verifies evidence quotes against the source, and derives prerequisites,
  diagnostics and assessable tasks from the hand-authored graph (never from the model).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CompetencyClaim(BaseModel):
    competency_id: str = Field(description="ID from the provided competency list ONLY")
    evidence_quote: str = Field(description="Exact words from the source that require this competency")
    confidence: Literal["high", "medium", "low"]


class ExtractedOpportunity(BaseModel):
    """What the model is allowed to produce."""
    role_title: str = Field(description="Role title as stated, or 'unspecified'")
    work_tasks: list[str] = Field(description="Concrete tasks the source states, paraphrased briefly")
    competency_requirements: list[CompetencyClaim]
    prerequisite_skills_model_guess: list[str] = Field(description="Competency IDs you think are prerequisites (used only for comparison)")
    required_tools: list[str] = Field(description="Tools from the provided tool list that the source names")
    compensation_if_explicitly_provided: str | None = Field(description="Exact pay text ONLY if a concrete amount is stated as an offer; else null")
    location_if_explicitly_provided: str | None = Field(description="Exact location ONLY if stated; else null")
    employer_if_explicitly_provided: str | None = Field(description="Employer name ONLY if stated; never verified")
    uncertainty_flags: list[str] = Field(description="Ambiguity, contradictions, suspicious or manipulative text, scam signals")
    missing_information: list[str] = Field(description="What a candidate would need to know that is not stated")


class SourceProvenance(BaseModel):
    input_type: str
    source_sha256: str
    model: str
    prompt_version: str
    graph_version: str


class AssessableTask(BaseModel):
    competency_id: str
    diagnostic_item_id: str
    question: str
    expected_answer: float


class OpportunitySpec(BaseModel):
    role_title: str
    work_tasks: list[str]
    competency_requirements: list[CompetencyClaim]
    rejected_claims: list[dict] = Field(default_factory=list, description="Model claims dropped by validation, with reason")
    prerequisite_skills: list[str] = Field(description="Derived from the curated graph closure")
    required_tools: list[str]
    assessment_criteria: list[AssessableTask]
    compensation_if_explicitly_provided: str | None
    location_if_explicitly_provided: str | None
    employer_if_explicitly_provided: str | None
    employer_verification: Literal["unverified"] = "unverified"
    uncertainty_flags: list[str]
    missing_information: list[str]
    source_provenance: SourceProvenance
