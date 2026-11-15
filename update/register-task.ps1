# 주간 일정 갱신을 Windows 작업 스케줄러에 등록한다. 실행: pwsh -File update/register-task.ps1
# 매주 일요일 22:00, 로그인한 상태에서만 실행된다. PC가 꺼져 있던 주는 건너뛴다.
# 해제: Unregister-ScheduledTask -TaskName 'hs-admission-calendar-weekly-update'
$ErrorActionPreference = 'Stop'
$name = 'hs-admission-calendar-weekly-update'
$script = Join-Path $PSScriptRoot 'run.ps1'
$action = New-ScheduledTaskAction -Execute (Get-Command pwsh).Source `
    -Argument "-NoProfile -WindowStyle Hidden -File `"$script`"" -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At '22:00'
# 노트북 배터리 상태에서도 실행. 한 번 실행은 최대 1시간.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Get-ScheduledTask -TaskName $name | Get-ScheduledTaskInfo | Select-Object TaskName, NextRunTime
