/**
 * Renders key screens of the WEB PREVIEW with Playwright/Chromium at phone sizes.
 * This checks layout and copy only; it is not evidence of native iOS/Android behavior.
 *
 *   npx expo export --platform web --output-dir dist
 *   node scripts/serve-web.mjs dist 8081 &
 *   node scripts/screenshots.mjs http://localhost:8081 docs/screenshots
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
// Uses the project's playwright if installed, otherwise a globally available one.
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8081';
const out = process.argv[3] ?? 'docs/screenshots';
const scale = Number(process.env.SCALE ?? 2);
const devices = [
  { name: 'small', width: 320, height: 640 }, // iPhone SE (1st gen) / small Android
  { name: 'phone', width: 393, height: 852 }, // iPhone 15/16
];
const fontScale = Number(process.env.FONT_SCALE ?? 1);

await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function shot(page, name, device) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${device.name}-${name}.png`, fullPage: process.env.FULL === '1' });
  console.log(`${device.name}-${name}.png`);
}

for (const device of devices) {
  const ctx = await browser.newContext({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: scale, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  if (fontScale !== 1)
    await page.addInitScript((s) => {
      // documentElement can be null this early; apply once it exists.
      const apply = () => document.documentElement && (document.documentElement.style.fontSize = `${s * 100}%`);
      if (!apply()) document.addEventListener('readystatechange', apply, { once: true });
    }, fontScale);

  await page.goto(`${base}/onboarding`);
  await page.waitForSelector('text=Örnek aileyle göz at');
  await shot(page, '01-welcome', device);

  await page.goto(`${base}/onboarding/pregnancy`);
  await page.waitForSelector('text=Yolculuğu başlat');
  await page.getByText('Yolculuğu başlat').click();
  await shot(page, '02-pregnancy-onboarding-errors', device);

  await page.goto(`${base}/onboarding`);
  await page.getByText('Örnek aileyle göz at').click();
  await page.waitForSelector('text=Hamilelik ayarları');
  await shot(page, '03-pregnancy-home', device);

  await page.goto(`${base}/week/24`);
  await page.waitForSelector('text=Sesler, hareketler');
  await shot(page, '04-week-24', device);
  await page.goto(`${base}/week/25`);
  await page.waitForSelector('text=İçerik hazırlanıyor');
  await shot(page, '05-week-missing', device);

  await page.goto(`${base}/profiles`);
  await page.waitForSelector('text=Profil seçin');
  await shot(page, '06-profile-switcher', device);
  await page.getByText('Deniz', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.goto(`${base}/`);
  await page.waitForSelector('text=Son ölçüm');
  await shot(page, '07-child-home', device);

  await page.goto(`${base}/story`);
  await page.waitForSelector('text=Lavanta tarlası');
  await shot(page, '08-timeline', device);

  await page.goto(`${base}/memory/mem-3`);
  await page.waitForSelector('text=Eve ilk gün');
  await shot(page, '09-memory-detail', device);

  await page.goto(`${base}/memory/new`);
  await page.waitForSelector('text=Ne oldu?');
  await page.getByTestId('save-memory').click();
  await shot(page, '10-memory-editor-errors', device);

  await page.goto(`${base}/tracking`);
  await page.waitForSelector('text=Kayıtlarınız');
  await shot(page, '11-measurements', device);

  await page.goto(`${base}/measurement/new`);
  await page.waitForSelector('text=Ne ölçtünüz?');
  await page.getByTestId('measurement-value').fill('840');
  await page.getByText('Kaydet').click();
  await shot(page, '12-measurement-implausible', device);

  await page.goto(`${base}/tracking?segment=appointments`);
  await page.waitForSelector('text=Yaklaşan');
  await shot(page, '13-appointments', device);

  await page.goto(`${base}/appointment/ap-1`);
  await page.waitForSelector('text=Saat dilimi');
  await shot(page, '14-appointment-edit', device);

  await page.goto(`${base}/family`);
  await page.waitForSelector('text=Üyeler');
  await shot(page, '15-family', device);

  await page.goto(`${base}/family/invite`);
  await page.waitForSelector('text=Bu kişi kim?');
  await shot(page, '16-invite', device);

  await page.goto(`${base}/settings`);
  await page.waitForSelector('text=Bildirimler');
  await shot(page, '17-settings', device);

  await page.goto(`${base}/export`);
  await page.waitForSelector('text=Dahil et');
  await shot(page, '18-export', device);

  await page.goto(`${base}/add`);
  await page.waitForSelector('text=Ne eklemek istersiniz?');
  await shot(page, '19-add-sheet', device);

  // prototype preview: temporary artwork samples + growth chart prototype
  await page.goto(`${base}/preview/visuals`);
  await page.waitForSelector('text=Hafta görselleri');
  await shot(page, '22-preview-weeks', device);
  await page.evaluate(() => document.querySelector('[data-testid="growth-chart"]')?.scrollIntoView({ block: 'center' }));
  await shot(page, '23-preview-growth-chart', device);

  // back to pregnancy for manage + birth flows
  await page.goto(`${base}/profiles`);
  await page.getByText('Fıstık', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.goto(`${base}/pregnancy/manage`);
  await page.waitForSelector('text=Bebeğimiz doğdu');
  await shot(page, '20-pregnancy-manage', device);
  await page.goto(`${base}/pregnancy/birth`);
  await page.waitForSelector('text=Hoş geldin minik');
  await shot(page, '21-birth', device);

  await ctx.close();
}
await browser.close();
