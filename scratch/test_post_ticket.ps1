$json = '{"pseudo":"zewolf929","subject":"Test Ticket","description":"This is a test ticket"}'
try {
    $res = Invoke-RestMethod -Uri "https://eldersea.tekao.fr/api/api/tickets" -Method Post -Body $json -ContentType "application/json"
    Write-Host "SUCCESS!"
    $res | Format-List
} catch {
    Write-Host "ERROR:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
}
