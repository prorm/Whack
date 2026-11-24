"""Per-learner taste + memory graph.

* Format affinity: epsilon-greedy bandit over trend genomes
  (reward = blend of watch ratio, replay and lock accuracy).
* Concept memory: SM-2 scheduler. Each review is scheduled into a DIFFERENT trend
  than the last exposure ("cross-meme spaced repetition").
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field


class BanditArm(BaseModel):
    trend_id: str
    pulls: int = 0
    reward_sum: float = 0.0

    @property
    def value(self) -> float:
        return self.reward_sum / self.pulls if self.pulls else 0.5  # optimistic prior


class ConceptCard(BaseModel):
    concept_id: str
    ease: float = 2.5
    interval_days: float = 0.0
    reps: int = 0
    lapses: int = 0
    due_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trend_history: list[str] = Field(default_factory=list)


class UserTasteAndMemoryProfile(BaseModel):
    learner_id: str
    language_mode: str = "kanglish"
    epsilon: float = 0.15
    arms: dict[str, BanditArm] = Field(default_factory=dict)
    concepts: dict[str, ConceptCard] = Field(default_factory=dict)

    # ---- format affinity ------------------------------------------------
    def ensure_arms(self, trend_ids: list[str]) -> None:
        for t in trend_ids:
            self.arms.setdefault(t, BanditArm(trend_id=t))

    def pick_trend(self, rng: random.Random, exclude: str | None = None) -> str:
        pool = [a for a in self.arms.values() if a.trend_id != exclude] or list(self.arms.values())
        if rng.random() < self.epsilon:
            return rng.choice(pool).trend_id
        return max(pool, key=lambda a: a.value).trend_id

    def record_engagement(self, trend_id: str, watch_ratio: float, replayed: bool, lock_correct: bool) -> float:
        reward = 0.5 * min(watch_ratio, 1.0) + 0.2 * replayed + 0.3 * lock_correct
        arm = self.arms[trend_id]
        arm.pulls += 1
        arm.reward_sum += reward
        return reward

    def affinity_vector(self) -> dict[str, float]:
        return {k: round(v.value, 3) for k, v in self.arms.items()}

    # ---- SM-2 -----------------------------------------------------------
    def review(self, concept_id: str, quality: int, trend_id: str, now: datetime) -> ConceptCard:
        """quality: 0-5 (SM-2). Below 3 is a lapse."""
        c = self.concepts.setdefault(concept_id, ConceptCard(concept_id=concept_id, due_at=now))
        c.trend_history.append(trend_id)
        if quality < 3:
            c.reps, c.lapses, c.interval_days = 0, c.lapses + 1, 0.25  # retry in ~6 h
        else:
            c.reps += 1
            c.interval_days = 1 if c.reps == 1 else 2 if c.reps == 2 else round(c.interval_days * c.ease, 2)
        c.ease = max(1.3, c.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        c.due_at = now + timedelta(days=c.interval_days)
        return c

    def next_callback(self, now: datetime, rng: random.Random) -> tuple[str, str] | None:
        """Most overdue concept + a trend that differs from its last exposure."""
        due = [c for c in self.concepts.values() if c.due_at <= now]
        if not due:
            return None
        c = min(due, key=lambda c: c.due_at)
        last = c.trend_history[-1] if c.trend_history else None
        return c.concept_id, self.pick_trend(rng, exclude=last)
