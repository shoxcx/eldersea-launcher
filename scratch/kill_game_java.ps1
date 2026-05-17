Get-CimInstance Win32_Process -Filter "Name = 'javaw.exe' or Name = 'java.exe'" | Where-Object { $_.CommandLine -like "*eldersea*" } | ForEach-Object {
    Write-Host "Killing game process: $($_.ProcessId) - $($_.Name)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
