New-NetFirewallRule -DisplayName "UniRide Dev 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "UniRide Dev 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "UniRide Dev 8082" -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow -Profile Any
Write-Host "Regras criadas com sucesso." -ForegroundColor Green
