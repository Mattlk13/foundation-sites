import { test, expect } from 'playwright/test';
import { open, rect, token, expectNoChildMargins, axe } from '../lib/layout.js';

test.describe('cover', () => {
	test('is at least as tall as the viewport', async ({ page }) => {
		await open(page, 'cover');
		const height = await page.evaluate(() => window.innerHeight);
		expect((await rect(page, '#cover')).height).toBeGreaterThanOrEqual(height - 1);
	});

	test('centers the data-center child between header and footer', async ({ page }) => {
		await open(page, 'cover');
		const [header, center, footer] = await Promise.all([rect(page, '#header'), rect(page, '#center'), rect(page, '#footer')]);
		const midpoint = (header.bottom + footer.top) / 2;
		expect((center.top + center.bottom) / 2).toBeCloseTo(midpoint, 0);
	});

	test('honours --yeti-cover-height', async ({ page }) => {
		await open(page, 'cover');
		expect((await rect(page, '#short')).height).toBeCloseTo(400, 1);
	});

	test('data-height names the least height, from the scale or the viewport', async ({ page }) => {
		await open(page, 'cover');
		expect((await rect(page, '#md-band')).height).toBeCloseTo(await token(page, '--yeti-height-md'), 0);
		const viewport = await page.evaluate(() => window.innerHeight);
		expect((await rect(page, '#half-band')).height).toBeCloseTo(viewport / 2, 0);
		// Falsification: the two bands are different heights, and neither is the full cover.
		expect((await rect(page, '#md-band')).height).not.toBeCloseTo((await rect(page, '#half-band')).height, 0);
		expect((await rect(page, '#md-band')).height).toBeLessThan((await rect(page, '#cover')).height);
	});

	test('content taller than the band grows it rather than being cut off', async ({ page }) => {
		await open(page, 'cover');
		const [band, tall] = await Promise.all([rect(page, '#overflow'), rect(page, '#tall')]);
		expect(band.height).toBeGreaterThan(await token(page, '--yeti-height-sm'));
		expect(band.height).toBeGreaterThanOrEqual(tall.height);
		expect(tall.bottom).toBeLessThanOrEqual(band.bottom + 1);
	});

	test('children have no margins', async ({ page }) => {
		await open(page, 'cover');
		await expectNoChildMargins(page, '.cover');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'cover');
		expect(await axe(page)).toEqual([]);
	});
});
