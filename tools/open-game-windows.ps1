param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [string]$EdgePath = ''
)

$ErrorActionPreference = 'Stop'
$healthUrl = 'http://127.0.0.1:8787/health'
$deadline = (Get-Date).AddSeconds(90)
$serverReady = $false

while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $serverReady = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $serverReady) { exit 0 }

$tokenPath = Join-Path $Root 'data\admin-token.txt'
if (Test-Path -LiteralPath $tokenPath) {
  Get-Content -LiteralPath $tokenPath -Raw | Set-Clipboard
}

if ([string]::IsNullOrWhiteSpace($EdgePath) -or -not (Test-Path -LiteralPath $EdgePath)) {
  $edgeCandidates = @(
    (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Microsoft\Edge\Application\msedge.exe')
  )
  $EdgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($EdgePath)) { exit 0 }

$previewProfile = Join-Path $Root 'data\edge-preview-profile'
$dashboardProfile = Join-Path $Root 'data\edge-dashboard-profile'
New-Item -ItemType Directory -Force -Path $previewProfile | Out-Null
New-Item -ItemType Directory -Force -Path $dashboardProfile | Out-Null

$previewArguments = @(
  '--app=http://127.0.0.1:8787/overlay/?role=preview',
  '--autoplay-policy=no-user-gesture-required',
  '--no-first-run',
  ('--user-data-dir="{0}"' -f $previewProfile)
)
$dashboardArguments = @(
  '--app=http://127.0.0.1:8787/dashboard/',
  '--no-first-run',
  ('--user-data-dir="{0}"' -f $dashboardProfile)
)

Start-Process -FilePath $EdgePath -ArgumentList $previewArguments
Start-Process -FilePath $EdgePath -ArgumentList $dashboardArguments
