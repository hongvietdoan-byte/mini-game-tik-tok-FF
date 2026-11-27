param(
  [Parameter(Mandatory = $true)]
  [string]$Root,

  [string]$EdgePath = '',

  [int]$Width = 0,

  [int]$Height = 0,

  [string]$ServerBaseUrl = 'http://127.0.0.1:8787',

  [int]$ServerPid = 0,

  [int]$TimeoutSeconds = 1200
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class QuizWindowNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct Rect {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool GetWindowRect(IntPtr hWnd, out Rect rect);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint flags);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr dpiContext);
}
'@

function Resolve-ProgramSize {
  param(
    [int]$ArgumentValue,
    [string]$EnvironmentName,
    [int]$DefaultValue
  )

  $value = $ArgumentValue
  if ($value -le 0) {
    $rawValue = [Environment]::GetEnvironmentVariable($EnvironmentName)
    if ([string]::IsNullOrWhiteSpace($rawValue)) {
      $value = $DefaultValue
    } else {
      $parsedValue = 0
      if (-not [int]::TryParse($rawValue, [ref]$parsedValue)) {
        throw "$EnvironmentName phai la so nguyen duong; nhan duoc '$rawValue'."
      }
      $value = $parsedValue
    }
  }

  if ($value -lt 320 -or $value -gt 7680) {
    throw "$EnvironmentName phai nam trong khoang 320..7680; nhan duoc $value."
  }
  return $value
}

function Get-DevToolsPort {
  param([string]$ProfilePath)

  $activePortPath = Join-Path $ProfilePath 'DevToolsActivePort'
  if (-not (Test-Path -LiteralPath $activePortPath)) { return 0 }

  try {
    $portText = (Get-Content -LiteralPath $activePortPath -TotalCount 1).Trim()
    $port = 0
    if (-not [int]::TryParse($portText, [ref]$port) -or $port -lt 1 -or $port -gt 65535) { return 0 }
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/version" -TimeoutSec 2
    return $port
  } catch {
    return 0
  }
}

function Wait-DevToolsPort {
  param(
    [string]$ProfilePath,
    [int]$TimeoutSeconds = 25
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $port = Get-DevToolsPort -ProfilePath $ProfilePath
    if ($port -gt 0) { return $port }
    Start-Sleep -Milliseconds 250
  }
  return 0
}

function Test-DevToolsTarget {
  param(
    [int]$DebugPort,
    [string]$Url
  )

  try {
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/list" -TimeoutSec 2
    return @($targets | Where-Object {
      $_.type -eq 'page' -and $_.url.StartsWith($Url, [StringComparison]::OrdinalIgnoreCase)
    }).Count -gt 0
  } catch {
    return $false
  }
}

function Invoke-Cdp {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [string]$Method,
    [hashtable]$Parameters = @{},
    [string]$SessionId = ''
  )

  $script:cdpRequestId += 1
  $requestId = $script:cdpRequestId
  $request = [ordered]@{
    id = $requestId
    method = $Method
    params = $Parameters
  }
  if (-not [string]::IsNullOrWhiteSpace($SessionId)) { $request.sessionId = $SessionId }

  $payload = [Text.Encoding]::UTF8.GetBytes(($request | ConvertTo-Json -Compress -Depth 12))
  $segment = [System.ArraySegment[byte]]::new($payload)
  $null = $Socket.SendAsync(
    $segment,
    [System.Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [System.Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()

  while ($true) {
    $stream = [System.IO.MemoryStream]::new()
    $buffer = [byte[]]::new(16384)
    do {
      $receiveSegment = [System.ArraySegment[byte]]::new($buffer)
      $received = $Socket.ReceiveAsync($receiveSegment, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($received.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        throw 'Kenh DevTools da dong truoc khi tra loi.'
      }
      $stream.Write($buffer, 0, $received.Count)
    } while (-not $received.EndOfMessage)

    $response = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
    $stream.Dispose()
    if ($response.id -ne $requestId) { continue }
    if ($response.error) { throw "DevTools $Method loi: $($response.error.message)" }
    return $response.result
  }
}

function Get-ProgramMetrics {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [string]$SessionId
  )

  $evaluation = Invoke-Cdp -Socket $Socket -Method 'Runtime.evaluate' -SessionId $SessionId -Parameters @{
    expression = '({ width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio, title: document.title })'
    returnByValue = $true
    awaitPromise = $true
  }
  if ($evaluation.exceptionDetails) {
    throw "Khong doc duoc viewport: $($evaluation.exceptionDetails.text)"
  }
  return $evaluation.result.value
}

function Resize-ProgramWindow {
  param(
    [string]$Title,
    [int]$TargetWidth,
    [int]$TargetHeight,
    [int]$CurrentWidth,
    [int]$CurrentHeight,
    [double]$DevicePixelRatio
  )

  $process = $null
  $titleDeadline = (Get-Date).AddSeconds(3)
  while ((Get-Date) -lt $titleDeadline -and -not $process) {
    $process = Get-Process -Name msedge -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.MainWindowTitle.Contains($Title)
    } | Select-Object -First 1
    if (-not $process) { Start-Sleep -Milliseconds 100 }
  }
  if (-not $process) { throw "Khong tim thay cua so Edge co tieu de '$Title'." }

  $previousDpiContext = [QuizWindowNative]::SetThreadDpiAwarenessContext([IntPtr](-4))
  if ($previousDpiContext -eq [IntPtr]::Zero) {
    throw 'Windows khong ho tro per-monitor DPI awareness context cho thread launcher.'
  }

  try {
    $rect = New-Object QuizWindowNative+Rect
    if (-not [QuizWindowNative]::GetWindowRect($process.MainWindowHandle, [ref]$rect)) {
      throw "GetWindowRect that bai (Win32 $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
    }

    $outerWidth = $rect.Right - $rect.Left
    $outerHeight = $rect.Bottom - $rect.Top
    # Convert the measured CSS-pixel difference to physical pixels at this window's current monitor scale.
    $deltaWidth = [int][Math]::Round(($TargetWidth - $CurrentWidth) * $DevicePixelRatio)
    $deltaHeight = [int][Math]::Round(($TargetHeight - $CurrentHeight) * $DevicePixelRatio)
    $nextWidth = [Math]::Max(320, $outerWidth + $deltaWidth)
    $nextHeight = [Math]::Max(320, $outerHeight + $deltaHeight)
    # Skip WM_WINDOWPOSCHANGING so Windows can keep a capture window taller than the work area.
    if (-not [QuizWindowNative]::SetWindowPos($process.MainWindowHandle, [IntPtr]::Zero, $rect.Left, $rect.Top, $nextWidth, $nextHeight, 0x0414)) {
      throw "SetWindowPos that bai (Win32 $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
    }
  } finally {
    $null = [QuizWindowNative]::SetThreadDpiAwarenessContext($previousDpiContext)
  }
}

function Set-ProgramViewport {
  param(
    [int]$DebugPort,
    [string]$ProgramUrl,
    [int]$TargetWidth,
    [int]$TargetHeight
  )

  $version = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/version" -TimeoutSec 3
  $socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $socket.Options.SetRequestHeader('Origin', 'http://localhost')
  $socket.ConnectAsync([Uri]$version.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $script:cdpRequestId = 0
  $originalTitle = ''
  $temporaryTitle = ''

  try {
    $targetId = ''
    $sessionId = ''
    $deadline = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $deadline -and [string]::IsNullOrWhiteSpace($targetId)) {
      $targets = Invoke-Cdp -Socket $socket -Method 'Target.getTargets'
      $target = $targets.targetInfos | Where-Object {
        $_.type -eq 'page' -and $_.url.StartsWith($ProgramUrl, [StringComparison]::OrdinalIgnoreCase)
      } | Select-Object -Last 1
      if ($target) {
        $targetId = $target.targetId
        $attached = Invoke-Cdp -Socket $socket -Method 'Target.attachToTarget' -Parameters @{
          targetId = $targetId
          flatten = $true
        }
        $sessionId = $attached.sessionId
      } else {
        Start-Sleep -Milliseconds 250
      }
    }
    if ([string]::IsNullOrWhiteSpace($targetId)) { throw 'Het 25 giay nhung khong tim thay cua so role=program trong Edge.' }

    $initialMetrics = Get-ProgramMetrics -Socket $socket -SessionId $sessionId
    $originalTitle = [string]$initialMetrics.title
    $temporaryTitle = "$originalTitle$([char]0x200B)QuizViewport-$PID-$([Guid]::NewGuid().ToString('N'))"
    $titleExpression = 'document.title = ' + (ConvertTo-Json -InputObject $temporaryTitle -Compress)
    $null = Invoke-Cdp -Socket $socket -Method 'Runtime.evaluate' -SessionId $sessionId -Parameters @{
      expression = $titleExpression
      returnByValue = $true
    }

    $window = Invoke-Cdp -Socket $socket -Method 'Browser.getWindowForTarget' -Parameters @{ targetId = $targetId }
    if ($window.bounds.windowState -ne 'normal') {
      $null = Invoke-Cdp -Socket $socket -Method 'Browser.setWindowBounds' -Parameters @{
        windowId = $window.windowId
        bounds = @{ windowState = 'normal' }
      }
      Start-Sleep -Milliseconds 250
    }

    $metrics = $null
    for ($attempt = 0; $attempt -lt 10; $attempt += 1) {
      $metrics = Get-ProgramMetrics -Socket $socket -SessionId $sessionId
      if ($metrics.width -eq $TargetWidth -and $metrics.height -eq $TargetHeight) { break }

      Resize-ProgramWindow -Title $metrics.title -TargetWidth $TargetWidth -TargetHeight $TargetHeight `
        -CurrentWidth $metrics.width -CurrentHeight $metrics.height -DevicePixelRatio $metrics.devicePixelRatio
      Start-Sleep -Milliseconds 300
    }

    $metrics = Get-ProgramMetrics -Socket $socket -SessionId $sessionId
    return $metrics
  } finally {
    if (-not [string]::IsNullOrWhiteSpace($originalTitle)) {
      try {
        $restoreExpression = 'document.title = ' + (ConvertTo-Json -InputObject $originalTitle -Compress)
        $null = Invoke-Cdp -Socket $socket -Method 'Runtime.evaluate' -SessionId $sessionId -Parameters @{
          expression = $restoreExpression
          returnByValue = $true
        }
      } catch { }
    }
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $socket.CloseAsync(
        [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
        'viewport verified',
        [System.Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()
    }
    $socket.Dispose()
  }
}

try {
  $Width = Resolve-ProgramSize -ArgumentValue $Width -EnvironmentName 'QUIZ_PROGRAM_WIDTH' -DefaultValue 1080
  $Height = Resolve-ProgramSize -ArgumentValue $Height -EnvironmentName 'QUIZ_PROGRAM_HEIGHT' -DefaultValue 1920
} catch {
  Write-Host "[quiz] LOI kich thuoc program: $($_.Exception.Message)"
  exit 1
}

$ServerBaseUrl = $ServerBaseUrl.TrimEnd('/')
$healthUrl = "$ServerBaseUrl/health"
$programUrl = "$ServerBaseUrl/overlay/?role=program"
$dashboardUrl = "$ServerBaseUrl/dashboard/"
$TimeoutSeconds = [Math]::Max(1, $TimeoutSeconds)
$waitTimer = [Diagnostics.Stopwatch]::StartNew()
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$nextWaitMessageSeconds = 30
$serverReady = $false

while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $serverReady = $true
      break
    }
  } catch {
    # The server may still be loading or starting its local assets.
  }

  if ($ServerPid -gt 0 -and -not (Get-Process -Id $ServerPid -ErrorAction SilentlyContinue)) {
    Write-Host '[quiz] LOI: tiến trình máy chủ đã dừng trước khi /health sẵn sàng.'
    exit 1
  }
  if ($waitTimer.Elapsed.TotalSeconds -ge $nextWaitMessageSeconds) {
    Write-Host '[quiz] đang chờ máy chủ…'
    $nextWaitMessageSeconds += 30
  }
  Start-Sleep -Seconds 1
}

if (-not $serverReady) {
  Write-Host "[quiz] LOI: server khong san sang tai $healthUrl sau $TimeoutSeconds giay."
  exit 1
}
$waitTimer.Stop()
Write-Host ("[quiz] /health 200 sau {0:N1} giây." -f $waitTimer.Elapsed.TotalSeconds)
$windowTimer = [Diagnostics.Stopwatch]::StartNew()

$tokenPath = Join-Path $Root 'data\admin-token.txt'
if (Test-Path -LiteralPath $tokenPath) {
  try {
    Get-Content -LiteralPath $tokenPath -Raw | Set-Clipboard
    Write-Host '[quiz] Ma quan tri da duoc chep vao clipboard.'
  } catch {
    Write-Host '[quiz] CANH BAO: khong the chep ma quan tri vao clipboard.'
  }
}

if ([string]::IsNullOrWhiteSpace($EdgePath) -or -not (Test-Path -LiteralPath $EdgePath)) {
  $edgeCandidates = @(
    (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Microsoft\Edge\Application\msedge.exe')
  )
  $EdgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($EdgePath)) {
  Write-Host '[quiz] LOI: khong tim thay Microsoft Edge; hay mo thu cong URL program va Dashboard.'
  Write-Host "[quiz] Program: $programUrl"
  Write-Host "[quiz] Dashboard: $dashboardUrl"
  exit 1
}

$programProfile = Join-Path $Root 'data\edge-program-profile'
$dashboardProfile = Join-Path $Root 'data\edge-dashboard-profile'
New-Item -ItemType Directory -Force -Path $programProfile | Out-Null
New-Item -ItemType Directory -Force -Path $dashboardProfile | Out-Null

$programArguments = @(
  "--app=$programUrl",
  '--autoplay-policy=no-user-gesture-required',
  '--no-first-run',
  "--window-size=$Width,$Height",
  '--remote-debugging-port=0',
  '--remote-allow-origins=http://localhost',
  ('--user-data-dir="{0}"' -f $programProfile)
)
$dashboardArguments = @(
  "--app=$dashboardUrl",
  '--no-first-run',
  ('--user-data-dir="{0}"' -f $dashboardProfile)
)

$debugPort = Get-DevToolsPort -ProfilePath $programProfile
if ($debugPort -le 0) {
  $activePortPath = Join-Path $programProfile 'DevToolsActivePort'
  if (Test-Path -LiteralPath $activePortPath) {
    Remove-Item -LiteralPath $activePortPath -Force -ErrorAction SilentlyContinue
  }
}

if ($debugPort -le 0 -or -not (Test-DevToolsTarget -DebugPort $debugPort -Url $programUrl)) {
  Start-Process -FilePath $EdgePath -ArgumentList $programArguments
}
if ($debugPort -le 0) {
  $debugPort = Wait-DevToolsPort -ProfilePath $programProfile -TimeoutSeconds 25
}

if ($debugPort -le 0) {
  Write-Host '[quiz] CANH BAO: Edge khong mo cong DevTools local; chua do duoc window.innerWidth/innerHeight.'
  Write-Host "[quiz] Kich thuoc yeu cau: ${Width}x${Height} CSS px. Hay dong cua so program Edge cu va mo lai CHAY_GAME.cmd."
  Start-Process -FilePath $EdgePath -ArgumentList $dashboardArguments
  exit 1
}

if (-not (Test-DevToolsTarget -DebugPort $debugPort -Url $dashboardUrl)) {
  Start-Process -FilePath $EdgePath -ArgumentList $dashboardArguments
}

try {
  $metrics = Set-ProgramViewport -DebugPort $debugPort -ProgramUrl $programUrl -TargetWidth $Width -TargetHeight $Height
  $windowTimer.Stop()
  Write-Host ("[quiz] mở/xác minh cửa sổ sau {0:N1} giây." -f $windowTimer.Elapsed.TotalSeconds)
  if ($metrics.width -eq $Width -and $metrics.height -eq $Height) {
    $times = [char]0x00D7
    $check = [char]0x2713
    Write-Host "[quiz] Khung game: ${Width}${times}${Height} ${check}"
    Write-Host "[quiz] Xac minh window.innerWidth=$($metrics.width), window.innerHeight=$($metrics.height), devicePixelRatio=$($metrics.devicePixelRatio)."
  } else {
    $times = [char]0x00D7
    Write-Host "[quiz] CANH BAO: khung game thuc te $($metrics.width)${times}$($metrics.height); yeu cau ${Width}${times}${Height}."
    Write-Host '[quiz] Edge/Windows co the da gioi han kich thuoc cua so; khong coi khung nay la kich thuoc da xac minh.'
    exit 1
  }
} catch {
  Write-Host "[quiz] CANH BAO: khong the dat/xac minh viewport: $($_.Exception.Message)"
  Write-Host "[quiz] Kich thuoc yeu cau: ${Width}x${Height} CSS px; hay kiem tra cua so program trong LIVE Studio."
  exit 1
}
