$body = @{
    pseudo = "TestUser"
    email = "test@eldersea.fr"
    password = "testpassword123"
    twoFaSecret = "JBSWY3DPEHPK3PXP" # Valid Base32 key
} | ConvertTo-Json

try {
    Write-Host "Sending registration request to http://localhost:5000/api/auth/register..."
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! Response:"
    $response | Format-List
} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Server Response Body: $respBody"
    }
}
