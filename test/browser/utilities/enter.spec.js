import { test, expect } from 'playwright/test';
import { stage, style, rect, axe, painted, withoutModule } from '../lib/layout.js';

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

	test('reduced motion collapses a lone element\'s delay, so a delayed element is present at once', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		expect(await style(page, '#delayed', 'animation-delay')).toBe('0s');
		await settled(page);
		expect(await style(page, '#delayed', 'opacity')).toBe('1');
	});

	test('data-once pauses an off-screen arrival until it is first seen, and does not replay it', async ({ page }) => {
		await open(page);
		// Below the fold, like #view, so the paused state is worth something.
		expect((await rect(page, '#once')).top).toBeGreaterThan(page.viewportSize().height);
		const state = (page) => page.evaluate(() => {
			const animation = document.getElementById('once').getAnimations()[0];
			return animation && { playState: animation.playState, currentTime: animation.currentTime };
		});
		// enter.js pauses it from an 'animationstart' listener, which the
		// browser dispatches on its own rendering schedule rather than in
		// script order, so the pause can land a frame or two after load.
		await expect.poll(async () => (await state(page))?.playState).toBe('paused');
		await page.evaluate(() => document.getElementById('once').scrollIntoView());
		await settled(page);
		await painted(page);
		expect(['running', 'finished']).toContain((await state(page))?.playState ?? 'finished');
		expect(await style(page, '#once', 'opacity')).toBe('1');
		const afterFirstView = (await state(page))?.currentTime;
		// Away, then back: a second crossing must not restart what already ran.
		await page.evaluate(() => window.scrollTo(0, 0));
		await settled(page);
		await page.evaluate(() => document.getElementById('once').scrollIntoView());
		await settled(page);
		const afterReturn = await state(page);
		if (afterReturn) expect(afterReturn.currentTime).toBeGreaterThanOrEqual(afterFirstView ?? 0);
		expect(await style(page, '#once', 'opacity')).toBe('1');
	});

	test('a staggered data-once list is never paused a second time once it has been released', async ({ page }) => {
		await open(page);
		expect((await rect(page, '#once-stagger')).top).toBeGreaterThan(page.viewportSize().height);
		// Brief enough that most of the nine children have not yet reached
		// their own delayed 'animationstart': only the earliest ones are
		// paused-and-resumed here, the rest are still silently ticking
		// through a delay enter.js has not touched yet.
		await page.evaluate(() => document.getElementById('once-stagger').scrollIntoView());
		await page.waitForTimeout(150);
		await page.evaluate(() => window.scrollTo(0, 0));
		// Long enough for every child's own delay and duration to have run
		// its course (the ninth waits 1.6s and then takes 0.6s), whether or
		// not the page is looking at it: once released, enter.js must leave
		// every one of them alone rather than catching a late
		// 'animationstart' and pausing it with nothing left to resume it.
		await page.waitForTimeout(3000);
		await page.evaluate(() => document.getElementById('once-stagger').scrollIntoView());
		await settled(page);
		await painted(page);
		const opacities = await page.evaluate(() => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => getComputedStyle(document.getElementById(`os${n}`)).opacity));
		expect(opacities).toEqual(Array(9).fill('1'));
	});

	test('data-once defers to data-view where a scroll timeline exists, and still arrives through the fallback', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await open(page);
		expect((await rect(page, '#view-once')).top).toBeGreaterThan(page.viewportSize().height);
		// A single scrollIntoView() jump lands past the crossing in one frame,
		// with the element already plainly on screen by the time
		// 'animationstart' fires, which never exercises the bug: a gradual
		// scroll, one small step and a frame at a time, is what actually
		// catches the animation mid-crossing, the way a reader's own scroll
		// would.
		const top = await page.evaluate(() => window.scrollY + document.getElementById('view-once').getBoundingClientRect().top);
		for (let offset = -350; offset <= 400; offset += 10) {
			await page.evaluate((y) => window.scrollTo(0, Math.max(0, y)), top - page.viewportSize().height + offset);
			await settled(page);
		}
		await painted(page);
		// Whichever path drove it there — data-view's own scroll timeline
		// where it exists, data-once's pause-and-play where it does not —
		// the element must actually arrive, not strand paused partway, and
		// must never throw doing it.
		expect(errors).toEqual([]);
		expect(Number(await style(page, '#view-once', 'opacity'))).toBeGreaterThan(0.99);
	});

	test('an element far taller than the viewport still crosses the threshold and arrives', async ({ page }) => {
		await open(page);
		expect((await rect(page, '#tall')).top).toBeGreaterThan(page.viewportSize().height);
		// A short, realistic wait before scrolling: 'animationstart' fires on
		// the browser's own schedule, and scrolling before it has fired would
		// leave the element looking "already in view" to the listener
		// instead of actually exercising the threshold this test is for.
		await page.waitForTimeout(300);
		expect(await style(page, '#tall', 'opacity')).not.toBe('1');
		// Centred in the viewport: an 800vh element can never show 15% of its
		// own height, the ratio the old single threshold asked for.
		await page.evaluate(() => {
			const el = document.getElementById('tall');
			const top = window.scrollY + el.getBoundingClientRect().top;
			window.scrollTo(0, top + el.offsetHeight / 2 - window.innerHeight / 2);
		});
		await settled(page);
		await painted(page);
		expect(await style(page, '#tall', 'opacity')).toBe('1');
	});

	test('without the module, data-once arrives on load like any other .enter', async ({ page }) => {
		await withoutModule(page, 'enter');
		await open(page);
		await painted(page);
		expect(await style(page, '#once', 'opacity')).toBe('1');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		await painted(page);
		expect(await axe(page)).toEqual([]);
	});
});
