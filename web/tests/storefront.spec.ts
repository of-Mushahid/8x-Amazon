import { test as base, expect, chromium, type Page, type Locator } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';

const ROOT = 'C:/Users/DELL/Documents/Qoder/2026-10-18/7c1081d1/web';
const ORIGIN = 'http://127.0.0.1:3000';
const SHIRT = 'Blue & Black Check Shirt';
const SHIRT_PATH = '/product/blue-black-check-shirt';

// Selectors were discovered from live accessibility snapshots, not product source.
// All contexts are isolated from the Qoder in-app browser and from each other.
const test = base.extend<{ monitored: void }>({
  monitored: [async ({ page }, use, info) => {
    const consoleErrors: Array<{ text: string; url: string }> = [];
    const pageErrors: string[] = [];
    const failedResponses: Array<{ url: string; status: number }> = [];
    let controlSeen = false;
    page.on('console', message => {
      if (message.text() === 'storefront-monitor-positive-control') controlSeen = true;
      if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url });
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() });
    });
    await page.evaluate(() => console.info('storefront-monitor-positive-control'));
    await use();
    const expectedHttp = (url: string) =>
      (info.title.includes('404') && /does-not-exist-storefront|not-a-real-storefront-route/.test(url)) ||
      (info.title.includes('checkout backend') && /\/api\/checkout/.test(url));
    const unexpectedConsole = consoleErrors.filter(error => !(
      expectedHttp(error.url) && /Failed to load resource/.test(error.text)
    ));
    writeFileSync(info.outputPath('browser-events.json'), JSON.stringify({
      timestamp: new Date().toISOString(), test: info.title, controlSeen, consoleErrors,
      pageErrors, failedResponses, unexpectedConsole,
    }, null, 2));
    if (info.status !== info.expectedStatus && !page.isClosed()) {
      await page.screenshot({ path: info.outputPath('failure.png'), fullPage: true }).catch(() => {});
      writeFileSync(info.outputPath('failure-dom.txt'), await page.locator('body').ariaSnapshot().catch(() => 'Page unavailable'));
    }
    expect.soft(controlSeen, 'Console monitoring positive control').toBe(true);
    expect.soft(pageErrors, 'Uncaught browser exceptions').toEqual([]);
    expect.soft(unexpectedConsole, 'Unexpected console errors').toEqual([]);
  }, { auto: true }],
});

test.use({
  baseURL: ORIGIN,
  viewport: { width: 1440, height: 1000 },
  launchOptions: existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' },
  actionTimeout: 15_000,
  navigationTimeout: 30_000,
  trace: 'retain-on-failure',
});
test.setTimeout(90_000);

async function ready(page: Page, path: string) {
  const response = await page.goto(path);
  await expect(page.locator('main h1')).toBeVisible();
  return response;
}

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.viewport).toBeGreaterThan(300);
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function imageLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
}

const results = (page: Page) => page.getByRole('region', { name: 'Product results' });
const cards = (page: Page) => results(page).locator('article');
async function prices(page: Page) {
  const values = await cards(page).evaluateAll(elements => elements.map(element => {
    const price = Array.from(element.querySelectorAll('strong')).find(node => /^\$/.test(node.textContent || ''));
    return Number((price?.textContent || '').replace(/[^\d.]/g, ''));
  }));
  expect(values.length).toBeGreaterThan(1);
  expect(values.every(value => value > 0)).toBe(true);
  return values;
}

async function addShirt(page: Page) {
  await ready(page, SHIRT_PATH);
  await page.getByRole('button', { name: 'Add to bag $29.99', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your good finds (1)', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status', { name: `Quantity of ${SHIRT}`, exact: true })).toHaveText('1');
}

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`home ${device}: real images and no horizontal overflow`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    expect((await ready(page, '/'))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good things. For your everyday.');
    const images = page.locator('main img');
    expect(await images.count()).toBeGreaterThanOrEqual(7);
    for (const image of await images.all()) await imageLoaded(image);
    await noOverflow(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`home-${device}.png`), fullPage: true });
  });
}

test('search autocomplete keyboard selection and Escape', async ({ page }, info) => {
  await ready(page, '/');
  const search = page.getByRole('combobox', { name: 'Search products' });
  await search.fill('apple');
  await expect(page.getByRole('option')).toHaveCount(5);
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'suggestion-0');
  await expect(page.getByRole('option').nth(0)).toHaveAttribute('aria-selected', 'true');
  await search.press('ArrowDown');
  await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await search.press('ArrowUp');
  await expect(page.getByRole('option').nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: info.outputPath('search-autocomplete.png') });
  await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await search.fill('apple ');
  await expect(page.getByRole('option')).toHaveCount(5);
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(`${ORIGIN}/product/apple-airpods-max-silver`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apple AirPods Max Silver');
});

test('search recent queries persist, replay, and clear', async ({ page }) => {
  await ready(page, '/');
  const search = page.getByRole('combobox', { name: 'Search products' });
  await search.fill('apple');
  await page.getByRole('button', { name: 'See all results for “apple”', exact: true }).click();
  await expect(page).toHaveURL(/\/shop\?q=apple/);
  await expect(cards(page)).toHaveCount(8);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await search.focus();
  await expect(page.getByRole('button', { name: 'apple', exact: true })).toBeVisible();
  await page.reload();
  await search.fill('');
  await search.focus();
  await expect(page.getByRole('button', { name: 'apple', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'apple', exact: true }).click();
  await expect(search).toHaveValue('apple');
  await expect(cards(page)).toHaveCount(8);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await search.focus();
  await page.getByRole('button', { name: 'Clear recent searches', exact: true }).click();
  await expect(page.getByRole('button', { name: 'apple', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear recent searches', exact: true })).toHaveCount(0);
  await page.reload();
  await search.fill('');
  await search.focus();
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'apple', exact: true })).toHaveCount(0);
});

test('department and delivery filters change actual results and reset', async ({ page }) => {
  await ready(page, '/shop');
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole('button', { name: 'Tech & electronics 8', exact: true }).click();
  await expect(page).toHaveURL(/category=tech/);
  await expect(cards(page)).toHaveCount(8);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tech & electronics');
  await expect(cards(page).getByRole('link', { name: 'Apple AirPods Max Silver', exact: true })).toBeVisible();
  await expect(cards(page).getByRole('link', { name: 'Black Aluminium Cup', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '2-day delivery', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: '2-day delivery', exact: true })).toBeChecked();
  await expect.poll(() => cards(page).count()).toBeLessThan(8);
  expect(await cards(page).count()).toBeGreaterThan(0);
  for (const card of await cards(page).all()) await expect(card).toContainText('2-day delivery available');
  await page.getByRole('link', { name: 'Clear all', exact: true }).click();
  await expect(page).toHaveURL(`${ORIGIN}/shop`);
  await expect(cards(page)).toHaveCount(12);
});

test('color price rating and deal filters have observable effects', async ({ page }) => {
  await ready(page, '/shop');
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole('button', { name: 'Filter Orange', exact: true }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).getByRole('link', { name: 'Basketball', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter Orange', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Clear all', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Maximum price' });
  await slider.focus();
  await slider.press('Home');
  await expect(slider).toHaveValue('1000');
  await expect(page).toHaveURL(/max=1000/);
  await expect.poll(async () => (await prices(page)).every(price => price <= 10)).toBe(true);
  await page.getByRole('link', { name: 'Clear all', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Rated 4 stars & up', exact: true }).check();
  await expect(page).toHaveURL(/rating=4/);
  await expect.poll(async () => {
    const ratings = await cards(page).locator('strong').allTextContents();
    const stars = ratings.filter(text => !text.startsWith('$')).map(Number);
    return stars.length > 1 && stars.every(star => star >= 4);
  }).toBe(true);
  await page.getByRole('link', { name: 'Clear all', exact: true }).click();
  await page.getByRole('checkbox', { name: 'On a good deal', exact: true }).check();
  await expect(page).toHaveURL(/deals=1/);
  await expect(page.getByRole('checkbox', { name: 'On a good deal', exact: true })).toBeChecked();
  await expect(results(page).getByRole('button', { name: /Remove filter/ })).toBeVisible();
  // This seeded catalog currently has no deals; assert the observed empty state explicitly.
  await expect(page.getByRole('heading', { name: 'No good finds this time.', exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
});

test('sort ascending descending and top rated with nonempty controls', async ({ page }) => {
  await ready(page, '/shop');
  const sort = page.getByRole('combobox', { name: 'Sort products' });
  await sort.selectOption({ label: 'Price: low to high' });
  await expect(page).toHaveURL(/sort=/);
  await expect.poll(async () => {
    const values = await prices(page);
    return JSON.stringify(values) === JSON.stringify([...values].sort((a, b) => a - b));
  }).toBe(true);
  const lowest = (await prices(page))[0];
  await sort.selectOption({ label: 'Price: high to low' });
  await expect.poll(async () => {
    const values = await prices(page);
    return JSON.stringify(values) === JSON.stringify([...values].sort((a, b) => b - a));
  }).toBe(true);
  expect((await prices(page))[0]).toBeGreaterThan(lowest);
  await sort.selectOption({ label: 'Top rated' });
  await expect.poll(async () => {
    const text = await cards(page).locator('strong').allTextContents();
    const ratings = text.filter(value => !value.startsWith('$')).map(Number);
    return ratings.length > 1 && JSON.stringify(ratings) === JSON.stringify([...ratings].sort((a, b) => b - a));
  }).toBe(true);
});

test('pagination visits all 64 products without overlap and returns', async ({ page }) => {
  await ready(page, '/shop');
  await expect(results(page).getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  const visited: string[] = [];
  for (let number = 1; number <= 6; number++) {
    await expect(results(page)).toContainText(`Page ${number} of 6`);
    await expect(cards(page)).toHaveCount(number === 6 ? 4 : 12);
    const links = await cards(page).getByRole('link', { name: /^View / }).evaluateAll(elements => elements.map(element => element.getAttribute('href')!));
    expect(links.some(link => visited.includes(link))).toBe(false);
    visited.push(...links);
    if (number < 6) await results(page).getByRole('button', { name: 'Next', exact: true }).click();
  }
  expect(new Set(visited).size).toBe(64);
  await expect(results(page).getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await results(page).getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(results(page)).toContainText('Page 5 of 6');
  await expect(cards(page)).toHaveCount(12);
});

test('search empty results recover to nonempty collection', async ({ page }, info) => {
  await ready(page, '/shop');
  await expect(cards(page)).toHaveCount(12);
  const search = page.getByRole('combobox', { name: 'Search products' });
  await search.fill('zzznomatch012345');
  await page.getByRole('button', { name: 'Submit search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No good finds this time.', exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('empty-results.png'), fullPage: true });
  await page.getByRole('link', { name: 'Reset filters', exact: true }).click();
  await expect(cards(page)).toHaveCount(12);
  await expect(page).toHaveURL(`${ORIGIN}/shop`);
});

test('PDP four distinct gallery angles, zoom navigation and variants', async ({ page }, info) => {
  await ready(page, SHIRT_PATH);
  const gallery = page.getByRole('region', { name: 'Product image gallery' });
  const sources = new Set<string>();
  for (let number = 1; number <= 4; number++) {
    await gallery.getByRole('button', { name: `Show image ${number}`, exact: true }).click();
    await expect(gallery.getByRole('button', { name: `Show image ${number}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const image = gallery.getByRole('img', { name: `${SHIRT}, view ${number}`, exact: true });
    await imageLoaded(image);
    sources.add((await image.getAttribute('src'))!);
  }
  expect(sources.size).toBe(4);
  await gallery.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(gallery.getByRole('img')).toHaveAttribute('alt', `${SHIRT}, view 1`);
  await gallery.getByRole('button', { name: 'Previous image', exact: true }).click();
  await gallery.getByRole('button', { name: 'Enlarge product image', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: SHIRT, exact: true });
  await expect(dialog).toBeVisible();
  await imageLoaded(dialog.getByRole('img', { name: `${SHIRT}, enlarged view 4`, exact: true }));
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await imageLoaded(dialog.getByRole('img', { name: `${SHIRT}, enlarged view 1`, exact: true }));
  await page.screenshot({ path: info.outputPath('pdp-zoom.png') });
  await dialog.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(dialog).toContainText('View 4 of 4');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await expect(page.getByRole('button', { name: 'M', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'S', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Quantity', exact: true })).toHaveText('2');
  await page.getByRole('button', { name: /^Add to bag / }).click();
  const bag = page.getByRole('dialog');
  await expect(bag.getByRole('status', { name: `Quantity of ${SHIRT}`, exact: true })).toHaveText('2');
  await expect(bag.locator('article')).toContainText('M');
  await page.screenshot({ path: info.outputPath('variant-bag.png') });
});

test('cart quantities totals save remove and reload persistence', async ({ page }, info) => {
  await addShirt(page);
  await page.getByRole('dialog').getByRole('link', { name: 'View your bag', exact: true }).click();
  await expect(page).toHaveURL(`${ORIGIN}/cart`);
  const quantity = page.getByRole('status', { name: `Quantity of ${SHIRT}`, exact: true });
  await expect(quantity).toHaveText('1');
  await expect(page.getByRole('complementary')).toContainText('$37.34');
  await page.getByRole('button', { name: `Increase quantity of ${SHIRT}`, exact: true }).click();
  await expect(quantity).toHaveText('2');
  await expect(page.getByRole('complementary')).toContainText('$64.78');
  await page.reload();
  await expect(quantity).toHaveText('2');
  await page.screenshot({ path: info.outputPath('cart-persisted.png'), fullPage: true });
  await page.getByRole('button', { name: `Decrease quantity of ${SHIRT}`, exact: true }).click();
  await expect(quantity).toHaveText('1');
  await expect(page.getByRole('button', { name: `Decrease quantity of ${SHIRT}`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: `Save ${SHIRT} for later`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next favorite is out there.', exact: true })).toBeVisible();
  await ready(page, '/saved');
  await expect(page.getByRole('button', { name: `Unsave ${SHIRT}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: `Unsave ${SHIRT}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Add ${SHIRT} to bag`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: `Remove ${SHIRT}`, exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open shopping bag, 0 items', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Unsave ${SHIRT}`, exact: true }).click();
  await expect(page.locator('main article')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main article')).toHaveCount(0);
});

test('cart keeps different variants as separate lines', async ({ page }) => {
  await addShirt(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'L', exact: true }).click();
  await page.getByRole('button', { name: /^Add to bag / }).click();
  const lines = page.getByRole('dialog').locator('article');
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toContainText('S');
  await expect(lines.nth(1)).toContainText('L');
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Your good finds (2)');
  await page.reload();
  await page.getByRole('button', { name: 'Open shopping bag, 2 items', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(2);
});

test('mobile navigation and shopping bag drawers, filtering and checkout layout', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/');
  const open = page.getByRole('button', { name: 'Open navigation', exact: true });
  await open.click();
  const navigation = page.getByRole('dialog', { name: 'Find your everyday', exact: true });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link')).toHaveCount(11);
  await page.screenshot({ path: info.outputPath('mobile-navigation.png') });
  await page.keyboard.press('Escape');
  await expect(navigation).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await navigation.getByRole('link', { name: 'Tech & electronics', exact: true }).click();
  await expect(page).toHaveURL(/category=tech/);
  await expect(navigation).not.toBeVisible();
  await expect(cards(page)).toHaveCount(8);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('complementary')).toBeVisible();
  await page.getByRole('checkbox', { name: '2-day delivery', exact: true }).check();
  await expect.poll(() => cards(page).count()).toBeLessThan(8);
  expect(await cards(page).count()).toBeGreaterThan(0);
  await noOverflow(page);
  await addShirt(page);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('mobile-bag.png') });
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A few final details.');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('mobile-checkout.png'), fullPage: true });
});

test('checkout invalid fields prevent network submission', async ({ page }, info) => {
  await addShirt(page);
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout', exact: true }).click();
  const requests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/checkout')) requests.push(request.url()); });
  await page.getByRole('button', { name: 'Place demo order', exact: true }).click();
  for (const name of ['Email address', 'Full name', 'Street address', 'City', 'ZIP code']) {
    await expect(page.getByRole('textbox', { name, exact: true })).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(page.getByRole('combobox', { name: 'State', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter a valid ZIP code, such as 10001.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('not-an-email');
  await page.getByRole('textbox', { name: 'ZIP code', exact: true }).fill('abc');
  await page.getByRole('button', { name: 'Place demo order', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('textbox', { name: 'ZIP code', exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(requests).toEqual([]);
  await expect(page).toHaveURL(`${ORIGIN}/checkout`);
  await page.screenshot({ path: info.outputPath('checkout-invalid.png'), fullPage: true });
});

test('checkout backend: real valid submission surfaces service state', async ({ page }, info) => {
  await addShirt(page);
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout', exact: true }).click();
  for (const [name, value] of Object.entries({ 'Email address': 'storefront-playwright@example.com', 'Full name': 'Storefront Test', 'Street address': '123 Test Street', City: 'New York', 'ZIP code': '10001' })) {
    await page.getByRole('textbox', { name, exact: true }).fill(value);
  }
  await page.getByRole('combobox', { name: 'State', exact: true }).selectOption({ label: 'New York' });
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('/api/checkout'));
  await page.getByRole('button', { name: 'Place demo order', exact: true }).click();
  const response = await responsePromise;
  const body = await response.text();
  writeFileSync(info.outputPath('checkout-response.json'), JSON.stringify({ timestamp: new Date().toISOString(), status: response.status(), url: response.url(), body }, null, 2));
  if (response.status() === 503) {
    expect(body).toMatch(/configur|backend|unavailable/i);
    await expect(page.getByRole('alert').filter({ hasText: /configur|backend|unavailable/i })).toBeVisible();
    await expect(page).toHaveURL(`${ORIGIN}/checkout`);
    await expect(page.getByRole('button', { name: 'Place demo order', exact: true })).toBeEnabled();
    await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue('Storefront Test');
    await expect(page.getByRole('complementary', { name: 'Your good finds', exact: true })).toContainText(SHIRT);
  } else {
    expect(response.ok(), body).toBe(true);
    await expect(page).toHaveURL(/confirmation|order/);
    await expect(page.locator('main')).toContainText(/receipt|order|confirmed/i);
  }
  await page.screenshot({ path: info.outputPath('checkout-backend-state.png'), fullPage: true });
});

test('account and orders guard preserve return destination', async ({ page }, info) => {
  for (const path of ['/account', '/orders']) {
    expect((await ready(page, path))?.status()).toBe(200);
    await expect(page.getByText('Sign in to your Everyday account to find your saved details and demo orders, all in one place.', { exact: true })).toBeVisible();
    const link = page.getByRole('link', { name: 'Sign in to Everyday', exact: true });
    await expect(link).toHaveAttribute('href', `/sign-in?next=${encodeURIComponent(path)}`);
    await link.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back.');
    const unconfigured = page.getByRole('status').filter({ hasText: 'Account services aren’t configured yet.' });
    const unconfiguredCount = await unconfigured.count();
    writeFileSync(info.outputPath(`${path.slice(1)}-backend-state.txt`), `${new Date().toISOString()} unconfiguredNotice=${unconfiguredCount}`);
    if (unconfiguredCount) {
      await expect(unconfigured).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeDisabled();
    } else {
      await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeEditable();
      await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeEnabled();
    }
  }
});

test('404 missing route and product recover through collection link', async ({ page }) => {
  await ready(page, '/');
  for (const path of ['/not-a-real-storefront-route', '/product/does-not-exist-storefront']) {
    const response = await ready(page, path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This find has wandered off.', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the collection', exact: true }).click();
    await expect(page).toHaveURL(`${ORIGIN}/shop`);
    await expect(cards(page)).toHaveCount(12);
  }
});
