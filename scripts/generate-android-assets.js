const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const realPngLogo = path.join(rootDir, 'public', 'logo-backup.png');

const mipmapFolders = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

for (const folder of mipmapFolders) {
  const targetDir = path.join(resDir, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy real PNG as launcher icons
  fs.copyFileSync(realPngLogo, path.join(targetDir, 'ic_launcher.png'));
  fs.copyFileSync(realPngLogo, path.join(targetDir, 'ic_launcher_round.png'));
}

// Ensure public/downloads directory exists
const downloadsDir = path.join(rootDir, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

console.log('Real PNG Android launcher icons generated successfully.');
