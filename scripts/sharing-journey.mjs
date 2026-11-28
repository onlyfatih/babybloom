/**
 * R3 two-account journey in the WEB build against the LOCAL Supabase stack.
 * Two separate browser contexts = two devices with independent sessions.
 *
 * A: sign in, family, child, photo memory → invitation code
 * B: sign in, join with the code, sees A's memory and photo
 * A: private memory → B cannot see it
 * B: adds a memory → A sees it
 * A: revokes B → B is moved out of the family with a notice
 *
 * Browser evidence only; not native verification. Server-side negative
 * checks (direct data calls, storage) are in backend/tests/*.test.ts.
 *
 *   node scripts/sharing-journey.mjs http://localhost:8082 http://127.0.0.1:54324
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8082';
const mailpit = process.argv[3] ?? 'http://127.0.0.1:54324';
const photo = fileURLToPath(new URL('../assets/fixtures/sea.jpg', import.meta.url));
const run = randomUUID().slice(0, 6);

const browser = await chromium.launch();
const errors = [];
async function device(label) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  return { page, email: `${label}-${run}@example.test`, label };
}
const see = (d, text, timeout = 12000) => d.page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ timeout });
const absent = async (d, text) => {
  await d.page.waitForTimeout(800);
  if (await d.page.getByText(text, { exact: false }).filter({ visible: true }).count()) throw new Error(`${d.label} can see "${text}"`);
};

async function messageIds(email) {
  const res = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  return ((await res.json()).messages ?? []).map((m) => m.ID);
}
async function codeAfter(email, seen) {
  for (let i = 0; i < 50; i++) {
    const fresh = (await messageIds(email)).filter((id) => !seen.includes(id));
    if (fresh.length) {
      const msg = await (await fetch(`${mailpit}/api/v1/message/${fresh[0]}`)).json();
      const code = /(\d{6})/.exec(msg.Text || msg.HTML)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('no code mail');
}
async function signIn(d) {
  await d.page.goto(`${base}/`);
  const seen = await messageIds(d.email);
  await d.page.getByTestId('email').fill(d.email);
  await d.page.getByTestId('send-code').click();
  await d.page.getByTestId('code').fill(await codeAfter(d.email, seen));
  await d.page.getByTestId('verify-code').click();
  await d.page.getByTestId('verify-code').waitFor({ state: 'detached', timeout: 10000 });
}
/** A signed photo from the private bucket has rendered (natural size > 0). */
async function signedPhotoLoaded(d) {
  await d.page.waitForFunction(() => [...document.querySelectorAll('img')].some((i) => i.src.includes('/storage/v1/object/sign/family-media/') && i.complete && i.naturalWidth > 0 && i.checkVisibility()), null, { timeout: 15000 });
}
async function newMemory(d, title, { photo: withPhoto = false, privateOnly = false } = {}) {
  await d.page.goto(`${base}/memory/new`);
  if (withPhoto) {
    const chooser = d.page.waitForEvent('filechooser');
    await d.page.getByText('Fotoğraf ekle').click();
    await (await chooser).setFiles(photo);
  }
  await d.page.getByTestId('memory-title').fill(title);
  await d.page.getByTestId('memory-body').fill('Kurgu bir anı.');
  if (privateOnly) await d.page.getByText('Yalnızca ben').first().click();
  await d.page.getByTestId('save-memory').click();
  await d.page.getByTestId('save-memory').waitFor({ state: 'detached', timeout: 20000 });
}

const steps = [];
async function step(name, fn) {
  try {
    await fn();
    steps.push(['PASS', name]);
  } catch (e) {
    steps.push(['FAIL', name, e.message.split('\n')[0]]);
    throw e;
  }
}

const A = await device('a');
const B = await device('b');
let inviteCode = '';
try {
  await step('A: sign in, create family and child with a profile photo', async () => {
    await signIn(A);
    await A.page.getByTestId('display-name').fill('Ece');
    await A.page.getByTestId('create-family').click();
    await A.page.getByText('Çocuğumuz dünyaya geldi').first().click();
    const chooser = A.page.waitForEvent('filechooser');
    await A.page.getByText('Fotoğraf ekle').click();
    await (await chooser).setFiles(photo);
    await A.page.getByTestId('child-name').fill('Kurgu');
    await A.page.getByTestId('birth-date').fill('01.10.2026');
    await A.page.getByText('Profili oluştur').click();
    await see(A, 'Kurgu');
    await signedPhotoLoaded(A); // profile photo from the private bucket
  });
  await step('A: photo memory uploads to the private bucket and renders from a signed URL', async () => {
    await newMemory(A, 'Sahilde ilk gün', { photo: true });
    await A.page.goto(`${base}/story`);
    await see(A, 'Sahilde ilk gün');
    // Memory detail shows only the memory's own photos (no profile photo).
    await A.page.getByText('Sahilde ilk gün').filter({ visible: true }).first().click();
    await see(A, 'Aileye katılan herkes görebilir');
    await signedPhotoLoaded(A);
  });
  await step('A: invitation code is shown once', async () => {
    await A.page.goto(`${base}/family/invite`);
    await A.page.getByPlaceholder('Örn. Babaanne, bakıcı').fill('Baba');
    await A.page.getByText('Davet kodu oluştur').click();
    await A.page.getByTestId('invite-code').waitFor();
    inviteCode = (await A.page.getByTestId('invite-code').innerText()).trim();
    if (!/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(inviteCode)) throw new Error(`unexpected code ${inviteCode}`);
    await see(A, 'Kod yalnızca şimdi gösterilir');
  });
  await step('B: sign in on another device and join with the code', async () => {
    await signIn(B);
    await B.page.getByText('Davet koduyla katıl').click();
    await B.page.getByPlaceholder('ABCDE-FGHJK-…').fill(inviteCode);
    await B.page.getByPlaceholder('Örn. Nermin').filter({ visible: true }).fill('Can');
    await B.page.getByRole('button', { name: 'Aileye katıl', exact: true }).click();
    await B.page.getByRole('button', { name: 'Aileye katıl', exact: true }).waitFor({ state: 'detached', timeout: 10000 });
  });
  await step('B: sees the shared memory and its photo', async () => {
    await B.page.goto(`${base}/story`);
    await see(B, 'Sahilde ilk gün');
    await see(B, 'Ece ekledi');
    await B.page.getByText('Sahilde ilk gün').filter({ visible: true }).first().click();
    await see(B, 'Aileye katılan herkes görebilir');
    await signedPhotoLoaded(B);
  });
  await step('A: private memory; B cannot see it', async () => {
    await newMemory(A, 'Gizli not', { privateOnly: true });
    await A.page.goto(`${base}/story`);
    await see(A, 'Gizli not');
    await B.page.goto(`${base}/story`);
    await see(B, 'Sahilde ilk gün');
    await absent(B, 'Gizli not');
  });
  await step('B: adds a memory; A sees it', async () => {
    await newMemory(B, 'Babanın notu');
    await A.page.goto(`${base}/story`);
    await see(A, 'Babanın notu');
    await see(A, 'Can ekledi');
  });
  await step('A: revokes B (while B has the editor open)', async () => {
    await B.page.goto(`${base}/memory/new`);
    await B.page.getByTestId('memory-title').waitFor();
    await A.page.goto(`${base}/family`);
    await A.page.getByLabel('Erişimi kaldır: Can').click();
    await A.page.getByRole('button', { name: 'Erişimi kaldır' }).last().click();
    await absent(A, 'Can');
  });
  await step('B (no reload): the refused save moves B out of the family with a notice', async () => {
    await B.page.getByTestId('memory-title').fill('Kaldırıldıktan sonra');
    await B.page.getByTestId('memory-body').fill('Bu kaydedilmemeli.');
    await B.page.getByTestId('save-memory').click();
    await see(B, 'erişiminiz kaldırıldı', 15000);
  });
  await step('B (cold start): still out, with the notice; records gone from view', async () => {
    await B.page.goto(`${base}/story`);
    await see(B, 'erişiminiz kaldırıldı');
    await absent(B, 'Sahilde ilk gün');
  });
} catch {
  // reported below
}
for (const d of [A, B]) await d.page.screenshot({ path: `/tmp/sharing-${d.label}.png` }).catch(() => undefined);
await browser.close();
for (const s of steps) console.log(s.join(' | '));
if (errors.length) console.log('page errors:', [...new Set(errors)].join(' / '));
console.log(`${steps.filter((s) => s[0] === 'PASS').length}/10 steps passed`);
process.exit(steps.length === 10 && steps.every((s) => s[0] === 'PASS') && !errors.length ? 0 : 1);
