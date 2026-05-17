try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 3306)
    Write-Host "MySQL is running on port 3306!"
    $tcp.Close()
} catch {
    Write-Host "MySQL is NOT running on port 3306: $_"
}
