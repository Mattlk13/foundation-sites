import { test, expect } from 'playwright/test';
import { rect, style, token, painted } from '../lib/layout.js';

const open = async (page) => {
	const response = await page.goto('/test/browser/fixtures/layouts/sticky.html');
	expect(response.status()).toBe(200);
	await painted(page);
};
// A sticky box's offset is resolved in the frame after the scroll, so a
// reading taken in the same turn as the scroll is the position it left.
const scrollTo = async (page, y) => {
	await page.evaluate((amount) => window.scrollTo(0, amount), y);
	await page.evaluate(() => new Promise(requestAnimationFrame));
};

test.describe('data-sticky', () => {
	test('a sidebar child stops at the offset while the content scrolls past it', async ({ page }) => {
		await open(page);
		expect(await style(page, '#pinned', 'position')).toBe('sticky');
		const before = await rect(page, '#pinned');
		expect(before.top).toBeGreaterThan(20);
		await scrollTo(page, 600);
		const after = await rect(page, '#pinned');
		expect(after.top).toBeCloseTo(await token(page, '--yeti-sticky-offset'), 0);
	});

	test('a child without the marker scrolls away with everything else', async ({ page }) => {
		await open(page);
		const before = await rect(page, '#loose-side');
		await scrollTo(page, 600);
		const after = await rect(page, '#loose-side');
		expect(before.top - after.top).toBeCloseTo(600, 0);
	});

	test('the pinned child takes its own height, not the row it is in', async ({ page }) => {
		await open(page);
		const [pinned, row] = await Promise.all([rect(page, '#pinned'), rect(page, '#sidebar')]);
		expect(row.height).toBeGreaterThan(1000);
		expect(pinned.height).toBeLessThan(200);
	});

	test('a sticky child of a stack keeps the full width of the column, and still sticks', async ({ page }) => {
		await open(page);
		const [pinned, stack] = await Promise.all([rect(page, '#stack-pinned'), rect(page, '#stack')]);
		expect(pinned.width).toBeCloseTo(stack.width, 0);
		// A column stretches its children on the inline axis, which costs a
		// sticky child nothing, so no layout rule takes this one out of the
		// stretch and it is as wide as the column it is in. Scrolled from its
		// own top rather than a counted distance, so a later edit to the
		// fixture above it cannot quietly stop this from sticking.
		await scrollTo(page, stack.top + 200);
		expect((await rect(page, '#stack-pinned')).top).toBeCloseTo(await token(page, '--yeti-sticky-offset'), 0);
	});
});
