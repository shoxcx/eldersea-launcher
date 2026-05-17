Get-Process | Where-Object { $_.Path -and ($_.Path.ToLower().Contains("electron") -or $_.Path.ToLower().Contains("eldersea")) } | ForEach-Object {
    Write-Host "Killing process: $($_.Name) ($($_.Id)) - $($_.Path)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
