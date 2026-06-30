import sharp from 'sharp'
import { writeFile, readFile } from 'node:fs/promises'

const SOURCE = 'scripts/tung-source.jpg'

const TEXT_SVG = (size) => {
  const charSize = Math.round(size * 0.18)
  const ampSize = Math.round(size * 0.13)
  const y = Math.round(size * 0.95)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.round(size * 0.006)}" stdDeviation="${Math.round(size * 0.008)}" flood-color="#fff" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="${Math.round(size * 0.012)}" stdDeviation="${Math.round(size * 0.014)}" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <text x="50%" y="${y}" text-anchor="middle"
        font-family="'Hiragino Maru Gothic ProN','Yu Gothic UI',sans-serif"
        font-weight="900" font-size="${charSize}" fill="#831843" filter="url(#ds)"
        stroke="#fff" stroke-width="${Math.round(size * 0.012)}" paint-order="stroke fill">ルイ <tspan font-size="${ampSize}" fill="#be185d">&amp;</tspan> ミオ</text>
</svg>`
}

async function buildIcon(size, outPath) {
  const charImg = await sharp(SOURCE)
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), { fit: 'contain' })
    .toBuffer()

  // base gradient background
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fef3c7"/>
        <stop offset="0.5" stop-color="#fce7f3"/>
        <stop offset="1" stop-color="#f9a8d4"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`

  const composed = await sharp(Buffer.from(bgSvg))
    .composite([
      {
        input: charImg,
        gravity: 'north',
        top: Math.round(size * 0.02),
        left: Math.round(size * 0.11),
      },
      {
        input: Buffer.from(TEXT_SVG(size)),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer()

  await writeFile(outPath, composed)
  console.log(`✓ ${outPath} (${size}x${size})`)
}

await buildIcon(512, 'public/pwa-512x512.png')
await buildIcon(192, 'public/pwa-192x192.png')
await buildIcon(180, 'public/apple-touch-icon.png')

// favicon.svg — use embedded image data
const sourceBuf = await readFile(SOURCE)
const sourceB64 = sourceBuf.toString('base64')
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fef3c7"/>
      <stop offset="0.5" stop-color="#fce7f3"/>
      <stop offset="1" stop-color="#f9a8d4"/>
    </linearGradient>
    <filter id="ds">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#fff" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <image x="56" y="10" width="400" height="400" href="data:image/jpeg;base64,${sourceB64}"/>
  <text x="50%" y="486" text-anchor="middle"
        font-family="'Hiragino Maru Gothic ProN','Yu Gothic UI',sans-serif"
        font-weight="900" font-size="92" fill="#831843" filter="url(#ds)"
        stroke="#fff" stroke-width="6" paint-order="stroke fill">ルイ <tspan font-size="66" fill="#be185d">&amp;</tspan> ミオ</text>
</svg>`
await writeFile('public/favicon.svg', faviconSvg)
console.log('✓ public/favicon.svg')
