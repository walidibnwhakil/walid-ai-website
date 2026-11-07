"""Reliability checks for the free-tier chat path. No real API keys are used."""

import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from walid_providers import (  # noqa: E402
    append_citations,
    collect_web_sources,
    configured_provider_names,
    is_billing_block,
    trim_history,
)


class MockHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        self.server.bodies.append(body)
        if self.server.failures > 0:
            self.server.failures -= 1
            payload = json.dumps({"error": {"message": "rate limit"}}).encode()
            self.send_response(429)
        else:
            payload = json.dumps({
                "choices": [{"message": {"content": self.server.answer}}]
            }).encode()
            self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        return


def start_mock(answer, failures=0):
    server = ThreadingHTTPServer(("127.0.0.1", 0), MockHandler)
    server.answer = answer
    server.failures = failures
    server.bodies = []
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def post_json(url, payload, timeout=30):
    data = json.dumps(payload).encode()
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.headers.get("Content-Type", ""), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", ""), error.read()


def read_answer(status, content_type, body):
    text = body.decode()
    if "ndjson" in content_type:
        answer = []
        meta = {}
        for line in text.splitlines():
            if not line.strip():
                continue
            event = json.loads(line)
            if event.get("event") == "delta":
                answer.append(event.get("text") or "")
            elif event.get("event") == "done":
                meta = event
        return status, "".join(answer), meta
    parsed = json.loads(text)
    return status, parsed.get("answer") or parsed.get("error") or "", parsed


def wait_for(url, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return json.loads(response.read().decode())
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("server did not start")


def test_units():
    history = [{"role": "user", "text": "x" * 1000}] * 20
    trimmed = trim_history(history)
    assert len(trimmed) <= 8
    assert sum(len(item["text"]) for item in trimmed) <= 4000
    assert is_billing_block(402, {}) is True
    assert is_billing_block(429, {"error": {"message": "You exceeded your current quota"}}) is False
    os.environ["MISTRAL_API_KEY"] = "must-not-be-used"
    os.environ.pop("GEMINI_API_KEY", None)
    os.environ["WALID_PROVIDER_ORDER"] = "mistral,gemini,own"
    os.environ["WALID_OWN_MODEL_URL"] = "http://127.0.0.1/v1"
    names = configured_provider_names()
    assert names == ["own"], names
    assert "mistral" not in names
    cited = append_citations("The sky is blue.", [{"title": "Wiki", "url": "https://example.com/sky", "snippet": ""}])
    assert "https://example.com/sky" in cited
    os.environ["WALID_SEARCH"] = "0"
    assert collect_web_sources("latest news in Dhaka") == []
    print("unit checks passed")


def test_server():
    groq = start_mock("unused", failures=100)
    own = start_mock("Blue is a primary color.")
    data_dir = os.path.join("/tmp", "walid-chat-test-" + str(os.getpid()))
    os.makedirs(data_dir, exist_ok=True)
    port = str(18080 + (os.getpid() % 1000))
    env = os.environ.copy()
    for name in list(env):
        if name.startswith(("GEMINI", "GROQ", "OPENROUTER", "CLOUDFLARE", "HF_", "HUGGING", "BRAVE", "SEARX", "WALID_OWN", "WALID_PROVIDER")):
            env.pop(name, None)
    env.update({
        "PORT": port,
        "HOST": "127.0.0.1",
        "WALID_DATA_DIR": data_dir,
        "GROQ_API_KEY": "test-groq-key",
        "GROQ_API_BASE": f"http://127.0.0.1:{groq.server_address[1]}/v1",
        "GROQ_MODELS": "openai/gpt-oss-20b",
        "WALID_OWN_MODEL_URL": f"http://127.0.0.1:{own.server_address[1]}/v1",
        "WALID_OWN_MODEL_NAME": "walid-test",
        "WALID_PROVIDER_ORDER": "groq,own",
        "WALID_PROVIDER_DEADLINE": "12",
        "WALID_SEARCH": "0",
    })
    process = subprocess.Popen(
        [sys.executable, os.path.join(ROOT, "app.py")],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        health = wait_for(base + "/health")
        assert health["providers"] == ["groq", "own"], health
        status, answer, meta = read_answer(*post_json(base + "/api/chat", {
            "question": "hello",
            "guest_id": "tester",
            "language": "en",
        }))
        assert status == 200, (status, answer)
        assert "Walid AI" in answer
        assert own.bodies == [] and groq.bodies == []

        status, answer, meta = read_answer(*post_json(base + "/api/chat", {
            "question": "Name one primary color.",
            "guest_id": "tester",
            "language": "en",
            "request_id": "same-request",
            "history": [{"role": "user", "text": "My favorite number is 42."}],
        }))
        assert status == 200, (status, answer, meta)
        assert "Blue is a primary color." in answer
        assert meta.get("provider") == "own"
        assert len(own.bodies) == 1
        assert b"42" in own.bodies[0]
        assert len(groq.bodies) >= 1

        calls_before = len(own.bodies)
        status, answer, meta = read_answer(*post_json(base + "/api/chat", {
            "question": "Name one primary color.",
            "guest_id": "tester",
            "language": "en",
            "request_id": "same-request",
        }))
        assert status == 200 and "Blue" in answer
        assert len(own.bodies) == calls_before

        groq_only = os.environ  # silence linters about unused socket
        del groq_only
        own.shutdown()
        status, message, meta = read_answer(*post_json(base + "/api/chat", {
            "question": "Name one secondary color.",
            "guest_id": "tester-2",
            "language": "en",
            "request_id": "will-fail",
        }))
        assert status == 503, (status, message)
        assert message
        assert "error" not in (meta.get("event") or "")
        print("server checks passed", {"groq_calls": len(groq.bodies), "own_calls": len(own.bodies)})
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        groq.shutdown()
        own.shutdown()
        if process.stdout:
            leftover = process.stdout.read()
            if leftover:
                print(leftover[-2000:])


if __name__ == "__main__":
    test_units()
    test_server()
    print("all chat reliability checks passed")
