import { test, expect } from 'playwright/test';
import { open, rect, axe } from '../lib/layout.js';

const center = (r) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

test.describe('overlay', () => {
	test('the held child is centered over the overlay and the rest flows as usual', async ({ page }) => {
		await open(page, 'overlay');
		const [host, overlay, under] = await Promise.all([rect(page, '#host'), rect(page, '#overlay'), rect(page, '#under')]);
		expect(center(overlay).x).toBeCloseTo(center(host).x, 0);
		expect(center(overlay).y).toBeCloseTo(center(host).y, 0);
		expect(under.top).toBeCloseTo(host.top, 1);
		expect(host.height).toBeCloseTo(300, 0);
	});

	test('data-fixed centers it over the viewport', async ({ page }) => {
		await open(page, 'overlay');
		await page.evaluate(() => { document.getElementById('fixed').hidden = false; });
		const viewport = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
		const c = center(await rect(page, '#fixed'));
		expect(c.x).toBeCloseTo(viewport.x, 0);
		expect(c.y).toBeCloseTo(viewport.y, 0);
	});

	test('stays centered under direction: rtl', async ({ page }) => {
		await open(page, 'overlay');
		await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
		const [host, overlay] = await Promise.all([rect(page, '#host'), rect(page, '#overlay')]);
		expect(center(overlay).x).toBeCloseTo(center(host).x, 0);
		expect(center(overlay).y).toBeCloseTo(center(host).y, 0);
	});

	test('data-fill covers the box instead of centering in it', async ({ page }) => {
		await open(page, 'overlay');
		const [host, filled] = await Promise.all([rect(page, '#fill-host'), rect(page, '#filled')]);
		// Every edge, not just the size: a box that merely matched the host's
		// dimensions while sitting somewhere else would pass a size check.
		expect(filled.x).toBeCloseTo(host.x, 0);
		expect(filled.y).toBeCloseTo(host.y, 0);
		expect(filled.width).toBeCloseTo(host.width, 0);
		expect(filled.height).toBeCloseTo(host.height, 0);
	});

	test('without data-fill the held child is smaller than the box it covers', async ({ page }) => {
		await open(page, 'overlay');
		const [host, centred] = await Promise.all([rect(page, '#host'), rect(page, '#overlay')]);
		expect(centred.height).toBeLessThan(host.height);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'overlay');
		expect(await axe(page)).toEqual([]);
	});
});
