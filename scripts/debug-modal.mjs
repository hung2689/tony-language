import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/register');
  const s = Date.now().toString().slice(-5);
  await page.fill('#reg-email', 'u_' + s + '@test.com');
  await page.fill('#reg-username', 'u_' + s);
  await page.fill('#reg-password', 'Pass1234!');
  await page.fill('#reg-confirm-password', 'Pass1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');

  await page.locator('button:has-text("Tạo bộ từ")').first().click();
  await page.waitForSelector('form.deck-form');

  await page.locator('input[placeholder*="Oxford"]').fill('Test Deck');
  await page.locator('button:has-text("Bulk import")').click();
  await page.locator('textarea').fill('apple|táo\nbanana|chuối');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("thẻ vào bộ từ")').click();
  await page.waitForTimeout(400);

  // Print cards in form
  const cardsCount = await page.locator('.card-editor-item').count();
  console.log('Cards count in form:', cardsCount);

  // Check active tab
  const activeTab = await page.evaluate(() => {
    const activeBtn = document.querySelector('.tabs-container button.active, .tab-btn.active, .study-mode-btn.is-active');
    return activeBtn ? activeBtn.innerText : 'none';
  });
  console.log('Active tab:', activeTab);

  await page.locator('.modal-footer button[type="submit"]').click();
  await page.waitForTimeout(1000);

  const errors = await page.locator('.alert-banner, .form-error-sm, .form-error, .is-invalid').allInnerTexts();
  console.log('Validation errors on form:', errors);

  await browser.close();
}
test();
