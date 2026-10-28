import { chromium } from '../frontend/node_modules/playwright/index.mjs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'dev@languagelearning.com');
  await page.fill('input[type="password"]', 'DevPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');

  await page.goto('http://localhost:5173/decks/11/learn', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const btn = document.querySelector('.vintage-launch-voyage-btn');
    const panel = document.querySelector('.vintage-setup-parchment-panel');
    const container = document.querySelector('.learn-distraction-free-container');
    const body = document.body;
    const html = document.documentElement;

    return {
      btnFound: Boolean(btn),
      btnText: btn?.innerText,
      btnRect: btn ? btn.getBoundingClientRect() : null,
      btnDisabled: btn?.disabled,
      containerScrollHeight: container?.scrollHeight,
      containerClientHeight: container?.clientHeight,
      windowInnerHeight: window.innerHeight,
      bodyOverflow: getComputedStyle(body).overflow,
      htmlOverflow: getComputedStyle(html).overflow,
      containerOverflow: container ? getComputedStyle(container).overflow : null
    };
  });

  console.log(JSON.stringify(info, null, 2));

  // Take screenshot to see what is visible
  await page.screenshot({ path: 'C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/learn_setup_check.png' });

  await browser.close();
}

run().catch(console.error);
