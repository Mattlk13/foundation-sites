import { test, expect } from 'playwright/test';
import { open, style, rect, token, expectNoChildMargins, axe } from '../lib/layout.js';

test.describe('scroller', () => {
	test('overflows and scrolls instead of wrapping', async ({ page }) => {
		await open(page, 'scroller', 400);
		const overflow = await page.evaluate(() => { const el = document.getElementById('scroller'); return el.scrollWidth > el.clientWidth; });
		expect(overflow).toBe(true);
		const [s1, s2] = await Promise.all([rect(page, '#s1'), rect(page, '#s2')]);
		expect(s2.top).toBeCloseTo(s1.top, 1);
		expect(s2.left - s1.right).toBeCloseTo(await token(page, '--yeti-space-md'), 1);
	});

	test('snaps only with data-snap, and data-width sizes every item', async ({ page }) => {
		await open(page, 'scroller', 400);
		expect(await style(page, '#scroller', 'scroll-snap-type')).toBe('none');
		expect((await style(page, '#snapped', 'scroll-snap-type')).startsWith('x')).toBe(true);
		expect((await rect(page, '#n1')).width).toBeCloseTo(await token(page, '--yeti-width-xs'), 1);
	});

	test('data-justify says where a snapping item settles', async ({ page }) => {
		await open(page, 'scroller', 400);
		expect(await style(page, '#n2', 'scroll-snap-align')).toBe('start');
		expect(await style(page, '#c2', 'scroll-snap-align')).toBe('center');
		expect(await style(page, '#e2', 'scroll-snap-align')).toBe('end');
		// The setting only matters with data-snap: the plain track's children have none.
		expect(await style(page, '#s2', 'scroll-snap-align')).toBe('none');
		// And it takes effect: scrolled to the third item, a centering track settles it in the middle.
		await page.evaluate(() => { const t = document.getElementById('centered'); t.scrollLeft = document.getElementById('c3').offsetLeft; });
		await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
		const [track, c3] = await Promise.all([rect(page, '#centered'), rect(page, '#c3')]);
		expect((c3.left + c3.right) / 2).toBeCloseTo((track.left + track.right) / 2, 0);
	});

	test('receives focus from the keyboard', async ({ page }) => {
		await open(page, 'scroller', 400);
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('scroller');
	});

	test('a scroller child is exempt from the media cap', async ({ page }) => {
		await open(page, 'scroller', 400);
		const width = (await rect(page, '#wide-svg')).width;
		expect(width).toBeCloseTo(900, 0);
		const overflow = await page.evaluate(() => { const el = document.getElementById('wide'); return el.scrollWidth > el.clientWidth; });
		expect(overflow).toBe(true);
	});

	test('a positioned child stays inside the track', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page, 'scroller', 390);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
		// A child bound to the track's own scrolling area moves with it; one
		// still positioned against the page would stay put while the track
		// scrolled away beneath it, landing outside the track's box.
		await page.evaluate(() => { const el = document.getElementById('hidden-head'); el.scrollLeft = el.scrollWidth; });
		const track = await rect(page, '#hidden-head');
		const span = await page.evaluate(() => document.querySelector('#hidden-head .visually-hidden').getBoundingClientRect().toJSON());
		expect(span.left).toBeGreaterThanOrEqual(track.left - 1);
		expect(span.right).toBeLessThanOrEqual(track.right + 1);
	});

	test('children have no margins', async ({ page }) => {
		await open(page, 'scroller');
		await expectNoChildMargins(page, '.scroller');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'scroller');
		expect(await axe(page)).toEqual([]);
	});
});
