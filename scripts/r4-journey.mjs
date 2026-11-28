/**
 * R4 in the WEB build against the LOCAL Supabase stack, no demo data:
 * pregnancy onboarding → pregnancy memory → birth (memory kept) → second
 * child → profile switch → edit details → replace/remove photo → archive and
 * restore (owner) → measurement add/correct/chart/delete → appointment with
 * explicit time zone (create/edit/delete) → reload keeps everything.
 *
 * Browser evidence only; not native verification (docs/test-strategy.md).
 *
 *   node scripts/r4-journey.mjs http://localhost:8082 http://127.0.0.1:54324
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8082';
const mailpit = process.argv[3] ?? 'http://127.0.0.1:54324';
const email = `r4-${randomUUID().slice(0, 8)}@example.test`;
const photo = fileURLToPath(new URL('../assets/fixtures/sea.jpg', import.meta.url));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const visible = (text) => page.getByText(text, { exact: false }).filter({ visible: true }).first();
const see = (text, timeout = 10000) => visible(text).waitFor({ timeout });
const gone = (text, timeout = 10000) => page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'detached', timeout }).catch(async () => {
  if (await page.getByText(text, { exact: false }).filter({ visible: true }).count()) throw new Error(`still visible: ${text}`);
});
const dmy = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};
const steps = [];
async function step(name, fn) {
  try {
    await fn();
    steps.push(['PASS', name]);
  } catch (e) {
    steps.push(['FAIL', name, e.message.split('\n')[0]]);
    await page.screenshot({ path: `/tmp/r4-journey-fail-${steps.length}.png` });
    throw e;
  }
}

async function messageIds() {
  const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  return ((await res.json()).messages ?? []).map((m) => m.ID);
}
async function codeAfter(seen) {
  for (let i = 0; i < 50; i++) {
    const fresh = (await messageIds()).filter((id) => !seen.includes(id));
    if (fresh.length) {
      const msg = await (await fetch(`${mailpit}/api/v1/message/${fresh[0]}`)).json();
      const code = /(\d{6})/.exec(msg.Text || msg.HTML)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('no code mail');
}
async function choosePhoto(testId) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId(testId).click();
  await (await chooser).setFiles(photo);
}
const avatarImages = () => page.locator('img').evaluateAll((imgs) => imgs.filter((i) => i.checkVisibility() && i.complete && i.naturalWidth > 0 && i.src.includes('/storage/v1/object/sign/')).length);

try {
  await step('Sign in with an emailed code and create a family', async () => {
    await page.goto(`${base}/`);
    const seen = await messageIds();
    await page.getByTestId('email').fill(email);
    await page.getByTestId('send-code').click();
    await see('6 haneli bir kod gönderdik');
    await page.getByTestId('code').fill(await codeAfter(seen));
    await page.getByTestId('verify-code').click();
    await page.getByTestId('verify-code').waitFor({ state: 'detached', timeout: 10000 });
    await page.getByTestId('display-name').fill('Ece');
    await page.getByTestId('create-family').click();
    await see('Nereden başlıyoruz?');
  });

  await step('Pregnancy onboarding (validation, then 10 weeks by LMP)', async () => {
    await page.getByText('Bebek bekliyoruz').first().click();
    await page.getByTestId('start-journey').click();
    await see('Bu alan gerekli.');
    await page.getByPlaceholder('Örn. Fıstık').fill('Fıstık');
    await page.getByText('Son adet döneminin ilk günü').first().click();
    await page.getByTestId('lmp').fill(dmy(-70));
    await page.getByTestId('start-journey').click();
    await see('Hamilelik ayarları', 15000);
    await see('10 hafta');
  });

  await step('Pregnancy memory is saved on the server', async () => {
    await page.goto(`${base}/memory/new`);
    await page.getByTestId('memory-title').fill('İlk tekme');
    await page.getByTestId('save-memory').click();
    await page.getByTestId('save-memory').waitFor({ state: 'detached', timeout: 15000 });
  });

  await step('Birth: child profile created, pregnancy memory kept in the story', async () => {
    await page.goto(`${base}/pregnancy/birth`);
    await page.getByTestId('child-name').fill('Ada');
    await page.getByPlaceholder('3,4').fill('3,3');
    await page.getByRole('button', { name: 'Çocuk profilini oluştur' }).click();
    await see('Son ölçüm', 15000);
    await see('3,3 kg');
    await page.goto(`${base}/story`);
    await see('İlk tekme', 15000);
    await see('Hamilelik · ');
  });

  await step('Second child, then switch profiles', async () => {
    await page.goto(`${base}/onboarding/child`);
    await page.getByTestId('child-name').fill('Ece Kurgu');
    await page.getByTestId('birth-date').fill('15.03.2025');
    await page.getByText('Profili oluştur').click();
    await see('Son ölçüm', 15000);
    await page.goto(`${base}/profiles`);
    await page.getByText('Ada', { exact: true }).click();
    await gone('Profil seçin');
    await page.goto(`${base}/`);
    await see('3,3 kg', 15000);
  });

  await step('Edit name, birth date and time; invalid time rejected', async () => {
    await page.getByTestId('manage-child').click();
    await page.getByTestId('child-name').fill('Ada Nur');
    await page.getByTestId('birth-time').fill('25:99');
    await page.getByTestId('save-child').click();
    await see('saat');
    await page.getByTestId('birth-time').fill('04:30');
    await page.getByTestId('birth-date').fill(dmy(-5));
    await page.getByTestId('save-child').click();
    await see('Değişiklikler kaydedildi.', 15000);
    await page.goto(`${base}/`);
    await see('5 günlük', 15000);
  });

  await step('Replace the profile photo twice, then remove it', async () => {
    await page.getByTestId('manage-child').click();
    await choosePhoto('child-photo');
    await see('Profil fotoğrafı güncellendi.', 20000);
    await page.waitForFunction(() => [...document.images].some((i) => i.checkVisibility() && i.complete && i.naturalWidth > 0 && i.src.includes('/storage/v1/object/sign/')), null, { timeout: 15000 });
    const firstSrc = await page.locator('img').evaluateAll((imgs) => imgs.find((i) => i.checkVisibility() && i.src.includes('/object/sign/'))?.src);
    await choosePhoto('child-photo');
    await page.waitForFunction((prev) => [...document.images].some((i) => i.checkVisibility() && i.complete && i.naturalWidth > 0 && i.src.includes('/object/sign/') && i.src.split('?')[0] !== prev.split('?')[0]), firstSrc, { timeout: 20000 });
    // The replaced object is no longer served to the app.
    await page.getByTestId('child-photo-remove').click();
    await page.getByTestId('child-photo-remove').waitFor({ state: 'detached', timeout: 15000 });
    if (await avatarImages()) throw new Error('photo still shown after removal');
  });

  await step('Archive (owner) and restore; archived label in the switcher', async () => {
    await page.getByTestId('archive-child').click();
    await page.getByTestId('confirm-sheet-confirm').click();
    await see('Bu profil arşivlendi.', 15000);
    await page.goto(`${base}/profiles`);
    await see('Çocuk · Arşivlendi');
    await page.goBack();
    await page.getByTestId('unarchive-child').click();
    await page.getByTestId('archive-child').waitFor({ timeout: 15000 });
    await gone('Bu profil arşivlendi.');
  });

  await step('Measurement: add, chart with two points, correct, delete', async () => {
    await page.goto(`${base}/measurement/new`);
    await page.getByTestId('measurement-value').fill('3,6');
    await page.getByTestId('measurement-date').fill(dmy(-1));
    await page.getByTestId('save-measurement').click();
    await page.getByTestId('save-measurement').waitFor({ state: 'detached', timeout: 15000 });
    await page.goto(`${base}/tracking`);
    await see('3,6 kg', 15000);
    await see('Kayıtlarınız'); // chart: birth weight + new value
    await page.getByRole('button', { name: /3,6 kg/ }).click();
    await page.getByTestId('measurement-value').fill('3,65');
    await page.getByTestId('save-measurement').click();
    await page.getByTestId('save-measurement').waitFor({ state: 'detached', timeout: 15000 });
    await see('3,65 kg', 15000);
    await page.getByRole('button', { name: /3,65 kg/ }).click();
    await see('tarihinde düzeltildi');
    await page.getByTestId('delete-measurement').click();
    await page.getByTestId('confirm-sheet-confirm').click();
    await page.getByTestId('delete-measurement').waitFor({ state: 'detached', timeout: 15000 });
    await gone('3,65 kg');
    await see('3,3 kg');
  });

  await step('Appointment: create with time zone, edit, delete', async () => {
    await page.goto(`${base}/appointment/new`);
    await see('Saat dilimi');
    await see('Türkiye Standart Saati (cihaz)');
    await page.getByPlaceholder('Örn. Rutin kontrol').fill('Aşı randevusu');
    await page.getByPlaceholder('15.03.2027').fill(dmy(10));
    await page.getByPlaceholder('SS:DD').fill('09:15');
    await page.getByTestId('save-appointment').click();
    await page.getByTestId('save-appointment').waitFor({ state: 'detached', timeout: 15000 });
    await page.goto(`${base}/tracking?segment=appointments`);
    await see('Aşı randevusu', 15000);
    await see('09:15');
    await page.getByText('Aşı randevusu').first().click();
    await page.getByPlaceholder('SS:DD').fill('10:40');
    await page.getByTestId('save-appointment').click();
    await page.getByTestId('save-appointment').waitFor({ state: 'detached', timeout: 15000 });
    await see('10:40', 15000);
    await page.getByText('Aşı randevusu').first().click();
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.getByTestId('confirm-sheet-confirm').click();
    await page.getByTestId('save-appointment').waitFor({ state: 'detached', timeout: 15000 });
    await gone('Aşı randevusu');
  });

  await step('Reload (relaunch): edits persisted on the server', async () => {
    await page.reload();
    await page.goto(`${base}/`);
    await see('5 günlük', 15000);
    await page.goto(`${base}/profiles`);
    await see('Ada Nur');
    await see('Ece Kurgu');
    if (await page.getByText('Çocuk · Arşivlendi').filter({ visible: true }).count()) throw new Error('child still archived after restore');
  });
} catch {
  // reported below
}
await browser.close();
for (const s of steps) console.log(s.join(' | '));
if (errors.length) console.log('page errors:', errors.slice(0, 5).join(' / '));
process.exit(steps.every((s) => s[0] === 'PASS') && steps.length === 11 ? 0 : 1);
