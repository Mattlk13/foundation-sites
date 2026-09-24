import { test, expect } from 'playwright/test';
import { stage, style, rect, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/enter.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

const delays = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => parseFloat(getComputedStyle(el).animationDelay)), selector);
const settled = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

test.describe('enter', () => {
	test('data-enter picks which arrival runs, and it runs once', async ({ page }) => {
		await open(page);
		expect(await style(page, '#fade', 'animation-name')).toBe('yeti-enter-fade');
		expect(await style(page, '#rise', 'animation-name')).toBe('yeti-enter-rise');
		expect(await style(page, '#scale', 'animation-name')).toBe('yeti-enter-scale');
		expect(await style(page, '#fall', 'animation-name')).toBe('yeti-enter-fall');
		expect(await style(page, '#slide', 'animation-name')).toBe('yeti-enter-slide-start');
		expect(await style(page, '#slide-end', 'animation-name')).toBe('yeti-enter-slide-end');
		// Logical sides: the start edge of a right-to-left page is the right one.
		expect(await style(page, '#slide-rtl', 'animation-name')).toBe('yeti-enter-slide-end');
		expect(await style(page, '#rise', 'animation-iteration-count')).toBe('1');
	});

	test('nothing but the animation ever hides the element', async ({ page }) => {
		await open(page);
		expect(await style(page, '#fade', 'animation-fill-mode')).toBe('backwards');
		// Take the animation away and read what is left. This is the state a
		// browser that cannot run the animation is in, and the whole design
		// rests on it being visible: an .enter { opacity: 0 } outside the
		// keyframes would read 0 here and strand every such reader.
		const bare = await page.evaluate(() => ['fade', 'rise', 'scale', 'fall', 'slide', 'view'].map((id) => {
			const el = document.getElementById(id);
			for (const animation of el.getAnimations()) animation.cancel();
			return getComputedStyle(el).opacity;
		}));
		expect(bare).toEqual(['1', '1', '1', '1', '1', '1']);
	});

	test('a risen element ends exactly where the layout put it', async ({ page }) => {
		await open(page);
		await painted(page);
		const risen = await rect(page, '#rise');
		const twin = await rect(page, '#rise-twin');
		// The twin is the next paragraph in the same stack, so the one that
		// rose must have landed a whole row above it, back at zero offset.
		expect(await style(page, '#rise', 'translate')).toBe('none');
		expect(risen.bottom).toBeLessThan(twin.top);
		expect(risen.left).toBeCloseTo(twin.left, 0);
	});

	test('an element on its own reads --yeti-enter-delay, and a stagger\'s count is unchanged', async ({ page }) => {
		await open(page);
		expect(await style(page, '#delayed', 'animation-delay')).toBe('0.8s');
		expect(await style(page, '#fade', 'animation-delay')).toBe('0s');
		// A staggered parent's children are still counted from the parent's delay; find the fixture's stagger container.
		const counted = await delays(page, '[data-stagger] > *');
		expect(counted.length).toBeGreaterThan(2);
		expect(counted[1] - counted[0]).toBeCloseTo(0.2, 2);
	});

	test('data-stagger animates the children instead of the element', async ({ page }) => {
		await open(page);
		expect(await style(page, '#stagger', 'animation-name')).toBe('none');
		expect(await style(page, '#s1', 'animation-name')).toBe('yeti-enter-rise');
		expect(await page.evaluate(() => document.getElementById('stagger').getAnimations().length)).toBe(0);
	});

	test('each staggered child waits one more step than the one before it, up to the ninth', async ({ page }) => {
		await open(page);
		const found = await delays(page, '#stagger > *');
		const step = found[1];
		expect(step).toBeGreaterThan(0);
		// Eleven children: eight counted rules, then the floor, which the
		// ninth, tenth and eleventh all share.
		const expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8];
		expect(found.length).toBe(expected.length);
		found.forEach((delay, i) => expect(delay).toBeCloseTo(expected[i] * step, 3));
	});

	test('a scroll-driven arrival is never left invisible where view() is missing', async ({ page }) => {
		await open(page);
		// A spacer puts #view well below the fold, so the two paths are really
		// different: one is waiting for a scroll, the other has already run.
		expect((await rect(page, '#view')).top).toBeGreaterThan(page.viewportSize().height);
		await painted(page);
		const supported = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'));
		const before = Number(await style(page, '#view', 'opacity'));
		if (supported) expect(before).toBeLessThan(1);
		// Without view() the @supports block never applied, so the element is
		// on the ordinary load-timed animation and is already here.
		else expect(before).toBe(1);
		await page.evaluate(() => document.getElementById('view').scrollIntoView());
		await settled(page);
		await painted(page);
		// Opaque, not exactly the string "1". #view is the last thing in the
		// fixture, so the page cannot scroll past the end of the entry range,
		// and a progress timeline stopped a hair short of its end reports a
		// fraction: CI sees 0.999935 in Chromium and 0.999946 in WebKit where
		// this machine happens to round to 1. The claim being made is that the
		// element is not left invisible, and an animation that never ran would
		// report 0, not a rounding error's distance from 1.
		expect(Number(await style(page, '#view', 'opacity'))).toBeGreaterThan(0.99);
	});

	test('reduced motion leaves even a scroll-driven arrival present at once', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		await painted(page);
		// Still below the fold and never scrolled to, and still visible: a
		// scroll timeline is paced by the scroll and would ignore the
		// collapsed duration, so the preference has to switch it off outright.
		expect((await rect(page, '#view')).top).toBeGreaterThan(page.viewportSize().height);
		expect(await style(page, '#view', 'opacity')).toBe('1');
		expect(parseFloat(await style(page, '#fade', 'animation-duration'))).toBeLessThanOrEqual(0.01);
		// The step goes with it, or the last card still waits most of a second
		// and then pops into place.
		expect(new Set(await delays(page, '#stagger > *'))).toEqual(new Set([0]));
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		await painted(page);
		expect(await axe(page)).toEqual([]);
	});
});
