import { test, expect } from 'playwright/test';
import { stage, rect, style, axe, withoutModule } from '../lib/layout.js';

const open = async (page, width = 1000, hash = '') => {
	const response = await page.goto(`/test/browser/fixtures/components/tabs.html${hash}`);
	expect(response.status()).toBe(200);
	await stage(page, width);
};
const hidden = (page, id) => page.evaluate((i) => document.getElementById(i).hidden, id);
const selected = (page, id) => page.evaluate((i) => document.getElementById(i).getAttribute('aria-selected'), id);

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
