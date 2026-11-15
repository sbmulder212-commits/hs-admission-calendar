"""매일 아침 텔레그램으로 고입 일정을 알린다.

실행: python notify/notify.py [--dry-run]
환경 변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SITE_URL
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

KST = timezone(timedelta(hours=9))
WEEKDAYS = "월화수목금토일"
EVENTS_PATH = Path(__file__).parent.parent / "data" / "events.json"


def today_kst(now_utc: datetime | None = None) -> date:
    return (now_utc or datetime.now(timezone.utc)).astimezone(KST).date()


def _start(event: dict) -> date:
    return date.fromisoformat(event["date"])


def _end(event: dict) -> date:
    return date.fromisoformat(event.get("end") or event["date"])


def pick(events: list[dict], today: date) -> tuple[list[dict], list[dict]]:
    """(오늘 걸친 일정, 7일 이내 시작하는 일정)을 날짜순으로 돌려준다."""
    ordered = sorted(events, key=_start)
    current = [e for e in ordered if _start(e) <= today <= _end(e)]
    soon = [e for e in ordered if today < _start(e) <= today + timedelta(days=7)]
    return current, soon


def _line(event: dict, prefix: str, suffix: str, link_day: date, site_url: str) -> str:
    mark = "" if event.get("verified") else " ⚠️미확인"
    head = f"• {prefix}{event['title']} ({event['category']}){suffix}{mark}"
    return f"{head}\n  {site_url}/detail.html?date={link_day.isoformat()}"


def build_message(events: list[dict], today: date, site_url: str) -> str | None:
    current, soon = pick(events, today)
    if not current and not soon:
        return None
    site_url = site_url.rstrip("/")
    lines = [f"📅 고입 일정 — {today.isoformat()} ({WEEKDAYS[today.weekday()]})"]
    if current:
        lines += ["", "[오늘]"]
        for event in current:
            suffix = ""
            if event.get("end"):
                left = (_end(event) - today).days
                suffix = " — 오늘 마감" if left == 0 else f" — 마감 D-{left}"
            lines.append(_line(event, "", suffix, today, site_url))
    if soon:
        lines += ["", "[7일 이내 시작]"]
        for event in soon:
            left = (_start(event) - today).days
            lines.append(_line(event, f"D-{left} ", "", _start(event), site_url))
    return "\n".join(lines)


def split_message(text: str, limit: int = 4096) -> list[str]:
    """텔레그램 글자 수 한도에 맞춰 줄 경계에서 나눈다."""
    parts, current = [], ""
    for line in text.split("\n"):
        candidate = line if not current else f"{current}\n{line}"
        if len(candidate) <= limit or not current:
            current = candidate
        else:
            parts.append(current)
            current = line
    parts.append(current)
    return parts


def send(token: str, chat_id: str, text: str) -> None:
    data = urllib.parse.urlencode(
        {"chat_id": chat_id, "text": text, "disable_web_page_preview": "true"}
    ).encode()
    request = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data)
    # 예외 메시지에 URL(토큰 포함)을 넣지 않는다.
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"텔레그램 전송 실패: HTTP {error.code} {detail}") from None
    except urllib.error.URLError as error:
        raise RuntimeError(f"텔레그램 연결 실패: {error.reason}") from None
    if not body.get("ok"):
        raise RuntimeError(f"텔레그램 전송 실패: {body.get('description')}")


def main(argv: list[str] | None = None, events_path: Path | None = None, today: date | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    events = json.loads((events_path or EVENTS_PATH).read_text(encoding="utf-8"))
    text = build_message(events, today or today_kst(), os.environ.get("SITE_URL", ""))
    if text is None:
        print("보낼 일정 없음")
        return 0
    if "--dry-run" in argv:
        print(text)
        return 0
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    missing = [name for name, value in (("TELEGRAM_BOT_TOKEN", token), ("TELEGRAM_CHAT_ID", chat_id)) if not value]
    if missing:
        print(f"환경 변수 없음: {', '.join(missing)}", file=sys.stderr)
        return 1
    for part in split_message(text):
        send(token, chat_id, part)
    print("전송 완료")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    sys.exit(main())
