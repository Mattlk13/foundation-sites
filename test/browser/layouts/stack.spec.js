import { test, expect } from 'playwright/test';
import { open, rect, token, expectNoChildMargins, axe } from '../lib/layout.js';

test.describe('stack', () => {
	test('gap between children equals the token', async ({ page }) => {
		await open(page, 'stack');
		const [a, b] = await Promise.all([rect(page, '#a'), rect(page, '#b')]);
		expect(b.top - a.bottom).toBeCloseTo(await token(page, '--yeti-space-md'), 1);
		const [sa, sb] = await Promise.all([rect(page, '#sa'), rect(page, '#sb')]);
		expect(sb.top - sa.bottom).toBeCloseTo(await token(page, '--yeti-space-sm'), 1);
	});

	test('data-space changes the gap before one child only', async ({ page }) => {
		await open(page, 'stack');
		const [xs, md, xl] = await Promise.all(['xs', 'md', 'xl'].map((s) => token(page, `--yeti-space-${s}`)));
		const [stack, e1, e2, e3, e4] = await Promise.all(['#spaced', '#e1', '#e2', '#e3', '#e4'].map((s) => rect(page, s)));
		expect(e2.top - e1.bottom).toBeCloseTo(xl, 1);
		expect(e3.top - e2.bottom).toBeCloseTo(xs, 1);
		expect(e4.top - e3.bottom).toBeCloseTo(md, 1);
		// The first child has no gap before it, so its marker does nothing.
		expect(e1.top).toBeCloseTo(stack.top, 1);
		// Falsification: the three gaps are three different distances.
		expect(xl).toBeGreaterThan(md);
		expect(md).toBeGreaterThan(xs);
	});

	test('data-split pushes the child to the end', async ({ page }) => {
		await open(page, 'stack');
		const [stack, d] = await Promise.all([rect(page, '#stack'), rect(page, '#d')]);
		expect(d.bottom).toBeCloseTo(stack.bottom, 1);
		const c = await rect(page, '#c');
		expect(d.top - c.bottom).toBeGreaterThan(await token(page, '--yeti-space-md'));
	});

	test('data-align="start" stops children stretching', async ({ page }) => {
		await open(page, 'stack');
		expect((await rect(page, '#sa')).width).toBeLessThan((await rect(page, '#stack-sm')).width);
		expect((await rect(page, '#a')).width).toBeCloseTo((await rect(page, '#stack')).width, 1);
	});

	test('data-fill makes the stack viewport-tall so data-split reaches the bottom', async ({ page }) => {
		await open(page, 'stack');
		const height = await page.evaluate(() => window.innerHeight);
		const [fill, bottom] = await Promise.all([rect(page, '#fill'), rect(page, '#f-bottom')]);
		expect(fill.height).toBeCloseTo(height, 0);
		expect(bottom.bottom).toBeCloseTo(fill.bottom, 1);
	});

	test('children have no margins', async ({ page }) => {
		await open(page, 'stack');
		await expectNoChildMargins(page, '.stack', '[data-split], [data-center], [data-space]');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'stack');
		expect(await axe(page)).toEqual([]);
	});
});
