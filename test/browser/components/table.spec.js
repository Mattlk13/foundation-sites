import { test, expect } from 'playwright/test';
import { stage, rect, rects, style, px, token, axe } from '../lib/layout.js';
import { PAGE_HELPERS, expectAA } from '../lib/contrast.js';

const open = async (page, width = 1000) => {
	await page.addInitScript(PAGE_HELPERS);
	const response = await page.goto('/test/browser/fixtures/components/table.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

test.describe('table', () => {
	test('header rule, stripes, hover, numeric alignment', async ({ page }) => {
		await open(page);
		expect(await style(page, '#head', 'font-weight')).toBe(String(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--yeti-weight-strong').trim())));
		expect(await style(page, '#r2', 'background-color')).not.toBe(await style(page, '#r1', 'background-color'));
		expect(await style(page, '#r3', 'background-color')).toBe(await style(page, '#r1', 'background-color'));
		const rest = await style(page, '#r1', 'background-color');
		await page.hover('#r1');
		expect(await style(page, '#r1', 'background-color')).not.toBe(rest);
		expect(await style(page, '#n1', 'text-align')).toBe('end');
		expect(await style(page, '#n1', 'font-variant-numeric')).toBe('tabular-nums');
	});

	test('data-border borders every cell and data-size="sm" tightens padding', async ({ page }) => {
		await open(page);
		expect(await px(page, '#g1', 'border-left-width')).toBeGreaterThan(0);
		expect(await px(page, '#g1', 'padding-top')).toBeLessThan(await px(page, '#n1', 'padding-top'));
		// The table's data-border means cell borders; the generic border marker must not add an outer one.
		expect(await px(page, '#gridded', 'border-top-width')).toBe(0);
	});

	test('the header rule survives data-border', async ({ page }) => {
		await open(page);
		expect(await style(page, '#g-head', 'border-bottom-color')).not.toBe(await style(page, '#g1', 'border-bottom-color'));
	});

	test('a wide table scrolls inside a scroller and stays a table', async ({ page }) => {
		await open(page);
		expect(await page.evaluate(() => { const el = document.getElementById('wide'); return el.scrollWidth > el.clientWidth; })).toBe(true);
		expect(await style(page, '#widetable', 'display')).toBe('table');
	});

	for (const scheme of ['light', 'dark']) {
		test(`text meets AA in ${scheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page);
			for (const sel of await page.evaluate(() => [...document.querySelectorAll('[data-contrast]')].map((el, i) => { el.dataset.contrastId = String(i); return `[data-contrast-id="${i}"]`; }))) {
				await expectAA(page, sel, { large: await page.evaluate((s) => document.querySelector(s).dataset.contrast === 'large', sel), label: `${sel} ${scheme}` });
			}
		});
	}

	test('data-nowrap keeps a table\'s or a cell\'s line', async ({ page }) => {
		await open(page);
		expect(await style(page, '#kept-cell', 'white-space')).toBe('nowrap');
		expect(await style(page, '#g1', 'white-space')).toBe('nowrap');
		expect(await style(page, '#g2', 'white-space')).toBe('normal');
	});

	test('data-fixed shares the width equally between the columns', async ({ page }) => {
		await open(page);
		const widths = (await rects(page, '#fixed > thead th')).map((r) => r.width);
		for (const w of widths) expect(w).toBeCloseTo(widths[0], 0);
	});

	test('data-align aligns a cell, or a row\'s cells, and an icon centers with it', async ({ page }) => {
		await open(page);
		expect(await style(page, '#one-cell', 'text-align')).toBe('center');
		expect(await style(page, '#end-cell', 'text-align')).toBe('end');
		expect(await style(page, '#centered', 'text-align')).toBe('center');
		// A cell's own value and data-numeric outrank the row's.
		expect(await style(page, '#feature', 'text-align')).toBe('start');
		expect(await style(page, '#numbered', 'text-align')).toBe('end');
		const [cell, tick] = await Promise.all([rect(page, '#ticked'), rect(page, '#tick')]);
		expect(tick.left + tick.width / 2).toBeCloseTo(cell.left + cell.width / 2, 0);
	});

	test('a sticky head pins with a surface and keeps its rule', async ({ page }) => {
		await open(page);
		await page.evaluate(() => { const t = document.getElementById('pinned'); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY + 300); });
		const offset = await token(page, '--yeti-sticky-offset');
		expect((await rect(page, '#p-head')).top).toBeCloseTo(offset, 0);
		expect(await style(page, '#p-head', 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
		expect(await style(page, '#p-head', 'background-color')).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor));
		// The rule is the head cell's own inset shadow in the strong border color.
		const rule = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'var(--yeti-color-border-strong)'; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
		const shadow = await style(page, '#p-head', 'box-shadow');
		expect(shadow).toContain('inset');
		expect(shadow).toContain(rule);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
