// Shared helpers for the layout fixtures. Every fixture wraps its layout in
// #stage; tests size the stage, not the viewport, because layouts respond to
// their container.
import { expect } from 'playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The fixtures link the source stylesheet, whose nested @import sheets land
// after the load event. An element therefore changes as they arrive, and where
// the component transitions that property the change is animated, so anything
// read during it is a value part way between unstyled and real. Waiting for the
// page's own animations to finish is what makes a reading at rest mean
// anything. A page with nothing running settles on the very first check.
export function painted(page) {
	// Polls rather than collecting each animation's own `finished` promise
	// once and awaiting them all: enter.js's data-once pauses an off-screen
	// arrival from an 'animationstart' listener, on the browser's own
	// rendering schedule rather than in script order, so an animation
	// sampled as still running can be paused a moment later — and a promise
	// already awaiting that animation's finish would then wait forever. A
	// poll simply stops caring about an animation the moment it is no
	// longer running, paused or finished alike, so a later pause ends the
	// wait exactly as a finish would.
	return page.evaluate(() => new Promise((resolve) => {
		const settled = () => document.getAnimations().every((animation) => (
			animation.playState !== 'running'
			// A spinner runs forever and stays 'running' forever; only a
			// finite-duration animation is worth waiting on at all, so an
			// endless one never holds this up.
			|| !Number.isFinite(animation.effect?.getComputedTiming?.().activeDuration ?? Infinity)
		));
		const tick = () => { if (settled()) resolve(); else requestAnimationFrame(tick); };
		tick();
	}));
}

export async function stage(page, width) {
	await page.evaluate((w) => { document.getElementById('stage').style.inlineSize = `${w}px`; }, width);
}

export async function open(page, name, width = 1000) {
	const response = await page.goto(`/test/browser/fixtures/layouts/${name}.html`);
	expect(response.status()).toBe(200);
	await stage(page, width);
}

export function rect(page, selector) {
	return page.evaluate((s) => {
		const r = document.querySelector(s).getBoundingClientRect();
		return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, right: r.right, bottom: r.bottom, left: r.left };
	}, selector);
}

export function rects(page, selector) {
	return page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => {
		const r = el.getBoundingClientRect();
		return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, right: r.right, bottom: r.bottom, left: r.left };
	}), selector);
}

export function style(page, selector, prop) {
	return page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s)).getPropertyValue(p), [selector, prop]);
}

export async function px(page, selector, prop) {
	return parseFloat(await style(page, selector, prop));
}

/** Resolves a token to pixels by giving a probe element that token as its width. */
export function token(page, name) {
	return page.evaluate((n) => {
		const probe = document.createElement('div');
		probe.style.cssText = `position:absolute;inline-size:var(${n});block-size:0;visibility:hidden`;
		document.body.append(probe);
		const value = probe.getBoundingClientRect().width;
		probe.remove();
		return value;
	}, name);
}

/**
 * Every direct child of every match has zero margins. Children a layout pushes
 * with an auto margin by design (data-split, data-center) are skipped, since
 * the computed style reports the used pixel value of that auto margin.
 */
export async function expectNoChildMargins(page, selector, except = '[data-split], [data-center]') {
	const margins = await page.evaluate(([s, x]) => [...document.querySelectorAll(s)].flatMap((el) => [...el.children].filter((child) => !child.matches(x)).map((child) => {
		const cs = getComputedStyle(child);
		return [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].join(' ');
	})), [selector, except]);
	expect(margins.length).toBeGreaterThan(0);
	for (const m of margins) expect(m).toBe('0px 0px 0px 0px');
	// Every fixture layout is a div, which prose never targets, so the check
	// above passed with the layout's margin reset deleted. The same layout on a
	// section with a heading and paragraphs is where prose does add margins,
	// and where the reset has to win.
	const semantic = await page.evaluate((s) => {
		const source = document.querySelector(s);
		// Only a classed element carries a layout to copy. A selector that lands
		// on an unclassed region, like the shell's body row, has no identity to
		// give the probe, and a bare section with prose in it is only prose.
		if (!source.className) return [];
		const probe = document.createElement('section');
		probe.className = source.className;
		for (const [k, v] of Object.entries(source.dataset)) probe.dataset[k] = v;
		probe.innerHTML = '<h2>Heading</h2><p>One.</p><p>Two.</p>';
		document.body.append(probe);
		const out = [...probe.children].map((child) => { const cs = getComputedStyle(child); return [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].join(' '); });
		probe.remove();
		return out;
	}, selector);
	for (const m of semantic) expect(m, 'on a section with prose children').toBe('0px 0px 0px 0px');
}

/** Two boxes match in size and in position relative to their own container. */
export function same(a, b, aBox, bBox) {
	expect(a.width).toBeCloseTo(b.width, 0);
	expect(a.height).toBeCloseTo(b.height, 0);
	expect(a.left - aBox.left).toBeCloseTo(b.left - bBox.left, 0);
	expect(a.top - aBox.top).toBeCloseTo(b.top - bBox.top, 0);
}

export async function axe(page) {
	return (await new AxeBuilder({ page }).analyze()).violations;
}

/** Blocks a component's module before the page loads, for the "without the module" run. */
export function withoutModule(page, name) {
	return page.route(`**/${name}.js`, (route) => route.abort());
}
