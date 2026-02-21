# PowerShell script to run each test in HomePage.test.js individually
$testFile = "client/src/components/Header.test.js"
$testNames = Select-String -Path $testFile -Pattern 'test\("([^"]+)"' | ForEach-Object {
    $_.Matches[0].Groups[1].Value
}
foreach ($name in $testNames) {
    Write-Host "===================="
    Write-Host "Running: $name"
    Write-Host "===================="
    npx jest $testFile -t "$name"
}