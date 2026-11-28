/**
 * R2 vertical slice in the WEB build against the LOCAL Supabase stack:
 * sign in with an emailed code (read from Mailpit) → create a family →
 * create a child → save a text memory → reload (relaunch) → still there →
 * sign out → sign in again → still there.
 *
 * Browser evidence only; not native verification (docs/test-strategy.md).
 *
 *   npx expo export --platform web --output-dir dist-real   (with EXPO_PUBLIC_BACKEND=supabase, see docs/auth.md)
 *   node scripts/real-journey.mjs http://localhost:8082 http://127.0.0.1:54324
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:8082';
const mailpit = process.argv[3] ?? 'http://127.0.0.1:54324';
const email = `r2-${randomUUID().slice(0, 8)}@example.test`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const see = (text, timeout = 10000) => page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ timeout });
const steps = [];
async function step(name, fn) {
  try {
    await fn();
    steps.push(['PASS', name]);
  } catch (e) {
    steps.push(['FAIL', name, e.message.split('\n')[0]]);
    await page.screenshot({ path: `/tmp/real-journey-fail-${steps.length}.png` });
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
async function signIn() {
  const seen = await messageIds();
  if (seen.length) await new Promise((r) => setTimeout(r, 1100)); // per-address resend limit
  await page.getByTestId('email').fill(email);
  await page.getByTestId('send-code').click();
  await see('6 haneli bir kod gönderdik');
  await page.getByTestId('code').fill('000000');
  await page.getByTestId('verify-code').click();
  await see('Kod hatalı'); // wrong code: clear message, nothing else happens
  await page.getByTestId('code').fill(await codeAfter(seen));
  await page.getByTestId('verify-code').click();
  // Signed in: the guards leave the sign-in screens (do not navigate before the session is stored).
  await page.getByTestId('verify-code').waitFor({ state: 'detached', timeout: 10000 });
}

try {
  await step('Signed out: sign-in screen, no demo content or demo badge', async () => {
    await page.goto(`${base}/`);
    await see('Giriş yap');
    if (await page.getByText('Demo · veriler').count()) throw new Error('demo badge in real mode');
    if (await page.getByText('Örnek aileyle').count()) throw new Error('demo entry in real mode');
  });
  await step('Email code sign-in creates the account (wrong code rejected first)', async () => {
    await signIn();
    await see('Yeni aile oluştur');
    await see(email);
  });
  await step('Create a family', async () => {
    await page.getByTestId('display-name').fill('Ece');
    await page.getByTestId('create-family').click();
    await see('Nereden başlıyoruz?');
    if (await page.getByText('Aileme katılıyorum').filter({ visible: true }).count()) throw new Error('join offered inside a family');
  });
  await step('Create a child profile', async () => {
    await page.getByText('Çocuğumuz dünyaya geldi').first().click();
    await page.getByTestId('child-name').fill('Kurgu');
    await page.getByTestId('birth-date').fill('01.10.2026');
    await page.getByText('Profili oluştur').click();
    await see('Kurgu');
  });
  await step('Save a text memory', async () => {
    await page.goto(`${base}/memory/new`);
    await page.getByTestId('memory-title').fill('İlk gülümseme');
    await page.getByTestId('memory-body').fill('Kurgu bir anı metni.');
    await page.getByTestId('save-memory').click();
    await page.getByTestId('save-memory').waitFor({ state: 'detached', timeout: 15000 }); // editor closes after the server confirmed
    await page.goto(`${base}/story`);
    await see('İlk gülümseme', 15000);
  });
  await step('Relaunch (full reload): session restored, memory still there', async () => {
    await page.reload();
    await page.goto(`${base}/story`);
    await see('İlk gülümseme', 15000);
  });
  await step('Sign out keeps data; signing in again shows it', async () => {
    await page.goto(`${base}/settings`);
    await page.getByText('Çıkış yap').first().click();
    await see('Çıkış yaptınız. Kayıtlarınız silinmedi.');
    await signIn();
    await page.goto(`${base}/story`);
    await see('İlk gülümseme', 15000);
  });
} catch {
  // reported below
}
await browser.close();
for (const s of steps) console.log(s.join(' | '));
if (errors.length) console.log('page errors:', [...new Set(errors)].join(' / '));
console.log(`${steps.filter((s) => s[0] === 'PASS').length}/7 steps passed`);
process.exit(steps.length === 7 && steps.every((s) => s[0] === 'PASS') && !errors.length ? 0 : 1);
