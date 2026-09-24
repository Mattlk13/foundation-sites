import { test, expect } from 'playwright/test';
import { stage, rect, token, expectNoChildMargins, same, axe } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/recipes/hero.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

// The figure selector, shared by media and hero:
// > :is(img, video, picture), > :has(> :is(img, video, picture))

test.describe('hero recipe', () => {
	test('matches the composed form side by side and centers the row in the band', async ({ page }) => {
		await open(page, 1000);
		const [c, p, cc, pc, cf, pf] = await Promise.all([rect(page, '#classed'), rect(page, '#composed'), rect(page, '#c-copy'), rect(page, '#p-copy'), rect(page, '#c-figure'), rect(page, '#p-figure')]);
		same(cc, pc, c, p);
		same(cf, pf, c, p);
		expect(c.height).toBeCloseTo(await page.evaluate(() => window.innerHeight), 0);
		const rowTop = Math.min(cc.top, cf.top);
		const rowBottom = Math.max(cc.bottom, cf.bottom);
		expect((rowTop + rowBottom) / 2).toBeCloseTo((c.top + c.bottom) / 2, 0);
		expect(cf.width / cf.height).toBeCloseTo(4 / 3, 1);
	});

	test('matches the composed form stacked', async ({ page }) => {
		await open(page, 400);
		const [c, p, cc, pc, cf, pf] = await Promise.all([rect(page, '#classed'), rect(page, '#composed'), rect(page, '#c-copy'), rect(page, '#p-copy'), rect(page, '#c-figure'), rect(page, '#p-figure')]);
		same(cc, pc, c, p);
		same(cf, pf, c, p);
		expect(cf.top).toBeGreaterThanOrEqual(cc.bottom);
	});

	test('data-height names the band\'s least height', async ({ page }) => {
		await open(page);
		// xl is taller than the band's own content at this width, so the band is
		// exactly its named height; md would be outgrown by the picture and prove
		// only the minimum.
		expect((await rect(page, '#xl-band')).height).toBeCloseTo(await token(page, '--yeti-height-xl'), 0);
		// Falsification: the named band is not the viewport-tall hero beside it.
		expect((await rect(page, '#xl-band')).height).not.toBeCloseTo((await rect(page, '#classed')).height, 0);
	});

	test('data-side="start" moves a last-in-source figure to the start', async ({ page }) => {
		await open(page, 1000);
		const [copy, figure, band] = await Promise.all([rect(page, '#f-copy'), rect(page, '#f-figure'), rect(page, '#forced')]);
		expect(figure.right).toBeLessThan(copy.left);
		expect(band.height).toBeCloseTo(400, 0);
	});

	test('data-span on the children divides the row unequally, and stacks like the rest', async ({ page }) => {
		await open(page, 1000);
		const [copy, figure] = await Promise.all([rect(page, '#sp-copy'), rect(page, '#sp-figure')]);
		expect(figure.width / (figure.width + copy.width)).toBeCloseTo(0.6, 1);
		await open(page, 400);
		const [c, f] = await Promise.all([rect(page, '#sp-copy'), rect(page, '#sp-figure')]);
		expect(f.top).toBeGreaterThanOrEqual(c.bottom);
		expect(f.width).toBeCloseTo(c.width, 0);
	});

	test('children have no margins', async ({ page }) => {
		await open(page);
		await expectNoChildMargins(page, '.hero');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
