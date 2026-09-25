import { test, expect } from 'playwright/test';
import { stage, rect, style, px, token, axe, withoutModule, painted } from '../lib/layout.js';
import { PAGE_HELPERS } from '../lib/contrast.js';

const open = async (page, width = 1000, hash = '') => {
	const response = await page.goto(`/test/browser/fixtures/components/tabs.html${hash}`);
	expect(response.status()).toBe(200);
	await stage(page, width);
};
const hidden = (page, id) => page.evaluate((i) => document.getElementById(i).hidden, id);
const selected = (page, id) => page.evaluate((i) => document.getElementById(i).getAttribute('aria-selected'), id);
/** Resolves a color token to sRGB bytes, via a probe element carrying it as a
 *  background. Comparing painted bytes rather than the computed color's raw
 *  serialization is what makes this portable: the same oklch value reaches
 *  the tab's `color` through an extra custom-property indirection than the
 *  probe's `background-color` does, and Firefox serializes the computed
 *  value as oklab with a rounding difference between the two paths, even
 *  though the painted color is identical. */
const colorOf = (page, name) => page.evaluate((n) => {
	const probe = document.createElement('div');
	probe.style.cssText = `background-color: var(${n})`;
	document.body.append(probe);
	const value = window.__yeti.rgb(getComputedStyle(probe).backgroundColor);
	probe.remove();
	return value;
}, name);
const rgbOf = (page, selector, prop) => page.evaluate(([s, p]) => window.__yeti.rgb(getComputedStyle(document.querySelector(s))[p]), [selector, prop]);

test.describe('tabs', () => {
	test('without the module every panel is readable', async ({ page }) => {
		await withoutModule(page, 'tabs');
		await open(page);
		for (const id of ['p1', 'p2', 'p3']) expect(await hidden(page, id), id).toBe(false);
		for (const id of ['p1', 'p2', 'p3']) expect((await rect(page, `#${id}`)).height, id).toBeGreaterThan(0);
		for (const id of ['t1', 't2', 't3']) expect(await page.evaluate((i) => document.getElementById(i).tabIndex, id), id).toBe(0);
		expect(await axe(page)).toEqual([]);
	});

	test('with the module one panel shows and the rest are hidden', async ({ page }) => {
		await open(page);
		expect(await hidden(page, 'p1')).toBe(false);
		expect(await hidden(page, 'p2')).toBe(true);
		expect(await selected(page, 't1')).toBe('true');
		expect(await selected(page, 't2')).toBe('false');
	});

	test('clicking a tab swaps the panels', async ({ page }) => {
		await open(page);
		await page.click('#t2');
		expect(await hidden(page, 'p1')).toBe(true);
		expect(await hidden(page, 'p2')).toBe(false);
		expect(await selected(page, 't2')).toBe('true');
	});

	test('the arrows, Home and End move selection, and only one tab is in the tab order', async ({ page }) => {
		await open(page);
		await page.focus('#t1');
		await page.keyboard.press('ArrowRight');
		expect(await selected(page, 't2')).toBe('true');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('t2');
		await page.keyboard.press('End');
		expect(await selected(page, 't3')).toBe('true');
		await page.keyboard.press('Home');
		expect(await selected(page, 't1')).toBe('true');
		expect(await page.evaluate(() => document.getElementById('t2').tabIndex)).toBe(-1);
	});

	test('a vertical list uses the up and down arrows', async ({ page }) => {
		await open(page);
		await page.focus('#v1');
		await page.keyboard.press('ArrowDown');
		expect(await selected(page, 'v2')).toBe('true');
		const [list, panel] = await Promise.all([rect(page, '#vertical [role="tablist"]'), rect(page, '#vp2')]);
		expect(panel.left).toBeGreaterThanOrEqual(list.right - 2);
	});

	test('the selected panel can take focus when nothing inside it can', async ({ page }) => {
		await open(page);
		expect(await page.evaluate(() => document.getElementById('p1').tabIndex)).toBe(0);
	});

	test('the selected tab is marked with the hue', async ({ page }) => {
		await open(page);
		expect(await style(page, '#t1', 'border-bottom-color')).not.toBe(await style(page, '#t2', 'border-bottom-color'));
	});

	test('data-emphasis="high" fills the selected tab with the variant', async ({ page }) => {
		await page.addInitScript(PAGE_HELPERS);
		await open(page);
		// The tab's color (unlike its background-color) transitions, and the
		// initial selection at load starts that transition; read after it
		// settles, the way the contrast suite does for the same reason.
		await painted(page);
		const variant = await colorOf(page, '--yeti-color-primary');
		const onVariant = await colorOf(page, '--yeti-on-primary');
		expect(await rgbOf(page, '#f1', 'backgroundColor')).toEqual(variant);
		expect(await rgbOf(page, '#f1', 'color')).toEqual(onVariant);
		// The unselected tab is not filled.
		expect(await rgbOf(page, '#f2', 'backgroundColor')).not.toEqual(variant);
	});

	test('a vertical filled tab rounds its start corners', async ({ page }) => {
		await open(page);
		const radius = await token(page, '--yeti-radius-sm');
		// The vertical list's edge runs down the inline-end side, so the filled
		// tab rounds its two inline-start corners instead of its two
		// block-start ones; in the fixture's ltr, horizontal-tb document those
		// are the top-left and bottom-left corners, and the top-right corner
		// (block-start, inline-end) stays square against the divider.
		expect(await px(page, '#vf1', 'border-top-left-radius')).toBeCloseTo(radius, 0);
		expect(await px(page, '#vf1', 'border-bottom-left-radius')).toBeCloseTo(radius, 0);
		expect(await px(page, '#vf1', 'border-top-right-radius')).toBeCloseTo(0, 0);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});

	test('selecting a tab dispatches yeti:select with the tab and its panel', async ({ page }) => {
		await open(page);
		// The listener is installed from script; the click is a real one, so the
		// module is driven the way a reader drives it.
		await page.evaluate(() => {
			window.caught = null;
			document.addEventListener('yeti:select', (event) => {
				window.caught = {
					target: event.target.id,
					bubbles: event.bubbles,
					composed: event.composed,
					tab: event.detail.tab.id,
					panel: event.detail.panel.id,
				};
			}, { once: true });
		});
		await page.click('#t2');
		expect(await page.evaluate(() => window.caught)).toEqual({ target: 'tabs', bubbles: true, composed: true, tab: 't2', panel: 'p2' });
	});

	test('the pass at load dispatches nothing', async ({ page }) => {
		await page.addInitScript(() => {
			window.selects = 0;
			document.addEventListener('yeti:select', () => { window.selects += 1; });
		});
		await open(page);
		expect(await page.evaluate(() => window.selects)).toBe(0);
	});

	test('loading with a hash into a hidden panel selects its tab', async ({ page }) => {
		await open(page, 1000, '#deep');
		expect(await selected(page, 't2')).toBe('true');
		expect(await hidden(page, 'p2')).toBe(false);
	});

	test('a link into a hidden panel opens its tab without moving focus to it', async ({ page }) => {
		await open(page);
		expect(await selected(page, 't1')).toBe('true');
		await page.evaluate(() => {
			window.caught = null;
			document.addEventListener('yeti:select', (event) => {
				window.caught = { tab: event.detail.tab.id, panel: event.detail.panel.id };
			}, { once: true });
		});
		await page.click('#to-deep');
		await page.waitForFunction(() => document.getElementById('t2').getAttribute('aria-selected') === 'true');
		expect(await selected(page, 't2')).toBe('true');
		expect(await hidden(page, 'p2')).toBe(false);
		expect(await page.evaluate(() => window.caught)).toEqual({ tab: 't2', panel: 'p2' });
		expect(await page.evaluate(() => document.activeElement.id)).not.toBe('t2');
	});

	test('a hash to an element outside any panel leaves the selection unchanged', async ({ page }) => {
		await open(page, 1000, '#to-deep');
		expect(await selected(page, 't1')).toBe('true');
		expect(await hidden(page, 'p1')).toBe(false);
	});

	test('a hash to a tab itself, not its panel, leaves the selection unchanged and does not throw', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error));
		await open(page, 1000, '#t2');
		expect(await selected(page, 't1')).toBe('true');
		expect(errors).toEqual([]);
	});

	test('a hash with characters needing decoding still finds its target', async ({ page }) => {
		// %65 decodes to "e", so this points at the same #deep element.
		await open(page, 1000, '#de%65p');
		expect(await selected(page, 't2')).toBe('true');
		expect(await hidden(page, 'p2')).toBe(false);
	});

	test('without the module a hash into a hidden panel still passes', async ({ page }) => {
		await withoutModule(page, 'tabs');
		await open(page, 1000, '#deep');
		for (const id of ['p1', 'p2', 'p3']) expect(await hidden(page, id), id).toBe(false);
	});
});
