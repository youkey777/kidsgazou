import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#18181b"/>
      <stop offset="0.5" stop-color="#27272a"/>
      <stop offset="0.5" stop-color="#fbcfe8"/>
      <stop offset="1" stop-color="#f9a8d4"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <circle cx="160" cy="220" r="80" fill="#fbbf24"/>
    <circle cx="135" cy="200" r="14" fill="#18181b"/>
    <circle cx="185" cy="200" r="14" fill="#18181b"/>
    <path d="M 130 245 Q 160 270 190 245" stroke="#18181b" stroke-width="8" fill="none" stroke-linecap="round"/>
  </g>
  <g filter="url(#shadow)">
    <circle cx="350" cy="220" r="60" fill="#ec4899"/>
    <circle cx="350" cy="140" r="50" fill="#fbcfe8"/>
    <circle cx="290" cy="180" r="50" fill="#fbcfe8"/>
    <circle cx="410" cy="180" r="50" fill="#fbcfe8"/>
    <circle cx="320" cy="260" r="50" fill="#fbcfe8"/>
    <circle cx="380" cy="260" r="50" fill="#fbcfe8"/>
    <circle cx="350" cy="220" r="35" fill="#fde047"/>
  </g>
  <text x="256" y="430" font-size="56" text-anchor="middle" font-weight="bold" fill="#fff" font-family="system-ui,sans-serif">ルイ &amp; ミオ</text>
</svg>
`.trim()

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

const buf = Buffer.from(SVG)
for (const { name, size } of sizes) {
  const out = await sharp(buf).resize(size, size).png().toBuffer()
  await writeFile(`public/${name}`, out)
  console.log(`✓ public/${name}`)
}
