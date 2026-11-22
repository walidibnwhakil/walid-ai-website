"""Bounded one-file coding worker for owner-authorized GitHub Actions runs.

Changes are a *proposal* only. Never merges, deploys or executes AI-supplied shell.
The workflow runs tests without provider credentials and opens a DRAFT PR.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_EXTENSIONS = {".js", ".mjs", ".cjs", ".py", ".css", ".html"}
BLOCKED_PREFIXES = (
    ".github/", "admin/", "tests/", "scripts/", "islam/quran/",
    "node_modules/", "vendor/", ".git/",
)
BLOCKED_EXACT = {
    "admin-staff.html", "admin-ops.js", "admin-usage.js", "admin-shell.css",
    "backend-config.js", "walid-branding.css", "walid-legal.css",
    "index.html", "robots.txt", "CNAME", "ads.txt",
}
MODEL = os.getenv("WALID_STAFF_CODER_MODEL", "llama-3.3-70b-versatile")
API_URL = "https://api.groq.com/openai/v1/chat/completions"


def is_safe_path(path: str) -> bool:
    if not path or path.startswith("/") or "\\" in path or ".." in Path(path).parts:
        return False
    if any(path.startswith(prefix) for prefix in BLOCKED_PREFIXES) or path in BLOCKED_EXACT:
        return False
    if Path(path).suffix.lower() not in ALLOWED_EXTENSIONS:
        return False
    if re.search(r"(^|/)(?:secrets?|auth|credential|service.account|private.key)", path, re.I):
        return False
    return True


def candidates(instruction: str):
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode("utf-8").split("\x00")
    tokens = [token.lower() for token in re.findall(r"[\w-]{3,}", instruction.lower())
              if token.lower() not in {"please", "website", "walid", "site", "change", "update", "fix", "the", "and"}]
    matching = []
    for path in tracked:
        if not path or not is_safe_path(path):
            continue
        file = ROOT / path
        try:
            if file.stat().st_size > 12000:
                continue
        except OSError:
            continue
        name = path.lower()
        score = 0
        for token in tokens:
            if token in name:
                score += 3 if token in Path(name).stem else 1
        # Exact file paths in the owner's command are strong evidence.
        if path.lower() in instruction.lower():
            score += 25
        if score >= 3:
            matching.append((score, path))
    return [path for _, path in sorted(matching, key=lambda pair: (-pair[0], len(pair[1]), pair[1]))[:4]]


def propose(instruction, files):
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured in repository Actions secrets.")
    context = [{"path": path, "content": (ROOT / path).read_text(encoding="utf-8")}
               for path in files]
    system = (
        "You are Walid AI's scoped CSE coding assistant. The owner requested a precise fix. "
        "You may edit only one supplied file, using one or two exact string replacements. "
        "Never alter the brand, logo, site footer, five-robot office or admin dashboard. "
        "Never invent missing code, redesign, add links, change authentication, "
        "touch deployments, secrets or GitHub workflows. Do not produce commands. "
        "If evidence is insufficient, return {\"edits\":[],\"reason\":\"not enough context\"}. "
        "Otherwise return pure JSON {\"edits\":[{\"path\":\"...\",\"old\":\"...\",\"new\":\"...\"}],"
        "\"reason\":\"...\"}. The old string must appear exactly once in the supplied file."
    )
    payload = {
        "model": MODEL,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps({"instruction": instruction, "files": context}, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
        method="POST")
    try:
        with urllib.request.urlopen(request, timeout=80) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        # Deliberately do not print response bodies, keys or provider credentials.
        raise RuntimeError("Coding provider request failed (HTTP %s)." % error.code) from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError("Coding provider did not return a usable response.") from None
    try:
        value = data["choices"][0]["message"]["content"]
        result = json.loads(value)
        return result if isinstance(result, dict) else {}
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        raise RuntimeError("Coding provider response was not valid structured JSON.") from None


def apply_plan(plan, allowed):
    edits = plan.get("edits", [])
    if not isinstance(edits, list) or not 1 <= len(edits) <= 2:
        raise RuntimeError("No safe, specific edit was proposed. No PR will be created.")
    paths = {item.get("path") for item in edits if isinstance(item, dict)}
    if len(paths) != 1 or not paths.issubset(set(allowed)):
        raise RuntimeError("Model tried to edit an unreviewed file. Aborted.")
    path = next(iter(paths))
    if not is_safe_path(path):
        raise RuntimeError("Protected code cannot be changed by autonomous runner.")
    file = ROOT / path
    original = file.read_text(encoding="utf-8")
    updated = original
    for item in edits:
        before, after = item.get("old"), item.get("new")
        if not isinstance(before, str) or not isinstance(after, str):
            raise RuntimeError("Invalid replacement type.")
        if not before.strip() or len(before) > 7000 or len(after) > 9000:
            raise RuntimeError("Proposed edit is empty or too large.")
        if updated.count(before) != 1:
            raise RuntimeError("Proposed edit does not uniquely match current main. No changes written.")
        updated = updated.replace(before, after, 1)
    if updated == original:
        raise RuntimeError("Model proposed no actual change.")
    if abs(len(updated) - len(original)) > 3000:
        raise RuntimeError("Proposed change exceeds the small-fix safety limit.")
    file.write_text(updated, encoding="utf-8")
    print("CSE proposed change in", path, "(draft PR, never merged).")


def main():
    instruction = os.environ.get("WALID_STAFF_CODER_INSTRUCTION", "").strip()
    if not 12 <= len(instruction) <= 1500:
        raise RuntimeError("Owner coding task must contain 12-1500 characters.")
    files = candidates(instruction)
    if not files:
        raise RuntimeError("Unable to ground the request in small safe repository files. No code guessed.")
    plan = propose(instruction, files)
    apply_plan(plan, files)


if __name__ == "__main__":
    main()
