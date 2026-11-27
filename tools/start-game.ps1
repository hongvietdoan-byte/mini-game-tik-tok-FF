param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [int]$TimeoutSeconds = 1200
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$bundle = Join-Path $Root 'apps\server\dist\main.js'
$sourceEntry = Join-Path $Root 'apps\server\src\main.ts'
$helper = Join-Path $Root 'tools\open-game-windows.ps1'
$port = 8787
if (-not [string]::IsNullOrWhiteSpace($env:QUIZ_PORT)) {
  $parsedPort = 0
  if (-not [int]::TryParse($env:QUIZ_PORT, [ref]$parsedPort) -or $parsedPort -lt 1 -or $parsedPort -gt 65535) {
    Write-Host '[quiz] LOI: QUIZ_PORT phai la so cong hop le.'
    exit 1
  }
  $port = $parsedPort
}

$useTsx = $env:QUIZ_SERVER_USE_TSX -eq '1' -or -not (Test-Path -LiteralPath $bundle -PathType Leaf)
if ($useTsx -and $env:QUIZ_SERVER_USE_TSX -ne '1') {
  Write-Host '[quiz] Khong co bundle server; dang chay bang tsx de giu duong lui.'
}

function Start-QuizServer {
  param([bool]$RunTsx)

  $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
  if ($RunTsx) {
    Write-Host '[quiz] Dang chay server bang tsx.'
    return Start-Process -FilePath $nodePath -ArgumentList @('--import', 'tsx', "`"$sourceEntry`"") -WorkingDirectory $Root -NoNewWindow -PassThru
  }
  return Start-Process -FilePath $nodePath -ArgumentList @("`"$bundle`"") -WorkingDirectory $Root -NoNewWindow -PassThru
}

function Invoke-WindowCheck {
  param([System.Diagnostics.Process]$Server)
  $serverUrl = "http://127.0.0.1:$port"
  & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $helper -Root $Root -ServerPid $Server.Id -ServerBaseUrl $serverUrl -TimeoutSeconds $TimeoutSeconds 2>&1 | ForEach-Object { Write-Host $_ }
  $helperExit = $LASTEXITCODE
  return $helperExit
}

$timer = [Diagnostics.Stopwatch]::StartNew()
$forcedRebuildTried = $false
while ($true) {
  try {
    $server = Start-QuizServer -RunTsx:$useTsx
  } catch {
    if (-not $useTsx) {
      Write-Host "[quiz] Bundle server khong khoi dong duoc: $($_.Exception.Message)"
      Write-Host '[quiz] Dang chuyen sang chay tsx.'
      $useTsx = $true
      continue
    }
    Write-Host "[quiz] LOI: khong the khoi dong Node/tsx: $($_.Exception.Message)"
    exit 1
  }

  $helperExit = Invoke-WindowCheck -Server $server
  $server.Refresh()
  if ($helperExit -eq 0 -or -not $server.HasExited) {
    $timer.Stop()
    Write-Host ("[5/5] xong sau {0:N1} giây." -f $timer.Elapsed.TotalSeconds)
    if ($helperExit -ne 0) {
      Write-Host '[quiz] Cửa sổ game chưa được xác minh; máy chủ vẫn tiếp tục chạy.'
    }
    try { Wait-Process -Id $server.Id -ErrorAction SilentlyContinue } catch { }
    exit 0
  }

  if ($useTsx) {
    $timer.Stop()
    Write-Host ("[5/5] xong sau {0:N1} giây." -f $timer.Elapsed.TotalSeconds)
    Write-Host '[quiz] LOI: server tsx da dung truoc khi /health san sang.'
    exit 1
  }

  Write-Host '[quiz] Bundle server dung truoc khi /health san sang.'
  if (-not $forcedRebuildTried) {
    $forcedRebuildTried = $true
    Write-Host '[quiz] Dang build lai bundle truoc khi chuyen sang tsx.'
    & py -3 (Join-Path $Root 'tools\server_build.py') ensure --force --root $Root
    $buildExit = $LASTEXITCODE
    if ($buildExit -eq 0) {
      Write-Host '[quiz] Build lai xong; thu chay bundle mot lan nua.'
      continue
    }
    Write-Host "[quiz] Build lai that bai (ma $buildExit); dang chay bang tsx."
  } else {
    Write-Host '[quiz] Bundle van loi sau khi build lai; dang chay bang tsx.'
  }
  $useTsx = $true
}
