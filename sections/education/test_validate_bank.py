import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("validate-bank.py")
SPEC = importlib.util.spec_from_file_location("validate_bank", SCRIPT)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


def approved_question(**overrides):
    row = {
        "id": "g6-math-1-1",
        "grade": 6,
        "subject": "গণিত",
        "chapter": "ভগ্নাংশ",
        "set": 1,
        "q": "১/২ + ১/৪ কত?",
        "options": ["১/৪", "২/৪", "৩/৪", "১"],
        "answer": 2,
        "why": "সমহর করলে ২/৪ + ১/৪ = ৩/৪।",
        "source": "https://nctb.gov.bd/example",
        "review_status": "approved",
    }
    row.update(overrides)
    return row


class EducationBankValidationTests(unittest.TestCase):
    def test_approved_question_satisfies_schema(self):
        self.assertEqual(validator.issues_for(approved_question()), [])

    def test_rejects_duplicate_options_and_unreviewed_items(self):
        problems = validator.issues_for(approved_question(
            options=["এক", "এক", "দুই", "তিন"], review_status="draft"
        ))
        self.assertTrue(any("not distinct" in p for p in problems))
        self.assertTrue(any("not approved" in p for p in problems))

    def test_near_duplicate_key_collapses_numbers(self):
        self.assertEqual(
            validator.template_key("১২ + ৭ = কত?"),
            validator.template_key("৩৫ + ৯ = কত?"),
        )


if __name__ == "__main__":
    unittest.main()
