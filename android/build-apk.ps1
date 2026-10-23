$ErrorActionPreference = 'Stop'

$required = @(
    'RCF_RELEASE_STORE_FILE',
    'RCF_RELEASE_STORE_PASSWORD',
    'RCF_RELEASE_KEY_ALIAS',
    'RCF_RELEASE_KEY_PASSWORD'
)
foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "Set $name before building a production release. Keep the keystore outside the repository."
    }
}

if (-not (Test-Path $env:RCF_RELEASE_STORE_FILE -PathType Leaf)) {
    throw 'RCF_RELEASE_STORE_FILE must point to the persistent release keystore.'
}

$gradle = Get-Command gradle -ErrorAction SilentlyContinue
if (-not $gradle) {
    throw 'Gradle is not installed or not on PATH. Install Gradle 8.2+ and retry.'
}

Push-Location $PSScriptRoot
try {
    & $gradle.Source --no-daemon :app:assembleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }

    $builtApk = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path $builtApk -PathType Leaf)) { throw 'Gradle did not produce the release APK.' }

    $destination = Join-Path $PSScriptRoot '../public/downloads/rcf-ikole-ushering.apk'
    Copy-Item -LiteralPath $builtApk -Destination $destination -Force

    $sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    $apksigner = Join-Path $sdk 'build-tools/34.0.0/apksigner.bat'
    $aapt = Join-Path $sdk 'build-tools/34.0.0/aapt.exe'
    & $apksigner verify --verbose --print-certs $destination
    if ($LASTEXITCODE -ne 0) { throw 'The release APK signature did not verify.' }
    $metadata = & $aapt dump badging $destination
    if ($LASTEXITCODE -ne 0) { throw 'Could not read release APK package metadata.' }
    if (($metadata -join "`n") -notmatch "package: name='com\.rcf\.ikole\.ushering' versionCode='2' versionName='1\.0\.1'") {
        throw 'Release APK package ID or version metadata is incorrect.'
    }
    if (($metadata -join "`n") -notmatch "application-label:'RCF Ikole Ushering Unit'") {
        throw 'Release APK application name is incorrect.'
    }
    Write-Host "Signed release APK ready: $destination"
} finally {
    Pop-Location
}
