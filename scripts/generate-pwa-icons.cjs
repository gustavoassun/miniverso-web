// Rasterização dos ícones: node scripts/generate-pwa-icons.cjs <caminho-do-sharp>
// Ferramenta de desenvolvimento; não é uma dependência do aplicativo.
const sharp = require(process.argv[2] || 'sharp');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const output = path.join(__dirname, '../frontend/public/icons');
const svg = path.join(__dirname, '../frontend/public/miniverso-icon.svg');
async function generate() {
  await mkdir(output, { recursive: true });
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(path.join(output, `pwa-${size}.png`));
  }
  await sharp(svg).resize(180, 180).flatten({ background: '#211747' }).png().toFile(path.join(output, 'apple-touch-icon.png'));
  const inset = await sharp(svg).resize(360, 360).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#211747' } })
    .composite([{ input: inset, left: 76, top: 76 }]).png().toFile(path.join(output, 'pwa-maskable-512.png'));
}
generate().catch(error => { console.error(error); process.exitCode = 1; });
