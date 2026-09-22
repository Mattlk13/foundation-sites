import { test, expect } from 'playwright/test';
import { px, token, axe, painted } from '../lib/layout.js';

const open = async (page) => {
	const response = await page.goto('/test/browser/fixtures/utilities/fit.html');
	expect(response.status()).toBe(200);
	await painted(page);
};

test.describe('fit', () => {
	test('the same line is set larger in a wider container', async ({ page }) => {
		await open(page);
		const [narrow, wide] = await Promise.all([px(page, '#narrow-title', 'font-size'), px(page, '#wide-title', 'font-size')]);
		expect(wide).toBeGreaterThan(narrow + 5);
	});

	test('it is clamped at both ends of its pair', async ({ page }) => {
		await open(page);
		const [tiny, huge, min, max] = await Promise.all([
			px(page, '#tiny-title', 'font-size'),
			px(page, '#huge-title', 'font-size'),
			token(page, '--yeti-text-md'),
			token(page, '--yeti-text-3xl'),
		]);
		expect(tiny).toBeCloseTo(min, 0);
		expect(huge).toBeCloseTo(max, 0);
	});

	test('a pair sets its own ends, so a lower maximum grows more slowly', async ({ page }) => {
		await open(page);
		const [pair, wide, pairMin, pairMax] = await Promise.all([
			px(page, '#pair-title', 'font-size'),
			px(page, '#wide-title', 'font-size'),
			token(page, '--yeti-text-sm'),
			token(page, '--yeti-text-xl'),
		]);
		// Same container width, lower ceiling: sm-xl is behind md-3xl all the
		// way up, and is still inside its own two ends at this width.
		expect(pair).toBeLessThan(wide);
		expect(pair).toBeGreaterThan(pairMin);
		expect(pair).toBeLessThan(pairMax);
	});

	test('with no size container above it the line falls back to the viewport', async ({ page }) => {
		await open(page);
		expect(await px(page, '#bare-title', 'font-size')).toBeCloseTo(await token(page, '--yeti-text-3xl'), 0);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
