import { test, expect } from 'playwright/test';
import { rect, px, style, axe, painted } from './lib/layout.js';

test.describe('themes', () => {
	test('soft renders pill buttons and rounded cards', async ({ page }) => {
		expect((await page.goto('/test/browser/fixtures/themes/soft.html')).status()).toBe(200);
		const r = await rect(page, '.button');
		expect(await px(page, '.button', 'border-top-left-radius')).toBeGreaterThanOrEqual(r.height / 2);
		expect(await px(page, '.card', 'border-top-left-radius')).toBeGreaterThanOrEqual(20);
		expect(await style(page, '#t-raised-short', 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
		expect(await style(page, '#t-raised-short', 'box-shadow')).not.toBe('none');
		expect(await axe(page)).toEqual([]);
	});

	test('soft\'s shadow colour still flips with the colour scheme', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'light' });
		expect((await page.goto('/test/browser/fixtures/themes/soft.html')).status()).toBe(200);
		const light = await style(page, '#t-raised-short', 'box-shadow');
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.reload();
		const dark = await style(page, '#t-raised-short', 'box-shadow');
		expect(dark).not.toBe(light);
	});

	test('sharp renders square corners and thick borders', async ({ page }) => {
		expect((await page.goto('/test/browser/fixtures/themes/sharp.html')).status()).toBe(200);
		expect(await px(page, '.button', 'border-top-left-radius')).toBe(0);
		expect(await px(page, '.card', 'border-top-width')).toBe(2);
		expect(await style(page, '#t-raised-short', 'box-shadow')).not.toBe('none');
		expect(await axe(page)).toEqual([]);
	});

	test('sharp reaches bare HTML as well as the components', async ({ page }) => {
		expect((await page.goto('/test/browser/fixtures/themes/sharp.html')).status()).toBe(200);
		// The base layer once kept literal widths and weights after the tokens
		// existed, so under this theme a bare input was 1px beside a 2px field
		// input, and a bare label 600 beside a 700 one. The card was the only
		// thing this suite measured, which is how that went unseen.
		expect(await px(page, '#bare', 'border-top-width')).toBe(await px(page, '#email', 'border-top-width'));
		expect(await px(page, '#bare', 'border-top-width')).toBe(2);
		expect(await px(page, '#bare-box', 'border-top-width')).toBe(2);
		expect(await style(page, '#bare-label', 'font-weight')).toBe(await style(page, '#email-label', 'font-weight'));
		expect(await style(page, '#bare-label', 'font-weight')).toBe('700');
	});

	test('a theme\'s element rules beat the base and lose to every layout and component', async ({ page }) => {
		expect((await page.goto('/test/browser/fixtures/themes/element.html')).status()).toBe(200);
		await painted(page);
		const probe = (declaration) => page.evaluate((d) => {
			const el = document.body.appendChild(document.createElement('div'));
			el.style.cssText = d;
			const cs = getComputedStyle(el);
			const out = { color: cs.color, width: el.getBoundingClientRect().width };
			el.remove();
			return out;
		}, declaration);
		// Above the base: the theme's heading case and link color apply to bare elements.
		expect(await style(page, '#bare', 'text-transform')).toBe('uppercase');
		expect(await style(page, '#plain', 'color')).toBe('rgb(200, 0, 0)');
		// Below the components: a link that is a button keeps the button's on-color, at rest and on hover.
		const { color: onPrimary } = await probe('color: var(--yeti-on-primary)');
		expect(await style(page, '#cta', 'color')).toBe(onPrimary);
		await page.hover('#cta');
		await painted(page);
		expect(await style(page, '#cta', 'color')).toBe(onPrimary);
		expect(await style(page, '#cta', 'color')).not.toBe('rgb(0, 0, 200)');
		// Below the layouts: the stack owns the gap between its children, not the theme's p margins.
		const { width: gap } = await probe('width: var(--yeti-space-md)');
		const { width: threeRem } = await probe('width: 3rem');
		const between = (await rect(page, '#p2')).top - (await rect(page, '#p1')).bottom;
		expect(between).toBeCloseTo(gap, 0);
		expect(between).not.toBeCloseTo(threeRem, 0);
	});
});
