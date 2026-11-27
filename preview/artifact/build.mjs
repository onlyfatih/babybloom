/**
 * Builds the single-file review page (preview/artifact/out/minik-atlas-ornekler.html)
 * that was published as the Claude artifact for art-direction review.
 *
 *   node preview/artifact/build.mjs           # build
 *   node preview/artifact/build.mjs --check   # build, open in Chromium, fail on page errors
 *
 * Inputs (all from the repo, nothing downloaded):
 *   - preview/artifact/template.html: page source with placeholders
 *     __PLUM__, __BANANA__, __PUMPKIN__ (image data URIs) and __WHO__ (LMS JSON).
 *   - assets/pregnancy/<id>@2x.png: rendered by scripts/art/render.mjs.
 *     Re-encoded to WebP (quality 0.82) in Chromium so the page stays small.
 *   - data-pipeline/growth/fixtures/who-wfa-{girls,boys}-0-24mo-pdf.csv:
 *     the transcribed WHO monthly table. Unvalidated prototype data; the page
 *     shows no percentiles.
 */
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(import.meta.dirname, '../..');
const outDir = resolve(root, 'preview/artifact/out');
const outFile = resolve(outDir, 'minik-atlas-ornekler.html');

function lmsRows(csv) {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const cols = head.split(',');
  const at = (name) => cols.indexOf(name);
  return lines.map((l) => {
    const v = l.split(',').map(Number);
    return [v[at('Month')], v[at('L')], v[at('M')], v[at('S')]];
  });
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const toWebp = async (png) =>
    page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.82);
    }, png.toString('base64'));

  let html = await readFile(resolve(root, 'preview/artifact/template.html'), 'utf8');
  for (const id of ['plum', 'banana', 'pumpkin']) {
    const uri = await toWebp(await readFile(resolve(root, `assets/pregnancy/${id}@2x.png`)));
    if (!uri.startsWith('data:image/webp')) throw new Error('Chromium did not encode WebP');
    html = html.replace(`__${id.toUpperCase()}__`, uri);
  }
  const fx = (f) => readFile(resolve(root, 'data-pipeline/growth/fixtures', f), 'utf8');
  const who = { female: lmsRows(await fx('who-wfa-girls-0-24mo-pdf.csv')), male: lmsRows(await fx('who-wfa-boys-0-24mo-pdf.csv')) };
  html = html.replace('__WHO__', JSON.stringify(who));
  if (/__[A-Z]+__/.test(html)) throw new Error('unfilled placeholder in template');

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, html);
  console.log(`wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB)`);

  if (process.argv.includes('--check')) {
    const errors = [];
    for (const width of [320, 1280]) {
      const p = await browser.newPage({ viewport: { width, height: 900 } });
      p.on('pageerror', (e) => errors.push(`${width}px: ${e.message}`));
      await p.goto(pathToFileURL(outFile).href);
      await p.waitForTimeout(500);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) errors.push(`${width}px: horizontal overflow`);
      await p.close();
    }
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else console.log('check passed: no page errors, no horizontal overflow at 320 and 1280 px');
  }
} finally {
  await browser.close();
}
