#!/usr/bin/env powershell
# Test Failure Analyzer
# Runs tests and extracts failing test names clearly

param(
    [switch]$Watch,
    [switch]$UI
)

$ErrorActionPreference = "Continue"

Write-Host "Running tests..." -ForegroundColor Cyan

if ($UI) {
    & npm run test:ui
    exit
}

if ($Watch) {
    & npm run test:watch
    exit
}

# Run tests and capture output
$output = & npm run test 2>&1 | Out-String

# Parse and display results
$lines = $output -split "`n"
$passCount = 0
$failCount = 0
$failedTests = @()
$currentFile = ""

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "TEST RESULTS" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

foreach ($line in $lines) {
    # Track file names
    if ($line -match "^\s*src/__tests__/(.+\.tsx?)") {
        $currentFile = $matches[1]
    }
    
    # Count passes
    if ($line -match "✓") {
        $passCount++
    }
    
    # Track failures
    if ($line -match "✕|×") {
        $failCount++
        $testName = $line -replace ".*[✕×]\s+", "" -replace "\s+$", ""
        if ($testName -and $testName.Length -gt 0) {
            $failedTests += @{
                File = $currentFile
                Name = $testName
                Line = $line
            }
        }
    }
}

if ($failCount -gt 0) {
    Write-Host "`n❌ FAILED TESTS ($failCount):" -ForegroundColor Red
    foreach ($test in $failedTests) {
        $file = if ($test.File) { " [$($test.File)]" } else { "" }
        Write-Host "   ✕ $($test.Name)$file" -ForegroundColor Red
    }
}

if ($passCount -gt 0) {
    Write-Host "`n✅ PASSED TESTS ($passCount)" -ForegroundColor Green
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "Summary: $passCount passed, $failCount failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ("=" * 80) -ForegroundColor Cyan

# Show detailed output if there are failures
if ($failCount -gt 0) {
    Write-Host "`n📋 Full Output:" -ForegroundColor Yellow
    Write-Host $output
}

exit $(if ($failCount -gt 0) { 1 } else { 0 })
