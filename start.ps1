param(
    [int]$Port = 8010,
    [switch]$Reload,
    [switch]$SkipSeed
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$python = '.\.venv\Scripts\python.exe'
$env:PYTHONIOENCODING = 'utf-8'

function Get-PythonLauncher {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($version in '3.13', '3.12', '3.11') {
            & py "-$version" --version *> $null
            if ($LASTEXITCODE -eq 0) { return @('py', "-$version") }
        }
    }
    if (Get-Command python -ErrorAction SilentlyContinue) { return @('python') }
    throw 'Không tìm thấy Python 3.11 trở lên (khuyến nghị 3.13). Cài Python rồi chạy lại.'
}

# 1. Môi trường ảo + thư viện (cài lại khi requirements.txt thay đổi)
if (-not (Test-Path -LiteralPath $python)) {
    Write-Host '==> Tạo môi trường ảo .venv'
    $launcher = Get-PythonLauncher
    $rest = @($launcher | Select-Object -Skip 1)
    & $launcher[0] @rest -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được .venv.' }
}
$stamp = '.venv\.requirements.sha256'
$hash = (Get-FileHash -LiteralPath 'requirements.txt' -Algorithm SHA256).Hash
if (-not (Test-Path -LiteralPath $stamp) -or (Get-Content -LiteralPath $stamp -Raw).Trim() -ne $hash) {
    Write-Host '==> Cài thư viện từ requirements.txt'
    & $python -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Cài thư viện thất bại.' }
    Set-Content -LiteralPath $stamp -Value $hash
}

# 2. Tệp cấu hình .env (không bao giờ ghi đè .env đã có)
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host '==> Đã tạo .env từ .env.example. Điền SMTP_* và GOOGLE_* vào .env rồi chạy lại để bật gửi email và đăng nhập Google.' -ForegroundColor Yellow
}

# 3. Báo trạng thái cấu hình (chỉ cho biết đã điền hay chưa, không in giá trị)
$status = & $python scripts/config_status.py
$cfg = @{}
foreach ($line in $status) { $k, $v = $line -split '=', 2; $cfg[$k] = $v }
Write-Host ('==> Gửi email (SMTP): ' + $(if ($cfg.SMTP -eq 'OK') { 'đã cấu hình' } else { 'CHƯA cấu hình - mã xác nhận chỉ được ghi trong cửa sổ này' }))
Write-Host ('==> Đăng nhập Google: ' + $(if ($cfg.GOOGLE -eq 'OK') { 'đã cấu hình' } else { 'CHƯA cấu hình - nút Google sẽ ẩn' }))
$redirect = $null
if ($cfg.REDIRECT -match '^https?://') { $redirect = [uri]$cfg.REDIRECT }
if ($cfg.GOOGLE -eq 'OK') {
    if (-not $redirect) {
        Write-Host 'CẢNH BÁO: GOOGLE_REDIRECT_URI trong .env không hợp lệ (phải bắt đầu bằng http:// hoặc https://; kiểm tra xem có bị lặp tên biến không). Đăng nhập Google sẽ lỗi.' -ForegroundColor Yellow
    } elseif ($redirect.Port -ne $Port) {
        Write-Host ("CẢNH BÁO: GOOGLE_REDIRECT_URI dùng cổng $($redirect.Port) nhưng server chạy cổng $Port; đăng nhập Google sẽ lỗi.") -ForegroundColor Yellow
    }
}

# 3b. Giao diện React: dùng bản build sẵn trong app/static/dist; chỉ build khi thiếu và máy có Node.js.
if (-not (Test-Path -LiteralPath 'app\static\dist\app.js')) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host '==> Build giao diện React (chỉ lần đầu)'
        Push-Location -LiteralPath 'frontend'
        try {
            npm ci
            if ($LASTEXITCODE -eq 0) { npm run build }
            if ($LASTEXITCODE -ne 0) { Write-Host 'Build giao diện thất bại: dùng giao diện JavaScript cũ.' -ForegroundColor Yellow }
        } finally { Pop-Location }
    } else {
        Write-Host 'Chưa có app/static/dist và máy không có Node.js: dùng giao diện JavaScript cũ.' -ForegroundColor Yellow
    }
}

# 4. Cơ sở dữ liệu: tạo bảng, nâng cấp cột mới (idempotent), seed nếu chưa có dữ liệu
Write-Host '==> Chuẩn bị cơ sở dữ liệu'
& $python scripts/init_db.py
if ($LASTEXITCODE -ne 0) { throw 'init_db.py thất bại.' }
if (-not $SkipSeed) {
    & $python scripts/seed_data.py
    if ($LASTEXITCODE -ne 0) { throw 'seed_data.py thất bại.' }
}

# 5. Chạy server
$hostName = if ($cfg.GOOGLE -eq 'OK' -and $redirect) { $redirect.Host } else { '127.0.0.1' }
Write-Host "==> Website: http://${hostName}:$Port   (API: /docs, quản trị: /quan-tri)" -ForegroundColor Green
$uvicorn = @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', $Port)
if ($Reload) { $uvicorn += '--reload' }
& $python @uvicorn
