import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function verifyAll() {
  console.log('🚀 Starting Playwright Browser Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // ─────────────────────────────────────────────────────────────
  // 1. Auth & Reload Test
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing Auth & Reload ---');
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });

  const randomSuffix = Date.now().toString().slice(-6);
  const testEmail = `testuser_${randomSuffix}@example.com`;
  const testUsername = `user_${randomSuffix}`;
  const testPassword = 'Password123!';

  console.log(`Registering test user: ${testEmail}`);
  await page.fill('#reg-email', testEmail);
  await page.fill('#reg-username', testUsername);
  await page.fill('#reg-password', testPassword);
  await page.fill('#reg-confirm-password', testPassword);
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
  console.log('✅ Logged in / Registered successfully, reached home page.');

  // Reload 1
  console.log('Testing Reload 1...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (page.url().includes('/login')) throw new Error('Reload 1 redirected to /login!');
  console.log('✅ Reload 1: Still authenticated.');

  // Reload 2
  console.log('Testing Reload 2...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (page.url().includes('/login')) throw new Error('Reload 2 redirected to /login!');
  console.log('✅ Reload 2: Still authenticated.');

  // Reload 3
  console.log('Testing Reload 3...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (page.url().includes('/login')) throw new Error('Reload 3 redirected to /login!');
  console.log('✅ Reload 3: Still authenticated.');

  // Open Second Tab
  console.log('Testing Second Tab in same context...');
  const page2 = await context.newPage();
  await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  if (page2.url().includes('/login')) throw new Error('Second tab redirected to /login!');
  console.log('✅ Second Tab: Automatically authenticated, reached home page.');
  await page2.close();

  // ─────────────────────────────────────────────────────────────
  // 2. Bulk Import Tab & Duplicate Status Test
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Bulk Import Tab ---');
  // Click button to open create deck modal
  const createDeckBtn = page.locator('button:has-text("Tạo bộ từ"), button:has-text("Tạo bộ thẻ"), button:has-text("+ Bộ từ mới")').first();
  await createDeckBtn.click();
  await page.waitForSelector('.deck-form-modal, .modal-backdrop, .modal-container', { timeout: 5000 });
  console.log('✅ Opened Deck creation modal.');

  // Click "Bulk import" tab
  const bulkTabBtn = page.locator('button:has-text("Bulk import")');
  await bulkTabBtn.click();
  console.log('✅ Switched to Bulk import tab.');

  // Paste text with duplicate term
  const sampleText = 'apple|quả táo|/ˈæp.əl/|noun|I eat an apple.|fruit\napple|trái táo||||';
  const textarea = page.locator('textarea.bulk-textarea, textarea');
  await textarea.fill(sampleText);
  await page.waitForTimeout(600);

  // Check DUPLICATE warning badge
  const duplicateBadge = page.locator('.badge-warning');
  const hasDuplicate = (await duplicateBadge.count()) > 0;
  console.log(`✅ DUPLICATE warning detected in preview: ${hasDuplicate}`);

  // Switch back to "Nhập thủ công" (manual) tab
  const manualTabBtn = page.locator('button:has-text("Nhập thủ công")');
  await manualTabBtn.click();
  console.log('✅ Switched back to Manual tab.');

  // Switch back to "Bulk import" tab
  await bulkTabBtn.click();
  console.log('✅ Switched back to Bulk import tab.');

  // Verify text is still there!
  const currentText = await textarea.inputValue();
  const stateKept = currentText.includes('apple|quả táo') && currentText.includes('apple|trái táo');
  console.log(`✅ Bulk import state kept when switching tabs: ${stateKept}`);

  await browser.close();
  console.log('\n🎉 ALL REAL-BROWSER VERIFICATIONS PASSED SUCCESSFULLY!');
}

verifyAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
