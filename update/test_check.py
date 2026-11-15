import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check import find_private, outside_allowed  # noqa: E402


class FindPrivateTest(unittest.TestCase):
    def test_clean_schedule_text_passes(self):
        text = (
            '"date": "2026-12-03", "end": "2026-12-07", '
            '"url": "https://www.veritas-a.com/news/articleView.html?idxno=634499", '
            '"summary": "원서 접수 12/3(목)~7(월), 발표 17:00, 67교, 14개교"'
        )
        self.assertEqual(find_private(text), [])

    def test_email(self):
        self.assertEqual(find_private("문의: someone@example.com"), ["이메일"])

    def test_phone(self):
        self.assertEqual(find_private("연락처 010-1234-5678"), ["전화번호"])
        self.assertEqual(find_private("교무실 02-123-4567"), ["전화번호"])

    def test_resident_number_shape(self):
        self.assertEqual(find_private("110101-3123456"), ["주민등록번호 형태"])

    def test_bot_token_shape(self):
        self.assertEqual(find_private("123456789:" + "A" * 35), ["봇 토큰 형태"])

    def test_local_path(self):
        self.assertEqual(find_private(r"C:\Users\someone\file.txt"), ["로컬 경로"])
        self.assertEqual(find_private("/c/Users/someone/file"), ["로컬 경로"])
        self.assertEqual(find_private("/home/someone/file"), ["로컬 경로"])

    def test_extra_words_such_as_pc_user_name(self):
        self.assertEqual(find_private("작성: HongGilDong", extra=["honggildong"]), ["PC 사용자 이름"])
        self.assertEqual(find_private("내용", extra=["", "ab"]), [])  # 너무 짧은 단어는 무시

    def test_reports_each_kind_once(self):
        self.assertEqual(find_private("a@b.co c@d.co"), ["이메일"])


class OutsideAllowedTest(unittest.TestCase):
    def test_data_files_are_allowed(self):
        self.assertEqual(outside_allowed(["data/events.json", "data/SOURCES.md"]), [])

    def test_anything_else_is_reported(self):
        paths = ["data/events.json", "notify/notify.py", ".github/workflows/notify.yml", "data/extra.json"]
        self.assertEqual(outside_allowed(paths), paths[1:])

    def test_windows_separators(self):
        self.assertEqual(outside_allowed(["data\\events.json"]), [])


if __name__ == "__main__":
    unittest.main()
