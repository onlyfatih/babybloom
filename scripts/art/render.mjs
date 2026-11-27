/**
 * Renders hand-authored SVG artwork (art/pregnancy/src/*.svg) to transparent
 * PNG at fixed square sizes with Chromium. Output: assets/pregnancy/<id>@<n>x.png
 *
 *   node scripts/art/render.mjs [id ...]
 *
 * SVG filters (lighting, turbulence) are used only at authoring time; the app
 * ships the raster output, so native SVG filter support does not matter.
 */
import { createRequire } from 'node:module';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const srcDir = 'art/pregnancy/src';
const outDir = 'assets/pregnancy';
const BASE = 320; // logical px; @2x = 640, @3x = 960
const ids = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => f.endsWith('.svg') && (!ids.length || ids.includes(basename(f, '.svg'))));
const browser = await chromium.launch();
for (const scale of [2, 3]) {
  const page = await browser.newPage({ viewport: { width: BASE, height: BASE }, deviceScaleFactor: scale });
  for (const f of files) {
    const svg = await readFile(join(srcDir, f), 'utf8');
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${BASE}" height="${BASE}" `)}</body></html>`);
    await page.screenshot({ path: join(outDir, `${basename(f, '.svg')}@${scale}x.png`), omitBackground: true, clip: { x: 0, y: 0, width: BASE, height: BASE } });
    console.log(`${basename(f, '.svg')}@${scale}x.png`);
  }
  await page.close();
}
await browser.close();
