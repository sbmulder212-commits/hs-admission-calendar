"""자동 업데이트를 GitHub에 올리기 전 검사. 실행: python update/check.py

실패(종료 코드 1) 조건:
- data/events.json, data/SOURCES.md 밖의 파일이 바뀜
- 두 파일에 개인 정보 형태의 문자열이 있음
- git 작성자 이메일이 GitHub noreply 주소가 아님
"""
import getpass
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ALLOWED = ("data/events.json", "data/SOURCES.md")

PATTERNS = (
    ("이메일", re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")),
    ("전화번호", re.compile(r"(?<!\d)0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}(?!\d)")),
    ("주민등록번호 형태", re.compile(r"(?<!\d)\d{6}-[1-4]\d{6}(?!\d)")),
    ("봇 토큰 형태", re.compile(r"\d{8,10}:[A-Za-z0-9_-]{30,}")),
    # URL 경로(…kr/home/…)는 앞 글자가 있으므로 걸리지 않는다.
    ("로컬 경로", re.compile(r"[A-Za-z]:\\|(?<![\w./])/(?:home|Users|[a-z]/Users)/")),
)


def find_private(text: str, extra=()) -> list[str]:
    """개인 정보로 보이는 문자열의 종류를 돌려준다. extra: PC 사용자 이름처럼 추가로 막을 단어."""
    found = [label for label, pattern in PATTERNS if pattern.search(text)]
    lowered = text.lower()
    if any(len(word) >= 3 and word.lower() in lowered for word in extra):
        found.append("PC 사용자 이름")
    return found


def outside_allowed(paths) -> list[str]:
    return [path for path in paths if path.replace("\\", "/") not in ALLOWED]


def _git(*args: str) -> str:
    result = subprocess.run(
        ["git", "-c", "core.quotepath=off", *args],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True,
    )
    return result.stdout


def main() -> int:
    problems = []
    changed = _git("diff", "--name-only", "HEAD").split("\n")
    changed += _git("ls-files", "--others", "--exclude-standard").split("\n")
    for path in outside_allowed([p for p in changed if p]):
        problems.append(f"허용되지 않은 파일이 바뀜: {path}")
    extra = [getpass.getuser(), Path.home().name]
    for name in ALLOWED:
        for label in find_private((ROOT / name).read_text(encoding="utf-8"), extra):
            problems.append(f"{name}: {label} 발견")
    if not _git("config", "user.email").strip().endswith("@users.noreply.github.com"):
        problems.append("git 작성자 이메일이 GitHub noreply 주소가 아님")
    for problem in problems:
        print(problem)
    print(f"올리기 전 검사: 문제 {len(problems)}건")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
