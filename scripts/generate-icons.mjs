/**
 * generate-icons.mjs
 * Generates PWA and Apple touch icon assets from the source logo.
 * Run with: node scripts/generate-icons.mjs
 *
 * Requires: npm install --save-dev sharp
 */

import { createRequire } from 'module'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

async function generateIcons() {
  // Try to import sharp — it ships with Next.js image optimisation so may already be present
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error(
      '❌  sharp is not installed.\n' +
      '    Run:  npm install --save-dev sharp\n' +
      '    Then re-run: node scripts/generate-icons.mjs'
    )
    process.exit(1)
  }

  const srcLogo = join(root, 'public', 'logo-backup.png')
  if (!existsSync(srcLogo)) {
    console.error(`❌  Source logo not found: ${srcLogo}`)
    process.exit(1)
  }

  const outDir = join(root, 'public', 'icons')
  mkdirSync(outDir, { recursive: true })

  const padding = 0.12  // 12% padding on each side — keeps logo inside adaptive-icon safe zone

  async function resizeWithPadding(srcPath, size, outPath) {
    const inner = Math.round(size * (1 - padding * 2))
    const buf = await sharp(srcPath)
      .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer()

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: buf, gravity: 'center' }])
      .png()
      .toFile(outPath)

    console.log(`  ✅  ${outPath.replace(root, '')}  (${size}×${size})`)
  }

  console.log('\n🎨  Generating RCF Ikole PWA icons from logo-backup.png …\n')

  // Standard PWA icons
  await resizeWithPadding(srcLogo, 192, join(outDir, 'icon-192.png'))
  await resizeWithPadding(srcLogo, 512, join(outDir, 'icon-512.png'))

  // Apple Touch Icon (no padding — iOS adds its own rounded mask)
  await sharp(srcLogo)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(outDir, 'apple-touch-icon.png'))
  console.log(`  ✅  /icons/apple-touch-icon.png  (180×180)`)

  console.log('\n✅  All icons generated successfully.\n')
}

generateIcons().catch((err) => {
  console.error('❌  Icon generation failed:', err)
  process.exit(1)
})
