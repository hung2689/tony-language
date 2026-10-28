import { chromium } from '../frontend/node_modules/playwright/index.mjs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, locale: 'vi-VN' });

await page.goto('http://localhost:5173/login');
await page.fill('input[type="email"]', 'dev@languagelearning.com');
await page.fill('input[type="password"]', 'DevPassword123!');
await page.click('button[type="submit"]');
await page.waitForURL('http://localhost:5173/');

// Go to deck 11
await page.goto('http://localhost:5173/decks/11', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Verify sidebar does NOT exist on the page
const sidebar = await page.$('.lexicon-explorer-sidebar');
console.log('Sidebar on deck page (should be false/null):', Boolean(sidebar));

// 1. Capture top view (no sidebar, centered, full width)
const topPath = path.join(ARTIFACTS_DIR, 'flashcard_no_sidebar_top.png');
await page.screenshot({ path: topPath });
console.log('Saved top screenshot:', topPath);

// 2. Scroll to bottom
await page.evaluate(() => {
  const shell = document.querySelector('.deck-page-shell') || window;
  shell.scrollTo(0, 9999);
});
await page.waitForTimeout(600);
const scrolledPath = path.join(ARTIFACTS_DIR, 'flashcard_no_sidebar_scrolled.png');
await page.screenshot({ path: scrolledPath });
console.log('Saved scrolled screenshot:', scrolledPath);

// 3. Scroll back to top and test Spaced Repetition modal
await page.evaluate(() => {
  const shell = document.querySelector('.deck-page-shell') || window;
  shell.scrollTo(0, 0);
});
await page.waitForTimeout(400);
await page.click('.vintage-header-srs-btn');
await page.waitForTimeout(1000);
const srsPath = path.join(ARTIFACTS_DIR, 'flashcard_no_sidebar_srs.png');
await page.screenshot({ path: srsPath });
console.log('Saved SRS screenshot:', srsPath);

await browser.close();
console.log('Done capturing screenshots!');
