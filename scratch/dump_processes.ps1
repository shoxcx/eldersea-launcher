Get-Process | ForEach-Object {
    [PSCustomObject]@{
        Id = $_.Id
        Name = $_.Name
        Company = $_.Company
    }
} | Format-Table -AutoSize | Out-String | Set-Content "scratch/processes.txt"
