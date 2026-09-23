import { test, expect } from 'playwright/test';
import { stage, style, rect, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/lift.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};

test.describe('lift', () => {
	test('the pointer raises the card and deepens its shadow', async ({ page }) => {
		await open(page);
		const before = await rect(page, '#card');
		const shadowBefore = await style(page, '#card', 'box-shadow');
		await page.hover('#card');
		await painted(page);
		const after = await rect(page, '#card');
		expect(after.top).toBeLessThan(before.top);
		expect(await style(page, '#card', 'box-shadow')).not.toBe(shadowBefore);
	});

	test('data-lift="scale" grows the card instead of raising it', async ({ page }) => {
		await open(page);
		const before = await rect(page, '#scaled');
		expect(await style(page, '#scaled', 'scale')).toBe('none');
		await page.hover('#scaled');
		await painted(page);
		const after = await rect(page, '#scaled');
		expect(await style(page, '#scaled', 'scale')).toBe('1.02');
		expect(await style(page, '#scaled', 'translate')).toBe('none');
		// Grown about its centre: wider and taller, top edge a little higher.
		expect(after.width).toBeGreaterThan(before.width);
		expect(after.top).toBeLessThan(before.top);
	});

	test('a keyboard inside the card lifts it too', async ({ page, browserName }) => {
		// Headless WebKit mirrors Safari's "Full Keyboard Access off" default
		// and does not move focus on Tab at all, the same reason button.spec
		// skips it there. The selector is exercised in chromium and firefox.
		test.skip(browserName === 'webkit', 'headless WebKit does not Tab');
		await open(page);
		expect(await style(page, '#card', 'translate')).toBe('none');
		// Tab, not focus(), because the lift answers :focus-visible and a
		// programmatic focus on a link does not always match it.
		await page.keyboard.press('Tab');
		await expect(page.locator('#link')).toBeFocused();
		await painted(page);
		expect(await style(page, '#card', 'translate')).not.toBe('none');
	});

	test('a card without the class never moves', async ({ page }) => {
		await open(page);
		const before = await rect(page, '#still');
		await page.hover('#still');
		await painted(page);
		expect(await rect(page, '#still')).toEqual(before);
	});

	test('under reduced motion the card stops moving and keeps the deeper shadow', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		const before = await rect(page, '#card');
		const shadowBefore = await style(page, '#card', 'box-shadow');
		await page.hover('#card');
		await painted(page);
		// Not "moves instantly": does not move at all. A collapsed duration
		// alone would still put the card a quarter of a rem up, in one frame,
		// under a cursor that is already there.
		expect((await rect(page, '#card')).top).toBeCloseTo(before.top, 1);
		// A zero distance computes as "none" in some engines and as an explicit
		// zero in others; both mean the card stayed put.
		expect(['none', '0px', '0px 0px']).toContain(await style(page, '#card', 'translate'));
		expect(await style(page, '#card', 'box-shadow')).not.toBe(shadowBefore);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
