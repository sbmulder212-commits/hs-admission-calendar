# 주간 일정 갱신. 실행: pwsh -File update/run.ps1 [-DryRun]
# -DryRun: 갱신과 검사까지만 하고 커밋·푸시하지 않는다 (변경은 작업 폴더에 남는다).
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("{0}.log" -f (Get-Date -Format 'yyyy-MM-dd_HHmmss'))
# Out-Host: 기록 문자열이 함수 반환값에 섞이면 Run의 종료 코드 비교가 깨진다.
function Log($message) { "$(Get-Date -Format 'HH:mm:ss') $message" | Tee-Object -FilePath $log -Append | Out-Host }

# 검사 실패 시 AI가 만든 변경을 버린다. 시작할 때 작업 폴더가 깨끗했으므로 잃는 것은 그 변경뿐이다.
function Abort($reason) {
    Log "중단: $reason"
    git restore --staged --worktree . 2>&1 | Out-Null
    git clean -fd -- . 2>&1 | Out-Null
    exit 1
}

function Run($label, [scriptblock]$command) {
    Log "== $label"
    & $command 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
    return $LASTEXITCODE
}

Log "시작 (DryRun=$DryRun)"
if ((git branch --show-current) -ne 'main') { Log '중단: main 브랜치가 아님'; exit 1 }
if (git status --porcelain) { Log '중단: 커밋하지 않은 변경이 있음. 직접 정리한 뒤 다시 실행'; exit 1 }
if ((Run 'git pull' { git pull --ff-only }) -ne 0) { Log '중단: git pull 실패'; exit 1 }

# 허용 도구만 쓴다: 웹 조회, 읽기, data/ 수정, 데이터 검사. 그 밖의 도구는 대화창이 없어 거부된다.
$tools = @(
    'WebSearch', 'WebFetch', 'Read', 'Glob', 'Grep',
    'Edit(data/**)', 'Write(data/**)',
    'Bash(python notify/validate.py)'
)
$prompt = Get-Content (Join-Path $PSScriptRoot 'PROMPT.md') -Raw -Encoding utf8
$code = Run 'claude' { $prompt | claude -p --allowedTools @tools }
if ($code -ne 0) { Abort "claude 실행 실패 (종료 코드 $code)" }

if ((Run '올리기 전 검사' { python update/check.py }) -ne 0) { Abort '올리기 전 검사 실패' }
if ((Run '데이터 검사' { python notify/validate.py }) -ne 0) { Abort '데이터 형식 오류' }
if ((Run '테스트 notify' { python -m unittest discover -s notify }) -ne 0) { Abort '테스트 실패' }
if ((Run '테스트 update' { python -m unittest discover -s update }) -ne 0) { Abort '테스트 실패' }

if (-not (git status --porcelain)) { Log '변경 없음. 올리지 않음'; exit 0 }
Run '변경 요약' { git diff --stat } | Out-Null
if ($DryRun) { Log 'DryRun: 커밋·푸시하지 않음. 변경은 작업 폴더에 남아 있음'; exit 0 }

git add data/events.json data/SOURCES.md
$message = "data: 주간 일정 갱신 ($(Get-Date -Format 'yyyy-MM-dd'))"
if ((Run 'git commit' { git commit -m $message }) -ne 0) { Abort 'git commit 실패' }
# 푸시가 실패해도 커밋은 남긴다. 다음 실행의 git pull/push에서 다시 올라간다.
if ((Run 'git push' { git push origin main }) -ne 0) { Log '중단: git push 실패 (커밋은 로컬에 남음)'; exit 1 }
Log '완료: GitHub에 올림'
