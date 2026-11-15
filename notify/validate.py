"""data/events.json 형식 검사. 실행: python notify/validate.py"""
import json
import sys
from datetime import date
from pathlib import Path

CATEGORIES = {"일반고", "자사고", "외고·국제고", "과학고·영재학교", "특성화고·마이스터고"}
REQUIRED = ("id", "date", "title", "category", "summary", "source", "verified")


def _is_date(value) -> bool:
    try:
        date.fromisoformat(value)
    except (TypeError, ValueError):
        return False
    return len(value) == 10


def _is_https(value) -> bool:
    return isinstance(value, str) and value.startswith("https://")


def validate_events(events: list) -> list[str]:
    errors = []
    seen = set()
    for index, event in enumerate(events):
        label = event.get("id", f"#{index}") if isinstance(event, dict) else f"#{index}"

        def err(message):
            errors.append(f"{label}: {message}")

        if not isinstance(event, dict):
            err("객체가 아님")
            continue
        missing = [key for key in REQUIRED if key not in event]
        if missing:
            err(f"필수 항목 없음: {', '.join(missing)}")
            continue
        if event["id"] in seen:
            err("id 중복")
        seen.add(event["id"])
        end = event.get("end")
        if not _is_date(event["date"]):
            err(f"date 형식 오류: {event['date']}")
        elif end is not None:
            if not _is_date(end):
                err(f"end 형식 오류: {end}")
            elif end < event["date"]:
                err("end가 date보다 앞섬")
        if event["category"] not in CATEGORIES:
            err(f"알 수 없는 category: {event['category']}")
        if not isinstance(event["verified"], bool):
            err("verified는 true/false여야 함")
        source = event["source"]
        if not isinstance(source, dict) or not source.get("name") or not _is_https(source.get("url")):
            err("source는 name과 https:// url이 필요함")
        for school in event.get("schools", []):
            if not isinstance(school, dict) or not school.get("name") or not _is_https(school.get("url")):
                err(f"schools 항목은 name과 https:// url이 필요함: {school}")
        for key in ("requirements", "cautions"):
            if not all(isinstance(item, str) for item in event.get(key, [])):
                err(f"{key}는 문자열 목록이어야 함")
    return errors


if __name__ == "__main__":
    path = Path(__file__).parent.parent / "data" / "events.json"
    problems = validate_events(json.loads(path.read_text(encoding="utf-8")))
    for problem in problems:
        print(problem)
    print(f"오류 {len(problems)}건")
    sys.exit(1 if problems else 0)
