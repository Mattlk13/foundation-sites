// The starter page, tested where it lives rather than through a fixture copy.
// The screenshot suite walks only fixtures/, so this spec carries the page's
// own light and dark baselines, captured the way that suite captures them.
import { test, expect } from 'playwright/test';
import { axe, painted } from './lib/layout.js';

const open = async (page, width, height = 800) => {
	await page.setViewportSize({ width, height });
	const response = await page.goto('/src/starter/index.html');
	expect(response.status()).toBe(200);
	await painted(page);
};

const visible = (page, selector) => page.evaluate((s) => {
	const el = document.querySelector(s);
	const r = el.getBoundingClientRect();
	return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0;
}, selector);

test.describe('starter page', () => {
	for (const width of [390, 1280]) {
		test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
			await open(page, width);
			const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
			expect(scroll).toBeLessThanOrEqual(client);
		});
	}

	test('the skip link is the body\'s first child', async ({ page }) => {
		await open(page, 1280);
		const first = await page.evaluate(() => {
			const el = document.body.firstElementChild;
			return { tag: el.tagName, href: el.getAttribute('href'), target: !!document.querySelector(el.getAttribute('href')) };
		});
		expect(first).toEqual({ tag: 'A', href: '#content', target: true });
	});

	test('the nav shows its toggle on a phone and its links on a desktop', async ({ page }) => {
		await open(page, 390);
		expect(await visible(page, '.nav > button[popovertarget]')).toBe(true);
		expect(await visible(page, '.nav a[href="#features"]')).toBe(false);
		await open(page, 1280);
		expect(await visible(page, '.nav > button[popovertarget]')).toBe(false);
		expect(await visible(page, '.nav a[href="#features"]')).toBe(true);
	});

	test('the nav sits on the top edge once the page scrolls', async ({ page }) => {
		await open(page, 1280);
		await page.evaluate(() => window.scrollTo(0, 600));
		await expect.poll(() => page.evaluate(() => Math.abs(document.querySelector('.nav').getBoundingClientRect().top))).toBeLessThanOrEqual(1);
	});

	for (const scheme of ['light', 'dark']) {
		test(`has no accessibility violations in ${scheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page, 1280);
			expect(await axe(page)).toEqual([]);
		});
	}
});

test.describe('starter page screenshots', () => {
	test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are captured in Chromium only');

	for (const scheme of ['light', 'dark']) {
		test(`starter in ${scheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page, 1000);
			await expect(page).toHaveScreenshot(`starter-${scheme}.png`, { fullPage: true });
		});
	}
});
