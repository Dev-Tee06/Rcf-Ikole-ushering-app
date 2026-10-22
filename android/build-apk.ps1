$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$buildTools = "$sdk\build-tools\34.0.0"
$androidJar = "$sdk\platforms\android-34\android.jar"
$aapt2 = "$buildTools\aapt2.exe"
$d8 = "$buildTools\d8.bat"
$zipalign = "$buildTools\zipalign.exe"
$apksigner = "$buildTools\apksigner.bat"
$javac = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\javac.exe"
$keytool = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin\keytool.exe"

Write-Host ">>> Starting Android APK Build for RCF Ikole Ushering..."

$buildDir = "android\build"
$compiledResDir = "$buildDir\compiled_res"
$genDir = "$buildDir\gen"
$classesDir = "$buildDir\classes"
$dexDir = "$buildDir\dex"
$unalignedApk = "$buildDir\unaligned.apk"
$alignedApk = "$buildDir\aligned.apk"
$finalApk = "public\downloads\rcf-ikole-ushering.apk"

# Ensure valid PNG launcher icons
$realPng = "public\logo-backup.png"
$mipmapFolders = @('mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi')
foreach ($f in $mipmapFolders) {
    $dir = "android\app\src\main\res\$f"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item -Force $realPng "$dir\ic_launcher.png"
    Copy-Item -Force $realPng "$dir\ic_launcher_round.png"
}

# Ensure clean build directories
Remove-Item -Recurse -Force $buildDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $compiledResDir | Out-Null
New-Item -ItemType Directory -Force -Path $genDir | Out-Null
New-Item -ItemType Directory -Force -Path $classesDir | Out-Null
New-Item -ItemType Directory -Force -Path $dexDir | Out-Null
New-Item -ItemType Directory -Force -Path "public\downloads" | Out-Null

# 1. Compile Resources with AAPT2
Write-Host "1/6. Compiling Android XML resources..."
& $aapt2 compile --dir "android\app\src\main\res" -o "$compiledResDir\res.zip"

# 2. Link Resources & Generate R.java
Write-Host "2/6. Linking resources & generating R.java..."
& $aapt2 link -o $unalignedApk `
    -I $androidJar `
    --manifest "android\app\src\main\AndroidManifest.xml" `
    --java $genDir `
    "$compiledResDir\res.zip" `
    --auto-add-overlay

# 3. Compile Java Source Code with javac
Write-Host "3/6. Compiling Java source files with javac..."
$javaFiles = @(
    "$genDir\com\rcf\ikole\ushering\R.java",
    "android\app\src\main\java\com\rcf\ikole\ushering\MainActivity.java"
)
& $javac -cp $androidJar -d $classesDir $javaFiles

# 4. Convert .class Bytecode to classes.dex with d8
Write-Host "4/6. Converting bytecode to classes.dex with d8..."
$classFiles = Get-ChildItem -Path $classesDir -Recurse -Filter *.class | ForEach-Object { "`"$($_.FullName)`"" }
$classArgs = $classFiles -join ' '
& cmd.exe /c "`"$d8`" --output `"$dexDir`" --lib `"$androidJar`" $classArgs"

# Add classes.dex into unaligned.apk
Write-Host "Packaging classes.dex into APK..."
$zipArchive = [System.IO.Compression.ZipFile]::Open((Resolve-Path $unalignedApk).Path, [System.IO.Compression.ZipArchiveMode]::Update)
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, (Resolve-Path "$dexDir\classes.dex").Path, "classes.dex")
$zipArchive.Dispose()

# 5. Align APK with zipalign
Write-Host "5/6. Aligning APK with zipalign..."
Remove-Item -Force $alignedApk -ErrorAction SilentlyContinue
& $zipalign -p -f -v 4 $unalignedApk $alignedApk | Out-Null

# 6. Generate Keystore & Sign APK with apksigner
Write-Host "6/6. Signing APK with apksigner..."
$keystore = "android\debug.keystore"
if (-not (Test-Path $keystore)) {
    & $keytool -genkey -v -keystore $keystore -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=RCF Ikole Ushering,O=RCF,C=NG"
}

Remove-Item -Force $finalApk -ErrorAction SilentlyContinue
& cmd.exe /c "`"$apksigner`" sign --ks `"$keystore`" --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out `"$finalApk`" `"$alignedApk`""

# Verify Signature
Write-Host "Verifying APK signature..."
& cmd.exe /c "`"$apksigner`" verify `"$finalApk`""

$apkSize = (Get-Item $finalApk).Length
Write-Host ">>> SUCCESS: Native Android APK generated at $finalApk ($([math]::Round($apkSize / 1KB, 1)) KB)"
