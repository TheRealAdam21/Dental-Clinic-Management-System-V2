# Test Mobile App Locally
# This will start a server you can access from your phone

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   Mobile App Local Test Server   " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"}).IPAddress | Select-Object -First 1

Write-Host "Your PC IP Address: $ipAddress" -ForegroundColor Green
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Make sure your phone is on the SAME WiFi as this PC" -ForegroundColor White
Write-Host "2. Open browser on your phone" -ForegroundColor White
Write-Host "3. Go to: http://${ipAddress}:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server
npx http-server dist -p 8080 -a $ipAddress
