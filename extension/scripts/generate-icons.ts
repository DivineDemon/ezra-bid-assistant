import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { appIconSvg } from "../src/assets/atom-icon.ts";

const sizes = [16, 32, 48, 128] as const;
const outDir = path.resolve(import.meta.dir, "../public/icons");

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const svg = appIconSvg(size);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(outDir, `icon-${size}.png`), png);
}

const faviconSvg = appIconSvg(32);
await writeFile(path.join(outDir, "favicon.svg"), faviconSvg);

console.log(`Generated ${sizes.length} PNG icons and favicon.svg in public/icons/`);
