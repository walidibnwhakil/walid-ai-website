"""Scheduler entry point for safe staff checks.

Run this file from a free cron/Task Scheduler job. It performs only the bounded HTTP and
security-header checks and records deduplicated attention results in the configured audit store.
"""
import json

from walid_staff import scheduled_checks


if __name__ == "__main__":
    print(json.dumps(scheduled_checks(), ensure_ascii=False))
