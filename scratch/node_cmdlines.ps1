Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
    [PSCustomObject]@{
        Id = $_.ProcessId
        CommandLine = $_.CommandLine
    }
} | Format-Table -AutoSize
