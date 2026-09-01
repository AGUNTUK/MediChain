/**
 * MediChain PWA Icon & Favicon Generator
 * 
 * Reusable utility to generate all required square and maskable PWA icons, 
 * Apple touch icons, and favicons from the base logo (public/logo.png).
 * 
 * Usage:
 *   npx tsx scripts/generate_pwa_icons.ts
 *   or: npm run generate:icons
 */

import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generatePWAIcons() {
  const logoPath = path.resolve('public/logo.png');
  const iconsDir = path.resolve('public/icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Loading base logo from:', logoPath);
  const logo = await Jimp.read(logoPath);

  // Helper to create standard square icon with transparent background (contain)
  async function createSquareIcon(size: number, outPath: string) {
    const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
    const resizedLogo = logo.clone();
    
    // Maintain aspect ratio with minor padding
    const padding = Math.round(size * 0.05);
    const targetSize = size - padding * 2;
    resizedLogo.contain({ w: targetSize, h: targetSize });

    const x = Math.floor((size - resizedLogo.bitmap.width) / 2);
    const y = Math.floor((size - resizedLogo.bitmap.height) / 2);
    canvas.composite(resizedLogo, x, y);

    await canvas.write(outPath as `${string}.${string}`);
    console.log(`✓ Generated ${outPath} (${size}x${size})`);
  }

  // Helper to create maskable icon with safe zone (15% padding on background)
  async function createMaskableIcon(size: number, outPath: string) {
    // #17121F background for maskable app icons
    const canvas = new Jimp({ width: size, height: size, color: 0x17121FFF });
    const resizedLogo = logo.clone();
    
    // Maskable icons require 20% safe zone padding around key artwork
    const targetSize = Math.round(size * 0.70);
    resizedLogo.contain({ w: targetSize, h: targetSize });

    const x = Math.floor((size - resizedLogo.bitmap.width) / 2);
    const y = Math.floor((size - resizedLogo.bitmap.height) / 2);
    canvas.composite(resizedLogo, x, y);

    await canvas.write(outPath as `${string}.${string}`);
    console.log(`✓ Generated Maskable ${outPath} (${size}x${size})`);
  }

  console.log('Generating PWA Icons...');
  await createSquareIcon(192, path.join(iconsDir, 'icon-192.png'));
  await createSquareIcon(512, path.join(iconsDir, 'icon-512.png'));
  await createSquareIcon(180, path.join(iconsDir, 'apple-touch-icon.png'));
  await createSquareIcon(64, path.resolve('public/favicon.png'));
  await createMaskableIcon(192, path.join(iconsDir, 'icon-maskable-192.png'));
  await createMaskableIcon(512, path.join(iconsDir, 'icon-maskable-512.png'));

  console.log('All PWA icons generated successfully!');
}

generatePWAIcons().catch(err => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
