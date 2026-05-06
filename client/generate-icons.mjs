// node generate-icons.mjs
import sharp from '../server/node_modules/sharp/lib/index.js';
import { writeFileSync } from 'fs';

const svg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="url(#g)"/>
  <text x="50%" y="54%" font-family="Arial,sans-serif" font-size="${size*0.52}" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="middle">E</text>
</svg>`);

for (const size of [192, 512]) {
  await sharp(svg(size)).png().toFile(`public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}
