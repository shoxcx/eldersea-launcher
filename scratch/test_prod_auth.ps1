$pseudo = "ModelTestUser" + (Get-Random -Minimum 1000 -Maximum 9999)
$email = $pseudo + "@test.com"
$password = "testPassword123"

# 1. Hash password using SHA-256 (same as client-side)
$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
$hash = $sha.ComputeHash($bytes)
$hashedPwd = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Registering pseudo: $pseudo with email: $email..."
$registerJson = @{
    pseudo = $pseudo
    email = $email
    password = $hashedPwd
    twoFaSecret = $null
} | ConvertTo-Json

try {
    # 2. Call Register API
    $regRes = Invoke-RestMethod -Uri "https://eldersea.tekao.fr/api/api/auth/register" -Method Post -Body $registerJson -ContentType "application/json"
    Write-Host "Registration Successful! Response:"
    $regRes | Format-List

    # 3. Call Login API
    Write-Host "Logging in..."
    $loginJson = @{
        pseudo = $pseudo
        password = $hashedPwd
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "https://eldersea.tekao.fr/api/api/auth/login" -Method Post -Body $loginJson -ContentType "application/json"
    Write-Host "Login Successful! User object returned:"
    $loginRes | Format-List
} catch {
    Write-Host "ERROR:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
}
