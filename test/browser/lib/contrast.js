// Contrast of an element's text over the first painted background behind it.
import { expect } from 'playwright/test';
import { contrast, PAGE_HELPERS } from './color.js';

export { PAGE_HELPERS };

export async function ratioOf(page, selector) {
	const [fg, bg] = await page.evaluate((s) => {
		const el = document.querySelector(s);
		const fg = window.__yeti.rgb(getComputedStyle(el).color);
		// A background is transparent when the canvas says its alpha is 0, not
		// when its serialisation matches 'rgba(0, 0, 0, 0)' or 'transparent':
		// a page authored in oklch has Chromium serialise a fully transparent
		// background as e.g. 'oklab(0 0 0 / 0)', which matched neither literal
		// and made the walk stop one element too early, on an unpainted node.
		// window.__yeti.background composites a translucent one against what
		// sits beneath it instead of treating it as opaque in its own right.
		return [fg, window.__yeti.background(el)];
	}, selector);
	return contrast(fg, bg);
}

/** Contrast of a control's edge over the background behind it. A text field,
 *  an unchecked box and an off switch are identified by that edge alone. */
export async function edgeRatioOf(page, selector, property) {
	const [fg, bg] = await page.evaluate(([s, prop]) => {
		const el = document.querySelector(s);
		const fg = window.__yeti.rgb(getComputedStyle(el)[prop]);
		return [fg, window.__yeti.background(el.parentElement)];
	}, [selector, property]);
	return contrast(fg, bg);
}

export async function expectAA(page, selector, { large = false, label = selector } = {}) {
	expect(await ratioOf(page, selector), label).toBeGreaterThanOrEqual(large ? 3 : 4.5);
}
