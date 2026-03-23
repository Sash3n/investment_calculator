/**
 * FinCalc ZA — Automated Screenshot Generator
 *
 * Starts the Vite dev server, captures every page in dark + light mode,
 * saves them to docs/screenshots/, then injects the image paths into README.md.
 *
 * Usage:
 *   node scripts/screenshot.mjs
 *
 * Requirements:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCREENSHOTS_DIR = join(ROOT, 'docs', 'screenshots');
const README_PATH = join(ROOT, 'README.md');
const BASE_URL = 'http://localhost:5173';
const WAIT_MS = 2200; // let charts/animations settle

// ── Pages to capture ──────────────────────────────────────────────────────────
const PAGES = [
  { name: 'dashboard',           path: '/',                    title: 'Dashboard' },
  { name: 'mortgage',            path: '/mortgage',            title: 'Mortgage Calculator' },
  { name: 'property-roi',        path: '/property-roi',        title: 'Property ROI' },
  { name: 'car-finance',         path: '/car-finance',         title: 'Car Finance' },
  { name: 'extra-vs-investing',  path: '/extra-vs-investing',  title: 'Extra Payments vs Investing' },
  { name: 'tax-planner',         path: '/tax-planner',         title: 'Tax Planner' },
  { name: 'investment-strategy', path: '/investment-strategy', title: 'Investment Strategy' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function waitForServer(url, retries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status < 500) return resolve();
      } catch {
        // server not ready yet
      }
      if (++attempts >= retries) return reject(new Error(`Server not ready after ${retries}s`));
      setTimeout(check, interval);
    };
    check();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log('▶  Starting Vite dev server…');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    shell: true,
    stdio: 'ignore',
  });

  try {
    await waitForServer(BASE_URL);
    console.log('✓  Dev server ready\n');

    const browser = await chromium.launch();
    const captured = {};

    for (const theme of ['dark', 'light']) {
      console.log(`── ${theme} mode ──────────────────────────`);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });

      const page = await context.newPage();

      // Set theme in localStorage before navigating
      await page.addInitScript((t) => {
        localStorage.setItem('fincalc-theme', t);
      }, theme);

      for (const { name, path, title } of PAGES) {
        process.stdout.write(`  ${title}…`);
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });

        // Ensure the html[data-theme] attribute is applied
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        await sleep(WAIT_MS);

        const filename = theme === 'dark' ? `${name}.png` : `${name}-light.png`;
        const filepath = join(SCREENSHOTS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        captured[`${name}-${theme}`] = `docs/screenshots/${filename}`;
        console.log(` ✓`);
      }

      // Light mode composite — full dashboard scroll
      if (theme === 'light') {
        process.stdout.write(`  Light mode full-page dashboard…`);
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await sleep(WAIT_MS);
        await page.screenshot({ path: join(SCREENSHOTS_DIR, 'light-mode.png'), fullPage: true });
        captured['light-mode'] = 'docs/screenshots/light-mode.png';
        console.log(` ✓`);
      }

      await context.close();
    }

    await browser.close();

    // ── Patch README.md ──────────────────────────────────────────────────────
    console.log('\n▶  Patching README.md…');
    let readme = readFileSync(README_PATH, 'utf8');

    const screenshotsBlock = `## Screenshots

| Dashboard (Dark) | Dashboard (Light) |
|---|---|
| ![Dashboard Dark](${captured['dashboard-dark']}) | ![Dashboard Light](${captured['dashboard-light']}) |

| Mortgage Calculator | Property ROI |
|---|---|
| ![Mortgage](${captured['mortgage-dark']}) | ![Property ROI](${captured['property-roi-dark']}) |

| Car Finance | Extra Payments vs Investing |
|---|---|
| ![Car Finance](${captured['car-finance-dark']}) | ![Extra vs Investing](${captured['extra-vs-investing-dark']}) |

| Tax Planner | Investment Strategy |
|---|---|
| ![Tax Planner](${captured['tax-planner-dark']}) | ![Investment Strategy](${captured['investment-strategy-dark']}) |

| Light Mode |
|---|
| ![Light Mode](${captured['light-mode']}) |`;

    // Replace the existing Screenshots section
    readme = readme.replace(
      /## Screenshots[\s\S]*?(?=\n---)/,
      screenshotsBlock
    );

    writeFileSync(README_PATH, readme);
    console.log('✓  README.md updated\n');
    console.log('Done! Screenshots saved to docs/screenshots/');

  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
