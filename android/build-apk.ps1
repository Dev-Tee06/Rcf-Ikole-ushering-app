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

$gradle = Join-Path $PSScriptRoot 'gradlew.bat'
if (-not (Test-Path $gradle -PathType Leaf)) {
    throw 'gradlew.bat not found in the android directory.'
}

Push-Location $PSScriptRoot
try {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    & cmd.exe /c "`"$gradle`" --no-daemon :app:assembleRelease 2>&1"
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }

    $builtApk = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release.apk'
    if (-not (Test-Path $builtApk -PathType Leaf)) { throw 'Gradle did not produce the release APK.' }

    $destination = Join-Path $PSScriptRoot '../public/downloads/rcf-ikole-ushering.apk'
    Copy-Item -LiteralPath $builtApk -Destination $destination -Force

    $sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    $apksigner = Join-Path $sdk 'build-tools/35.0.0/apksigner.bat'
    $aapt = Join-Path $sdk 'build-tools/35.0.0/aapt.exe'
    & $apksigner verify --verbose --print-certs $destination
    if ($LASTEXITCODE -ne 0) { throw 'The release APK signature did not verify.' }
    $metadata = & $aapt dump badging $destination
    if ($LASTEXITCODE -ne 0) { throw 'Could not read release APK package metadata.' }
    if (($metadata -join "`n") -notmatch "package: name='com\.rcf\.ikole\.ushering' versionCode='3' versionName='1\.1\.0'") {
        throw 'Release APK package ID or version metadata is incorrect.'
    }
    if (($metadata -join "`n") -notmatch "application-label:'RCF Ikole'") {
        throw 'Release APK application name is incorrect.'
    }
    Write-Host "Signed release APK ready: $destination"
} finally {
    Pop-Location
}
