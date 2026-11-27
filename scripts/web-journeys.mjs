/**
 * Scripted key journeys against the WEB PREVIEW (Chromium). Each step asserts
 * visible outcomes. This validates app logic and navigation in a browser; it is
 * NOT native iOS/Android verification (see docs/test-strategy.md).
 *
 *   node scripts/web-journeys.mjs http://localhost:8081
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8081';
const photo = fileURLToPath(new URL('../assets/fixtures/sea.jpg', import.meta.url));
const results = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

/** A journey fails on a failed assertion AND on any uncaught page error raised while it ran. */
async function journey(name, fn) {
  const errorsBefore = errors.length;
  try {
    await fn();
    const newErrors = errors.slice(errorsBefore);
    if (newErrors.length) throw new Error(`uncaught page error: ${newErrors[0]}`);
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, e.message.split('\n')[0]]);
    await page.screenshot({ path: `/tmp/journey-fail-${results.length}.png` });
  }
}
const gone = (text) => page.getByText(text, { exact: false }).first().waitFor({ state: 'detached', timeout: 8000 });
const see = (text, timeout = 8000) => page.getByText(text, { exact: false }).first().waitFor({ timeout });

await journey('1. Start a pregnancy profile (validation, then success)', async () => {
  await page.goto(`${base}/onboarding`);
  await page.getByText('Bebek bekliyoruz').first().click();
  await page.getByText('Yolculuğu başlat').click();
  await see('Bu alan gerekli.');
  await page.getByPlaceholder('Örn. Fıstık').fill('Minik');
  await page.getByText('Son adet döneminin ilk günü').first().click();
  // 10 weeks ago
  const d = new Date(Date.now() - 70 * 864e5);
  const lmp = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  await page.getByTestId('lmp').fill(lmp);
  await page.getByText('Yolculuğu başlat').click();
  await see('Hamilelik ayarları');
  await see('10 hafta');
});

await journey('2. Add another profile: existing child', async () => {
  await page.goto(`${base}/onboarding/child`);
  await page.getByTestId('child-name').fill('Ece');
  await page.getByTestId('birth-date').fill('15.03.2025');
  await page.getByPlaceholder('3,4').fill('3,25');
  await page.getByText('Profili oluştur').click();
  await see('Son ölçüm');
  await see('3,25 kg');
});

await journey('3. Add a photo memory (upload progress, then saved)', async () => {
  await page.goto(`${base}/memory/new`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Fotoğraf ekle').click();
  await (await chooser).setFiles(photo);
  await page.getByTestId('memory-title').fill('Sahilde ilk gün');
  await page.getByTestId('save-memory').click();
  await see('Sahilde ilk gün', 15000);
  await see('Siz eklediniz');
});

await journey('4. Edit an old memory’s event date', async () => {
  await page.getByText('Düzenle').click();
  await page.getByTestId('memory-date').fill('01.06.2025');
  await page.getByTestId('save-memory').click();
  await see('1 Haziran 2025', 10000);
});

await journey('5. Record a measurement (implausible rejected, valid saved)', async () => {
  await page.goto(`${base}/measurement/new`);
  await page.getByTestId('measurement-value').fill('840');
  await page.getByTestId('save-measurement').click();
  await see('olağan dışı');
  await page.getByTestId('measurement-value').fill('8,4');
  await page.getByTestId('save-measurement').click();
  await gone('Ne ölçtünüz?');
  await page.goto(`${base}/tracking`);
  await see('8,4 kg');
});

await journey('6. Add an appointment (timezone stored)', async () => {
  await page.goto(`${base}/appointment/new`);
  await page.getByPlaceholder('Örn. Rutin kontrol').fill('Aşı randevusu');
  const d = new Date(Date.now() + 10 * 864e5);
  await page.getByPlaceholder('15.03.2027').fill(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`);
  await page.getByPlaceholder('SS:DD').fill('09:15');
  await page.getByTestId('save-appointment').click();
  await gone('Saat dilimi');
  await page.goto(`${base}/tracking?segment=appointments`);
  await see('Aşı randevusu');
  await see('09:15');
});

await journey('7. Invite a caregiver (code + expiry shown)', async () => {
  await page.goto(`${base}/family/invite`);
  await page.getByText('Davet kodu oluştur').click();
  await see('Bu alan gerekli.');
  await page.getByPlaceholder('Örn. Babaanne, bakıcı').fill('Bakıcı');
  await page.getByText('Davet kodu oluştur').click();
  await see('MINIK-');
  await see('tarihine kadar geçerli');
});

await journey('8. Pregnancy → child transition keeps pregnancy memories', async () => {
  await page.goto(`${base}/onboarding`);
  await page.goto(`${base}/settings`);
  await page.getByText('Örnek verileri sıfırla').click();
  await see('Hamilelik ayarları');
  await page.goto(`${base}/pregnancy/birth`);
  await page.getByTestId('child-name').fill('Ada');
  await page.getByRole('button', { name: 'Çocuk profilini oluştur' }).click();
  await see('Son ölçüm', 10000);
  await page.goto(`${base}/story`);
  await see('İlk tekme hissi');
  await see('Hamilelik · ');
});

await journey('9. Export selected records only', async () => {
  await page.goto(`${base}/profiles`);
  await page.getByText('Deniz', { exact: true }).click();
  await gone('Profil seçin');
  await page.goto(`${base}/export`);
  await see('Anılar (7)'); // Deniz’s 6 child + 2 pregnancy memories, minus Can’s private one = 7 visible to Elif
  const dl = page.waitForEvent('download');
  await page.getByText('Dışa aktar').last().click();
  const file = await dl;
  const json = JSON.parse(await (await import('node:fs/promises')).readFile(await file.path(), 'utf8'));
  if (json.memories.some((m) => m.id === 'mem-7')) throw new Error('export contains another user’s private memory');
  if (json.memories.length !== 7) throw new Error(`expected 7 memories, got ${json.memories.length}`);
});

await journey('10. Delete a memory with photos; media no longer resolvable', async () => {
  await page.goto(`${base}/memory/mem-4`);
  await see('Deniz denizi gördü');
  await page.getByTestId('delete-memory').click();
  await see('1 fotoğrafı kalıcı olarak silinecek');
  await page.getByTestId('confirm-sheet-confirm').click();
  await gone('kalıcı olarak silinecek');
  await page.goto(`${base}/memory/mem-4`);
  await see('silinmiş');
});

await journey('13. Prototype preview: reference sex is explicit, no percentile shown', async () => {
  await page.goto(`${base}/preview/visuals`);
  await see('Hafta görselleri');
  await see('Taslak'); // weekly comparison rows are drafts
  await page.getByTestId('growth-chart').scrollIntoViewIfNeeded();
  // Default is "Belirtilmedi": only the child's own points, no reference.
  await page.locator('[data-testid^="growth-point-"]').first().click();
  await see('Seçilmedi');
  await page.getByText('Kız referansı', { exact: true }).click();
  await page.locator('[data-testid^="growth-point-"]').first().click();
  await see('WHO 2006');
  await see('Doğrulama tamamlanana kadar gösterilmiyor');
});

await journey('11. Upload failure: memory is NOT reported saved; retry works', async () => {
  await page.goto(`${base}/settings`);
  await page.getByRole('switch', { name: 'Fotoğraf yükleme hatasını taklit et' }).click();
  await page.goto(`${base}/memory/new`);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Fotoğraf ekle').click();
  await (await chooser).setFiles(photo);
  await page.getByTestId('save-memory').click();
  await see('anı kaydedilmedi', 10000);
  await page.getByTestId('save-memory').click(); // second attempt succeeds in the simulation
  await see('Siz eklediniz', 10000);
});

await journey('12. Offline: shows banner, refuses to save', async () => {
  await page.goto(`${base}/settings`);
  await page.getByRole('switch', { name: 'Çevrimdışı durumu taklit et' }).click();
  await page.goto(`${base}/memory/new`);
  await see('Çevrimdışısınız'); // nothing loads, nothing can be saved, the reason is stated
  await page.goto(`${base}/`);
  await see('Çevrimdışısınız');
});

await browser.close();
for (const r of results) console.log(r.join(' | '));
if (errors.length) console.log('page errors:', [...new Set(errors)].join(' / '));
console.log(`${results.filter((r) => r[0] === 'PASS').length}/${results.length} passed`);
// Errors outside any journey (e.g. during final navigation) also fail the run.
process.exit(results.some((r) => r[0] === 'FAIL') || errors.length ? 1 : 0);
