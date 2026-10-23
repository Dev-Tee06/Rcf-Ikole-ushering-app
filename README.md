This is the RCF Ikole Ushering Unit web app and Android WebView client.

## Android release APK

The website serves `public/downloads/rcf-ikole-ushering.apk` at `/downloads/rcf-ikole-ushering.apk`. The response headers are configured in `next.config.ts` to use the Android APK MIME type and a stable attachment filename.

Build a signed release on a Windows machine with Android SDK build tools, JDK 17, and Gradle 8.2 or newer installed. Create the long-lived release keystore once and back it up securely outside this repository:

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\rcf-ushering-release.jks" -alias rcf-ushering -keyalg RSA -keysize 3072 -validity 10000
$env:RCF_RELEASE_STORE_FILE = "$env:USERPROFILE\rcf-ushering-release.jks"
$storeSecret = Read-Host 'Keystore password' -AsSecureString
$env:RCF_RELEASE_STORE_PASSWORD = [Net.NetworkCredential]::new('', $storeSecret).Password
$env:RCF_RELEASE_KEY_ALIAS = 'rcf-ushering'
$keySecret = Read-Host 'Key password' -AsSecureString
$env:RCF_RELEASE_KEY_PASSWORD = [Net.NetworkCredential]::new('', $keySecret).Password
./android/build-apk.ps1
```

Keep the keystore and its passwords in a secure backup/password manager. Never commit them or place them in client-visible environment variables. Keep the same keystore for every update; Android rejects upgrades signed by a different key. The APK currently present in the repository was signed with the former debug keystore, so an app installed from that artifact cannot be upgraded in place with a newly generated release key. Arrange a clean reinstall or securely migrate the old signing identity before publishing the first release-signed update.

The production WebView host is `https://e-ushering-app.vercel.app`. Deploy the site and APK together so the stable download path serves the same signed release artifact built above.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
