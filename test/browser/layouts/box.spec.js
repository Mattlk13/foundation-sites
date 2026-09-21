import { test, expect } from 'playwright/test';
import { open, px, token, style, axe } from '../lib/layout.js';

test.describe('box', () => {
	test('padding equals the gap token', async ({ page }) => {
		await open(page, 'box');
		const md = await token(page, '--yeti-space-md');
		for (const side of ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']) {
			expect(await px(page, '#box', side)).toBeCloseTo(md, 1);
		}
		expect(await px(page, '#bordered', 'padding-top')).toBeCloseTo(await token(page, '--yeti-space-lg'), 1);
	});

	test('data-border draws a one-pixel border', async ({ page }) => {
		await open(page, 'box');
		expect(await px(page, '#box', 'border-top-width')).toBe(0);
		expect(await px(page, '#bordered', 'border-top-width')).toBe(await token(page, '--yeti-border-width'));
	});

	test('data-surface fills the box from the matching token, and nothing fills it without one', async ({ page }) => {
		await open(page, 'box');
		// A box with no data-surface is transparent: the thing behind it shows
		// through, which is what makes it safe to put one inside a card. #box
		// is not the one to ask, because the fixture gives it an inline colour
		// from the days when a box had no other way to be seen.
		expect(await style(page, '#plain', 'background-color')).toBe('rgba(0, 0, 0, 0)');
		// Each value paints its own token. Resolved by painting the token on a
		// probe, because the tokens are authored in oklch and the computed
		// value comes back in whatever form the engine prefers.
		for (const [id, name] of [['#base-surface', '--yeti-color-surface'], ['#raised', '--yeti-color-surface-raised'], ['#sunken', '--yeti-color-surface-sunken']]) {
			const expected = await page.evaluate((n) => {
				const probe = document.createElement('div');
				probe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
				document.body.append(probe);
				const got = getComputedStyle(probe).backgroundColor;
				probe.remove();
				return got;
			}, name);
			expect(await style(page, id, 'background-color')).toBe(expected);
		}
	});

	test('the three surfaces are visibly different from each other', async ({ page }) => {
		await open(page, 'box');
		const seen = [];
		for (const id of ['#base-surface', '#raised', '#sunken']) seen.push(await style(page, id, 'background-color'));
		expect(new Set(seen).size).toBe(3);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'box');
		expect(await axe(page)).toEqual([]);
	});
});
