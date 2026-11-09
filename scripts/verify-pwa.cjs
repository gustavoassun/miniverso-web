// node scripts/verify-pwa.cjs <caminho-do-playwright> [url]
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');
const url = process.argv[3] || 'http://127.0.0.1:5188';
async function verify() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => document.body.innerText.includes('Miniverso pronto para abrir offline'));
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
    assert.equal(manifest.display, 'standalone');
    for (const size of ['192x192', '512x512']) assert(manifest.icons.some(icon => icon.sizes === size));
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const urls = (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))).flat();
      return urls;
    });
    assert(cached.some(item => item.includes('vr-headset.png')));
    assert(cached.some(item => item.includes('reciclaverso.png')));
    assert(!cached.some(item => new URL(item).pathname.startsWith('/api')));
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => document.body.innerText.includes('Você está sem conexão'));
    assert(await page.getByRole('heading').count() > 0);
    await page.waitForFunction(() => Array.from(document.images).filter(image => image.getBoundingClientRect().height > 0).every(image => image.complete && image.naturalWidth > 0));
    for (const route of ['/blog', '/login', '/dashboard', '/']) {
      await page.goto(url + route);
      await page.waitForSelector('main');
      assert((await page.locator('main').innerText()).trim().length > 0);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const output = process.argv[4] ? path.resolve(process.argv[4]) : path.join(__dirname, '../docs/pwa-evidence');
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'mobile-offline.png') });
    await context.setOffline(false);
    await page.reload();
    await page.waitForFunction(() => !document.body.innerText.includes('Você está sem conexão'));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: path.join(output, 'desktop-online.png') });
    assert.deepEqual(errors, []);
    const result = { checkedAt: new Date().toISOString(), browser: 'Edge headless (isolated profile)', manifest, cachedFiles: cached.length, offlineReload: true, offlineRoutes: ['/', '/blog', '/login', '/dashboard'], localImages: true, mobileOverflow: false, pageErrors: errors, limitations: ['Real installation on a physical device not tested', 'Update prompt between two published versions not tested', 'Placeholder login/dashboard rendering is not offline authentication'] };
    await writeFile(path.join(output, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
