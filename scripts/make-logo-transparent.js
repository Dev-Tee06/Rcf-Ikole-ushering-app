const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function makeTransparent() {
  const inputPath = path.join(process.cwd(), 'public', 'logo.png');
  const backupPath = path.join(process.cwd(), 'public', 'logo-backup.png');

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const outputData = Buffer.from(data);

  // Flood-fill or threshold outer white pixels
  // Any pixel near white (r > 235, g > 235, b > 235) will be made transparent
  // To handle antialiasing, we can calculate alpha based on distance from white
  for (let i = 0; i < outputData.length; i += channels) {
    const r = outputData[i];
    const g = outputData[i + 1];
    const b = outputData[i + 2];

    // Check if pixel is white or near-white
    const minVal = Math.min(r, g, b);
    if (minVal > 240) {
      outputData[i + 3] = 0; // Completely transparent
    } else if (minVal > 210) {
      // Smooth feathering
      const alpha = Math.round(((240 - minVal) / 30) * 255);
      outputData[i + 3] = Math.min(outputData[i + 3], alpha);
    }
  }

  await sharp(outputData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(inputPath + '.tmp');

  fs.renameSync(inputPath + '.tmp', inputPath);
  console.log('Successfully made logo.png transparent!');
}

makeTransparent().catch(console.error);
