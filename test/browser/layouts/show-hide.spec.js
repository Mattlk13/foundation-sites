import { test, expect } from 'playwright/test';
import { stage, rect, style, axe, painted } from '../lib/layout.js';

// md is --yeti-width-md, 32rem, which is 512px at the default root size. The
// two stage widths sit either side of it with room to spare, so a change to
// the fluid type scale can never drift one of them across the line.
const NARROW = 400;
const WIDE = 900;

const open = async (page, width) => {
	const response = await page.goto('/test/browser/fixtures/layouts/show-hide.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};

test.describe('data-show and data-hide', () => {
	test('below the width, data-show is gone and data-hide is there', async ({ page }) => {
		await open(page, NARROW);
		expect(await style(page, '#wide', 'display')).toBe('none');
		expect((await rect(page, '#wide')).width).toBe(0);
		expect(await style(page, '#narrow', 'display')).not.toBe('none');
		expect((await rect(page, '#narrow')).width).toBeGreaterThan(0);
		expect((await rect(page, '#always')).width).toBeGreaterThan(0);
	});

	test('at the width and above, the two swap over', async ({ page }) => {
		await open(page, WIDE);
		expect(await style(page, '#wide', 'display')).not.toBe('none');
		expect((await rect(page, '#wide')).width).toBeGreaterThan(0);
		expect(await style(page, '#narrow', 'display')).toBe('none');
		expect((await rect(page, '#narrow')).width).toBe(0);
		expect((await rect(page, '#always')).width).toBeGreaterThan(0);
	});

	test('the markers read the container and not the window', async ({ page }) => {
		await open(page, NARROW);
		// Same window at both readings; only the container changed. If either
		// marker were reading the viewport, this would not move.
		expect(await style(page, '#wide', 'display')).toBe('none');
		await stage(page, WIDE);
		await painted(page);
		expect(await style(page, '#wide', 'display')).not.toBe('none');
	});

	test('with no size container above them, neither marker hides anything', async ({ page }) => {
		await open(page, NARROW);
		expect(await style(page, '#loose-show', 'display')).not.toBe('none');
		expect(await style(page, '#loose-hide', 'display')).not.toBe('none');
		await stage(page, WIDE);
		await painted(page);
		expect(await style(page, '#loose-show', 'display')).not.toBe('none');
		expect(await style(page, '#loose-hide', 'display')).not.toBe('none');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, NARROW);
		expect(await axe(page)).toEqual([]);
	});
});
