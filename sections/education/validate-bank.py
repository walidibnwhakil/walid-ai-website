#!/usr/bin/env python3
"""Audit the Education MCQ bank and report gaps against the release contract.

Accepts the current inline DB in index.html or a JSON file containing either
an array of questions or {"questions": [...]}.
The release gate intentionally fails while content is incomplete or unreviewed.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_INPUT = ROOT / "index.html"
EXPECTED = {grade: (50 if grade <= 8 else 100) * 60 for grade in range(6, 13)}
SET_SIZE = {grade: 50 if grade <= 8 else 100 for grade in range(6, 13)}


def load_questions(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".html":
        match = re.search(r"const\s+DB\s*=\s*(\{.*?\})\s*;\s*const\s+grade", raw, re.S)
        if not match:
            raise ValueError("Could not find the Education DB object in index.html")
        data = json.loads(match.group(1))
    else:
        data = json.loads(raw)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    raise ValueError("Input must be a question array or an object with a questions array")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = re.sub(r"[\W_]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def template_key(text: str) -> str:
    """Collapse digits and Latin variables to flag repeated question templates."""
    key = normalize(text)
    key = re.sub(r"\d+", "#", key)
    key = re.sub(r"\b[a-z]\b", "v", key)
    return key


def issues_for(q: dict) -> list[str]:
    errors = []
    if not isinstance(q, dict):
        return ["question row is not an object"]
    if not isinstance(q.get("grade"), int) or q["grade"] not in EXPECTED:
        errors.append("grade must be an integer from 6 through 12")
    for key in ("id", "subject", "chapter", "q", "why", "source", "review_status"):
        if not isinstance(q.get(key), str) or not q[key].strip():
            errors.append(f"missing {key}")
    if not isinstance(q.get("set"), int) or not 1 <= q["set"] <= 60:
        errors.append("set must be an integer from 1 through 60")
    options = q.get("options")
    if not isinstance(options, list) or len(options) != 4 or any(not isinstance(x, str) or not x.strip() for x in options):
        errors.append("must have four non-empty string options")
    elif len({normalize(x) for x in options}) != 4:
        errors.append("answer options are not distinct")
    answer = q.get("answer")
    if not isinstance(answer, int) or isinstance(answer, bool) or not isinstance(options, list) or not 0 <= answer < len(options):
        errors.append("answer must be one valid zero-based option index")
    if not isinstance(q.get("why"), str) or not re.search(r"[\u0980-\u09ff]", q["why"]):
        errors.append("explanation needs Bengali text")
    if q.get("review_status") != "approved":
        errors.append("question is not approved for publication")
    if not isinstance(q.get("source"), str) or not q["source"].startswith("https://"):
        errors.append("source must be a verifiable HTTPS URL")
    return errors


def audit(questions: list[dict]) -> tuple[list[str], dict]:
    problems: list[str] = []
    grade_counts = Counter()
    set_counts = Counter()
    exact = {}
    templates = defaultdict(list)
    ids = set()

    for index, q in enumerate(questions, 1):
        for issue in issues_for(q):
            problems.append(f"row {index}: {issue}")
        if not isinstance(q, dict):
            continue
        grade = q.get("grade")
        if isinstance(grade, int) and grade in EXPECTED:
            grade_counts[grade] += 1
            set_no = q.get("set")
            if isinstance(set_no, int):
                set_counts[(grade, set_no)] += 1
        qid = q.get("id")
        if isinstance(qid, str) and qid in ids:
            problems.append(f"row {index}: duplicate id {qid}")
        elif isinstance(qid, str):
            ids.add(qid)
        stem = q.get("q")
        if isinstance(stem, str) and stem.strip():
            canon = normalize(stem)
            if canon in exact:
                problems.append(f"row {index}: exact duplicate of row {exact[canon]} ({grade}/{q.get('subject')})")
            else:
                exact[canon] = index
            templates[(grade, q.get("subject"), template_key(stem))].append((index, stem))

    for grade, required in EXPECTED.items():
        actual = grade_counts[grade]
        if actual != required:
            problems.append(f"grade {grade}: expected {required} MCQs, found {actual}")
        target = SET_SIZE[grade]
        for set_no in range(1, 61):
            actual_set = set_counts[(grade, set_no)]
            if actual_set != target:
                problems.append(f"grade {grade}, set {set_no}: expected {target} MCQs, found {actual_set}")

    # Same subject, same normalized sentence shape with only numbers/variables
    # changed is a near-duplicate warning. It is deliberately a release error.
    for (grade, subject, _), rows in templates.items():
        if len(rows) > 1:
            problems.append(
                f"near-duplicate template: grade {grade}, {subject}, rows "
                + ", ".join(str(row[0]) for row in rows[:12])
                + (f" (+{len(rows)-12} more)" if len(rows) > 12 else "")
            )
    stats = {
        "total": len(questions),
        "by_grade": {str(g): grade_counts[g] for g in range(6, 13)},
        "sets_with_target_count": sum(
            1 for g in range(6, 13) for s in range(1, 61) if set_counts[(g, s)] == SET_SIZE[g]
        ),
        "sets_expected": 420,
        "approved": sum(1 for q in questions if isinstance(q, dict) and q.get("review_status") == "approved"),
        "errors": len(problems),
    }
    return problems, stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--limit", type=int, default=80, help="maximum detailed errors to print")
    args = parser.parse_args()
    try:
        questions = load_questions(args.input)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    problems, stats = audit(questions)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    for problem in problems[:args.limit]:
        print(f"FAIL: {problem}")
    if len(problems) > args.limit:
        print(f"... {len(problems) - args.limit} additional findings omitted")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
