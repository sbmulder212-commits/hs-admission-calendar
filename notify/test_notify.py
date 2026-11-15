import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))

from notify import build_message, main, pick, split_message, today_kst  # noqa: E402

TODAY = date(2026, 12, 3)
URL = "https://a.b/c"


def ev(day, end=None, title="일정", verified=True, category="일반고"):
    event = {"id": f"{title}-{day}", "date": day, "title": title, "category": category, "verified": verified}
    if end:
        event["end"] = end
    return event


class PickTest(unittest.TestCase):
    def test_today_kst_crosses_date_line(self):
        now = datetime(2026, 12, 2, 15, 30, tzinfo=timezone.utc)
        self.assertEqual(today_kst(now), date(2026, 12, 3))

    def test_pick_single_day_today(self):
        today, soon = pick([ev("2026-12-03")], TODAY)
        self.assertEqual(len(today), 1)
        self.assertEqual(soon, [])

    def test_pick_mid_range_is_today(self):
        today, soon = pick([ev("2026-12-01", "2026-12-10")], date(2026, 12, 5))
        self.assertEqual(len(today), 1)
        self.assertEqual(soon, [])

    def test_pick_upcoming_boundary(self):
        today, soon = pick([ev("2026-12-10", title="in"), ev("2026-12-11", title="out")], TODAY)
        self.assertEqual(today, [])
        self.assertEqual([e["title"] for e in soon], ["in"])

    def test_pick_past_excluded(self):
        events = [ev("2026-11-20", "2026-12-02"), ev("2026-12-02")]
        self.assertEqual(pick(events, TODAY), ([], []))

    def test_pick_sorted_by_date(self):
        events = [ev("2026-12-08", title="b"), ev("2026-12-05", title="a")]
        _, soon = pick(events, TODAY)
        self.assertEqual([e["title"] for e in soon], ["a", "b"])


class BuildMessageTest(unittest.TestCase):
    def test_build_message_none_when_empty(self):
        self.assertIsNone(build_message([], TODAY, URL))
        self.assertIsNone(build_message([ev("2026-12-20")], TODAY, URL))

    def test_build_message_deadline_tags(self):
        text = build_message(
            [ev("2026-12-01", "2026-12-03", title="A"), ev("2026-12-01", "2026-12-04", title="B")], TODAY, URL
        )
        self.assertIn("오늘 마감", text)
        self.assertIn("마감 D-1", text)

    def test_build_message_unverified_mark(self):
        self.assertIn("미확인", build_message([ev("2026-12-03", verified=False)], TODAY, URL))
        self.assertNotIn("미확인", build_message([ev("2026-12-03")], TODAY, URL))

    def test_build_message_detail_link(self):
        text = build_message([ev("2026-12-08")], TODAY, "https://a.b/c/")
        self.assertIn("https://a.b/c/detail.html?date=2026-12-08", text)
        self.assertNotIn("c//detail", text)
        self.assertIn("D-5", text)

    def test_build_message_keeps_special_chars(self):
        title = "A<b>&*_[x]"
        self.assertIn(title, build_message([ev("2026-12-03", title=title)], TODAY, URL))


class SplitMessageTest(unittest.TestCase):
    def test_split_message_under_limit(self):
        self.assertEqual(split_message("짧은 글"), ["짧은 글"])

    def test_split_message_over_limit(self):
        text = "\n".join("가" * 50 for _ in range(200))
        parts = split_message(text)
        self.assertGreater(len(parts), 1)
        self.assertTrue(all(len(part) <= 4096 for part in parts))
        self.assertEqual("\n".join(parts), text)


class MainTest(unittest.TestCase):
    def run_main(self, argv):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "events.json"
            path.write_text(json.dumps([ev("2026-12-03")], ensure_ascii=False), encoding="utf-8")
            out, err = io.StringIO(), io.StringIO()
            with mock.patch.dict(os.environ, {}, clear=True):
                with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                    code = main(argv, events_path=path, today=TODAY)
            return code, out.getvalue(), err.getvalue()

    def test_main_dry_run_without_token(self):
        code, out, _ = self.run_main(["--dry-run"])
        self.assertEqual(code, 0)
        self.assertIn("일정", out)

    def test_main_missing_token_fails(self):
        code, _, err = self.run_main([])
        self.assertNotEqual(code, 0)
        self.assertIn("TELEGRAM_BOT_TOKEN", err)


if __name__ == "__main__":
    unittest.main()
