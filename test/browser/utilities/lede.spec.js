import { test, expect } from 'playwright/test';
import { stage, rect, px, token, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/lede.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};

test.describe('lede', () => {
	test('a lede is set larger than the prose it introduces', async ({ page }) => {
		await open(page);
		const [lede, body] = await Promise.all([px(page, '#lede', 'font-size'), px(page, '#body', 'font-size')]);
		expect(lede).toBeGreaterThan(body);
		expect(lede).toBeCloseTo(await token(page, '--yeti-lede-size'), 0);
	});

	test('a lede reads on a shorter line than the body, since it is set larger', async ({ page }) => {
		await open(page, 1400);
		const [lede, body] = await Promise.all([rect(page, '#lede'), rect(page, '#body')]);
		expect(lede.width).toBeLessThan(body.width);
	});

	test('a lede inside a layout is still a lede, which a rule about position could not manage', async ({ page }) => {
		await open(page);
		const [wrapped, lede] = await Promise.all([px(page, '#wrapped-lede', 'font-size'), px(page, '#lede', 'font-size')]);
		expect(wrapped).toBeCloseTo(lede, 1);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
