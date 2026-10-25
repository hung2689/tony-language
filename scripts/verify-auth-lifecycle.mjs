import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function run() {
  console.log('🚀 Starting Browser Auth Proof Suite...');
  const browser = await chromium.launch({ headless: true });

  const testSuffix = Date.now().toString().slice(-5);
  const testEmail = `auth_proof_${testSuffix}@example.com`;
  const testUsername = `user_${testSuffix}`;
  const testPassword = 'Password123!';

  // ─────────────────────────────────────────────────────────────
  // 0. Register test user
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 0. Registering test user ---');
  const regContext = await browser.newContext();
  const regPage = await regContext.newPage();
  await regPage.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
  await regPage.fill('#reg-email', testEmail);
  await regPage.fill('#reg-username', testUsername);
  await regPage.fill('#reg-password', testPassword);
  await regPage.fill('#reg-confirm-password', testPassword);
  await regPage.click('button[type="submit"]');
  await regPage.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('✅ Registered user:', testEmail);
  await regContext.close();

  // ─────────────────────────────────────────────────────────────
  // 1. Login WITHOUT "Ghi nhớ đăng nhập" (Session ends on browser close)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. Login WITHOUT "Ghi nhớ đăng nhập" ---');
  const sessionContext = await browser.newContext();
  const page1 = await sessionContext.newPage();
  await page1.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  await page1.fill('#login-email', testEmail);
  await page1.fill('#login-password', testPassword);

  // Ensure "Ghi nhớ đăng nhập" checkbox is UNCHECKED
  const rememberCheckbox = page1.locator('#login-remember-me');
  if (await rememberCheckbox.isChecked()) {
    await rememberCheckbox.uncheck();
  }
  console.log('Remember Me checked:', await rememberCheckbox.isChecked());

  await page1.click('button[type="submit"]');
  await page1.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('✅ Logged in without Remember Me. Current URL:', page1.url());

  // Inspect cookies
  const cookies = await sessionContext.cookies();
  const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
  console.log('Cookie expires attribute:', refreshCookie ? refreshCookie.expires : 'None');
  const isSessionCookie = refreshCookie && (refreshCookie.expires === -1 || refreshCookie.expires === 0);
  console.log('Is session-only cookie (no persistent Max-Age)?', isSessionCookie);

  // Close browser context (simulating closing the browser app)
  await sessionContext.close();
  console.log('Browser closed.');

  // Reopen browser without persistent cookies (session cookie lost)
  const reopenedContext = await browser.newContext();
  const reopenedPage = await reopenedContext.newPage();
  await reopenedPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await reopenedPage.waitForTimeout(1500);

  const finalUrlNoRemember = reopenedPage.url();
  console.log('URL after reopening browser (Without Remember Me):', finalUrlNoRemember);
  const sessionEnded = finalUrlNoRemember.includes('/login');
  console.log('✅ Proof 1 Result: Session ends when browser closed without Remember Me?', sessionEnded);
  if (!sessionEnded) {
    throw new Error('Expected session to end on browser reopen without rememberMe');
  }
  await reopenedContext.close();

  // ─────────────────────────────────────────────────────────────
  // 2. Login WITH "Ghi nhớ đăng nhập" (Session survives browser close)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Login WITH "Ghi nhớ đăng nhập" ---');
  const persistContext = await browser.newContext();
  const page2 = await persistContext.newPage();
  await page2.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  await page2.fill('#login-email', testEmail);
  await page2.fill('#login-password', testPassword);

  // CHECK "Ghi nhớ đăng nhập"
  await page2.check('#login-remember-me');
  console.log('Remember Me checked:', await page2.isChecked('#login-remember-me'));

  await page2.click('button[type="submit"]');
  await page2.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('✅ Logged in WITH Remember Me. Current URL:', page2.url());

  // Save storage / persistent cookies
  const storageState = await persistContext.storageState();
  const persistRefreshCookie = storageState.cookies.find((c) => c.name === 'refresh_token');
  console.log('Persistent cookie expires timestamp:', persistRefreshCookie?.expires);
  const isPersistent = persistRefreshCookie && persistRefreshCookie.expires > Date.now() / 1000 + 86400;
  console.log('Is persistent 30-day cookie?', isPersistent);

  await persistContext.close();
  console.log('Browser closed.');

  // Reopen browser WITH persisted cookies
  const restoredContext = await browser.newContext({ storageState });
  const restoredPage = await restoredContext.newPage();
  await restoredPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await restoredPage.waitForTimeout(1500);

  const finalUrlWithRemember = restoredPage.url();
  console.log('URL after reopening browser (With Remember Me):', finalUrlWithRemember);
  const sessionSurvived = !finalUrlWithRemember.includes('/login') && finalUrlWithRemember.includes('localhost:5173');
  console.log('✅ Proof 2 Result: Session survives browser close with Remember Me?', sessionSurvived);
  if (!sessionSurvived) {
    throw new Error('Expected session to survive on browser reopen with rememberMe');
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Confirm 401 → refresh → retry path
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing 401 → refresh → retry path ---');
  const networkEvents = [];

  restoredPage.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      networkEvents.push({
        status: response.status(),
        method: response.request().method(),
        url: url.split('/api')[1],
      });
    }
  });

  // Corrupt / expire the in-memory access token via page evaluate
  const retryResult = await restoredPage.evaluate(async () => {
    // Import api dynamically or use request with bad token
    const { request, setAccessToken } = await import('/src/services/api.js');

    // 1. Manually set an expired / invalid JWT token in memory
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaXNzIjoibGFuZ3VhZ2UtbGVhcm5pbmctYXBwIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalidSignature';
    setAccessToken(expiredToken, { broadcast: false });

    // 2. Make an authenticated API request: should get 401 -> silent refresh -> retry with new valid token -> 200
    const folders = await request('/folders');
    return { success: true, foldersCount: Array.isArray(folders) ? folders.length : 0 };
  });

  console.log('API Request Result after 401 retry:', retryResult);
  console.log('\nCaptured Network Flow:');
  networkEvents.forEach((ev) => console.log(`  [${ev.status}] ${ev.method} /api${ev.url}`));

  // Verify the flow had a 401, followed by a refresh, followed by a successful request
  const has401 = networkEvents.some((ev) => ev.status === 401);
  const hasRefresh = networkEvents.some((ev) => ev.status === 200 && ev.url.includes('/auth/refresh'));
  const hasRetried200 = networkEvents.some((ev) => ev.status === 200 && ev.url.includes('/folders'));

  console.log('\nVerification checks:');
  console.log('  1. Encountered 401 Unauthorized on expired token:', has401);
  console.log('  2. Executed silent refresh (/api/auth/refresh):', hasRefresh);
  console.log('  3. Successfully retried original request with new token (200):', hasRetried200);

  if (!has401 || !hasRefresh || !hasRetried200) {
    throw new Error('401 -> refresh -> retry sequence was not fulfilled');
  }

  console.log('\n🎉 ALL AUTH PROOFS VERIFIED SUCCESSFULLY IN REAL BROWSER!');
  await restoredContext.close();
  await browser.close();
}

run().catch((err) => {
  console.error('❌ Auth proof failed:', err);
  process.exit(1);
});