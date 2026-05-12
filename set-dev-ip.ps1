# Detecta o IP Wi-Fi atual e atualiza todos os arquivos do projeto UniRide.
# Uso: .\set-dev-ip.ps1
#      .\set-dev-ip.ps1 -IP 192.168.1.50   (para sobrescrever manualmente)

param(
    [string]$IP = ""
)

$ErrorActionPreference = "Stop"

# ── 1. Detectar IP ────────────────────────────────────────────────────────────
if (-not $IP) {
    $IP = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.InterfaceAlias -match "Wi-Fi|WiFi|Wireless|WLAN" -and
                          $_.IPAddress -notmatch "^(127|169\.254)" } |
           Select-Object -First 1).IPAddress

    if (-not $IP) {
        # Fallback: qualquer interface não-loopback não-APIPA
        $IP = (Get-NetIPAddress -AddressFamily IPv4 |
               Where-Object { $_.IPAddress -notmatch "^(127|169\.254)" -and
                              $_.PrefixOrigin -ne "WellKnown" } |
               Select-Object -First 1).IPAddress
    }

    if (-not $IP) {
        Write-Error "Nenhum IP de rede encontrado. Passe -IP manualmente."
        exit 1
    }
}

Write-Host ""
Write-Host "IP detectado: $IP" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://${IP}:8080"

# ── 2. Caminhos ───────────────────────────────────────────────────────────────
$root     = $PSScriptRoot
$envFile  = Join-Path $root "mobile-backup\.env"
$easFile  = Join-Path $root "mobile-backup\eas.json"
$appYml   = Join-Path $root "user-service\src\main\resources\application.yml"
$devYml   = Join-Path $root "user-service\src\main\resources\application-dev.yml"

# ── 3. mobile-backup/.env ─────────────────────────────────────────────────────
$envContent = @"
# URL do gateway (ajuste conforme o ambiente)
# Dispositivo físico na rede local → usa o IP da máquina
# Emulador Android               → trocar para http://10.0.2.2:8080
# iOS Simulator                  → trocar para http://localhost:8080
EXPO_PUBLIC_API_URL=$apiUrl
"@
Set-Content -Path $envFile -Value $envContent -Encoding utf8
Write-Host "[OK] mobile-backup/.env" -ForegroundColor Green

# ── 4. mobile-backup/eas.json ─────────────────────────────────────────────────
$eas = Get-Content $easFile -Raw | ConvertFrom-Json
$eas.build.preview | Add-Member -Force -MemberType NoteProperty -Name "env" -Value @{
    EXPO_PUBLIC_API_URL = $apiUrl
}
$eas | ConvertTo-Json -Depth 10 | Set-Content -Path $easFile -Encoding utf8
Write-Host "[OK] mobile-backup/eas.json" -ForegroundColor Green

# ── 5. application.yml (app.url) ──────────────────────────────────────────────
$yml = Get-Content $appYml -Raw
$yml = $yml -replace 'app\.url:.*', "app.url: `${APP_URL:$apiUrl}"
Set-Content -Path $appYml -Value $yml -Encoding utf8
Write-Host "[OK] user-service/src/main/resources/application.yml" -ForegroundColor Green

# ── 6. application-dev.yml (app.url) ──────────────────────────────────────────
$devYmlContent = Get-Content $devYml -Raw
$devYmlContent = $devYmlContent -replace 'app\.url:.*', "app.url: $apiUrl"
Set-Content -Path $devYml -Value $devYmlContent -Encoding utf8
Write-Host "[OK] user-service/src/main/resources/application-dev.yml" -ForegroundColor Green

# ── 7. Resumo ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Todos os arquivos atualizados para: $apiUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host "  1. Reinicie o user-service (para recarregar o app.url)" -ForegroundColor Gray
Write-Host "  2. Se for testar no Expo Go:  cd mobile-backup && npx expo start --clear" -ForegroundColor Gray
Write-Host "  3. Se for gerar novo APK:     cd mobile-backup && eas build --profile preview --platform android" -ForegroundColor Gray
Write-Host ""
