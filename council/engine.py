"""Simple 3-seat council engine (proposer, critic, judge)."""

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class CouncilResult:
    proposer: str
    critic: str
    judge: str
    approved: bool


def proposer(case_facts: Dict[str, str]) -> str:
    return (
        "Draft complaint support: use provided incident facts, include requested damages, "
        "and keep venue caption fixed to Oakland Circuit Court."
    )


def critic(case_facts: Dict[str, str]) -> str:
    notes: List[str] = []
    if not case_facts.get("incident_date"):
        notes.append("Incident date is missing.")
    if float(case_facts.get("damages_claimed", 0) or 0) <= 0:
        notes.append("Damages value is not set.")
    if not notes:
        notes.append("No blocking issues found.")
    return " ".join(notes)


def judge(proposer_text: str, critic_text: str) -> str:
    if "missing" in critic_text.lower() or "not set" in critic_text.lower():
        return "Conditional approval: gather missing facts before finalizing output."
    return "Approved for draft generation with user confirmation."


def deliberate(case_facts: Dict[str, str], user_approved: bool) -> CouncilResult:
    p = proposer(case_facts)
    c = critic(case_facts)
    j = judge(p, c)
    return CouncilResult(proposer=p, critic=c, judge=j, approved=bool(user_approved))
