# 고입 일정 달력

서울 거주 중3의 2027학년도 고등학교 입시 일정을 달력으로 보여 주고, 매일 오전 9시(한국 시간)에 텔레그램으로 알려 주는 도구입니다.
일정 데이터 파일 하나(`data/events.json`)를 웹 화면과 알림이 함께 읽습니다. 서버와 빌드 과정이 없습니다.

> **일정은 반드시 공식 요강으로 다시 확인하세요.** "미확인" 표시가 붙은 일정은 언론 보도로만 확인한 날짜입니다. 출처와 확인하지 못한 항목은 [`data/SOURCES.md`](data/SOURCES.md)에 있습니다.

## 화면

- `index.html` — 가장 가까운 일정과 이번 주 건수 타일, "이번 주 챙길 것"·"다음 주 미리보기" 체크리스트, 월 달력, 전체 일정. 넓은 화면(PC)에서는 한 화면에 모두 보이고, 좁은 화면(휴대폰)에서는 하단 탭(홈, 달력, 전체)으로 전환합니다.
- `detail.html?date=YYYY-MM-DD` — 그날의 일정, 요강, 주의할 점, 학교 안내 링크, 출처.
- 체크 표시는 이 기기의 브라우저에만 저장됩니다. 두 사람 사이에 공유되지 않고, 브라우저 데이터를 지우면 사라집니다.

## 내 PC에서 열기

파일을 더블클릭하면 동작하지 않습니다. 폴더에서 아래 명령을 실행한 뒤 브라우저로 `http://localhost:8000/` 을 엽니다.

```
python -m http.server 8000
```

## GitHub에 올리고 사이트 켜기

1. GitHub에서 새 **공개** 저장소를 만듭니다. (무료 계정의 GitHub Pages는 공개 저장소가 필요합니다.)
2. 이 폴더에서 다음을 실행합니다.
   ```
   git remote add origin https://github.com/<계정>/<저장소>.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Build and deployment** 에서 Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)` 로 고르고 저장합니다.
4. 몇 분 뒤 `https://<계정>.github.io/<저장소>/` 에서 달력이 열립니다.

## 텔레그램 알림 설정

1. 텔레그램에서 `@BotFather` 와 대화를 열고 `/newbot` 을 보내 봇을 만든 뒤 토큰을 받습니다.
2. 그룹방을 만들고 알림 받을 사람과 방금 만든 봇을 초대합니다.
3. 그룹방에 아무 메시지나 보낸 뒤, 브라우저에서 `https://api.telegram.org/bot<토큰>/getUpdates` 를 열어 `"chat":{"id":...}` 값을 찾습니다. 그룹방 ID는 음수입니다.
4. GitHub 저장소 **Settings → Secrets and variables → Actions** 에서 등록합니다.
   - Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - Variables: `SITE_URL` (예: `https://<계정>.github.io/<저장소>`)
5. **Actions** 탭 → `notify` → **Run workflow** 로 한 번 직접 실행해 메시지가 오는지 확인합니다.

알림에는 오늘 걸친 일정과 7일 안에 시작하는 일정이 들어갑니다. 해당 일정이 없는 날에는 메시지를 보내지 않습니다.

보내기 전에 내용을 미리 보려면:

```
python notify/notify.py --dry-run
```

## 휴대폰 홈 화면에 추가

- iPhone(Safari): 사이트를 열고 공유 버튼 → **홈 화면에 추가**
- Android(Chrome): 사이트를 열고 메뉴 → **홈 화면에 추가** 또는 **앱 설치**

## 일정 고치기

`data/events.json` 을 고친 뒤 검사하고 올립니다.

```
python notify/validate.py
git commit -am "data: 일정 수정"
git push
```

| 항목 | 필수 | 설명 |
|---|---|---|
| `id` | 예 | 영문 소문자와 하이픈. 겹치면 안 됩니다. |
| `date` | 예 | 시작일. `YYYY-MM-DD` |
| `end` | 아니오 | 기간 일정의 마지막 날 |
| `title` | 예 | 달력과 알림에 나오는 제목 |
| `category` | 예 | `일반고`, `자사고`, `외고·국제고`, `과학고·영재학교`, `특성화고·마이스터고` 중 하나 |
| `summary` | 예 | 한두 문장 요약 |
| `requirements` | 아니오 | 요강 핵심 항목 목록 |
| `cautions` | 아니오 | 주의할 점 목록 |
| `schools` | 아니오 | `{ "name", "url" }` 목록. `url`은 `https://` 로 시작 |
| `source` | 예 | `{ "name", "url" }`. 날짜를 확인한 곳 |
| `verified` | 예 | 공식 문서에서 확인했으면 `true`, 아니면 `false` |

## 주간 자동 갱신 (Windows)

매주 일요일 22:00에 PC가 켜져 있고 로그인된 상태면, Claude Code가 공식 자료를 다시 찾아 `data/`를 갱신하고 바뀐 것이 있을 때만 GitHub에 올립니다. PC가 꺼져 있던 주는 건너뜁니다.

```
pwsh -File update/register-task.ps1      # 작업 스케줄러에 등록
pwsh -File update/run.ps1 -DryRun        # 올리지 않고 한 번 실행해 보기
```

- `update/PROMPT.md` — 조사 지시문. 공식 페이지에서 직접 읽은 날짜만 "확인됨"으로 표시합니다.
- `update/check.py` — 올리기 전 검사. `data/events.json`, `data/SOURCES.md` 밖의 파일이 바뀌었거나, 이메일·전화번호·주민등록번호 형태·봇 토큰 형태·로컬 경로·PC 사용자 이름이 들어 있거나, 커밋 작성자가 GitHub noreply 주소가 아니면 올리지 않고 변경을 되돌립니다.
- 실행 기록은 `update/logs/`에 남고 GitHub에는 올라가지 않습니다.
- 갱신 결과는 사람이 확인하지 않고 공개됩니다. 커밋 기록에서 무엇이 바뀌었는지 가끔 확인하세요.
- 필요한 것: Claude Code(`claude`), `git`(푸시 권한), Python, PowerShell 7.

## 글꼴

화면 글꼴은 [Pretendard](https://github.com/orioncactus/pretendard)(SIL Open Font License 1.1)이고, 파일은 `assets/fonts/`에 들어 있습니다(약 2MB). 라이선스 전문은 같은 폴더의 `PRETENDARD-LICENSE.txt`입니다.

## 테스트

```
python -m unittest discover -s notify
python -m unittest discover -s update
node --test "assets/*.test.mjs"
```

## 주의 사항

- 봇 토큰과 채팅방 ID는 GitHub Secrets에만 둡니다. 파일에 적지 않습니다.
- 저장소가 공개이므로 자녀 이름이나 지원 예정 학교 같은 개인 정보를 적지 않습니다.
- GitHub Actions 예약 실행은 정시보다 늦게 시작될 수 있습니다. 알림이 30분쯤 늦을 수 있습니다.
- 공개 저장소에 60일 동안 변경이 없으면 예약 실행이 자동으로 꺼집니다. Actions 탭에서 다시 켤 수 있습니다.
