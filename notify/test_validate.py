import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from validate import validate_events  # noqa: E402


def ok(**over):
    event = {
        "id": "sample-event",
        "date": "2026-12-02",
        "end": "2026-12-04",
        "title": "원서 접수",
        "category": "일반고",
        "summary": "요약",
        "requirements": ["자격"],
        "cautions": ["주의"],
        "schools": [{"name": "학교", "url": "https://example.com/a"}],
        "source": {"name": "교육청", "url": "https://example.com/s"},
        "verified": True,
    }
    event.update(over)
    return event


class ValidateEventsTest(unittest.TestCase):
    def test_valid_event_has_no_errors(self):
        self.assertEqual(validate_events([ok()]), [])

    def test_missing_required_field(self):
        event = ok()
        del event["title"]
        errors = validate_events([event])
        self.assertEqual(len(errors), 1)
        self.assertIn("sample-event", errors[0])
        self.assertIn("title", errors[0])

    def test_bad_date_format(self):
        self.assertEqual(len(validate_events([ok(date="2026-13-40", end=None)])), 1)

    def test_end_before_date(self):
        self.assertEqual(len(validate_events([ok(date="2026-12-05", end="2026-12-04")])), 1)

    def test_unknown_category(self):
        self.assertEqual(len(validate_events([ok(category="일반 고")])), 1)

    def test_non_https_url(self):
        self.assertEqual(len(validate_events([ok(source={"name": "x", "url": "http://x"})])), 1)
        bad_school = ok(schools=[{"name": "x", "url": "javascript:alert(1)"}])
        self.assertEqual(len(validate_events([bad_school])), 1)

    def test_duplicate_id(self):
        self.assertEqual(len(validate_events([ok(), ok()])), 1)

    def test_verified_must_be_bool(self):
        self.assertEqual(len(validate_events([ok(verified="true")])), 1)

    def test_data_file_is_valid(self):
        path = Path(__file__).parent.parent / "data" / "events.json"
        events = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(validate_events(events), [])


if __name__ == "__main__":
    unittest.main()
