import { test, expect } from 'playwright/test';
import { stage, style, axe, withoutModule, token, px } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/components/toc.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};
const current = (page) => page.evaluate(() => document.querySelector('.toc a[aria-current]')?.id ?? null);

test.describe('toc', () => {
	test('the heading in view at the top of the page is the current link', async ({ page }) => {
		await open(page);
		await expect.poll(() => current(page)).toBe('link-one');
	});

	test('scrolling to the next heading moves the mark and announces it', async ({ page }) => {
		await open(page);
		await expect.poll(() => current(page)).toBe('link-one');
		const caught = await page.evaluate(() => new Promise((resolve) => {
			// Scoped to #toc: the fixture also carries a second, unrelated
			// numbered toc pointed at the same headings, and a document-level
			// listener would race between the two instances' own dispatches.
			document.getElementById('toc').addEventListener('yeti:current', (event) => resolve({
				target: event.target.id,
				bubbles: event.bubbles,
				composed: event.composed,
				link: event.detail.link.id,
				heading: event.detail.heading.id,
			}), { once: true });
			document.getElementById('two').scrollIntoView();
		}));
		expect(caught).toEqual({ target: 'toc', bubbles: true, composed: true, link: 'link-two', heading: 'two' });
		expect(await current(page)).toBe('link-two');
		expect(await page.evaluate(() => document.getElementById('link-one').hasAttribute('aria-current'))).toBe(false);
	});

	test('the current link is drawn differently from the rest', async ({ page }) => {
		await open(page);
		await expect.poll(() => current(page)).toBe('link-one');
		expect(await style(page, '#link-one', 'color')).not.toBe(await style(page, '#link-two', 'color'));
		expect(await style(page, '#link-one', 'border-inline-start-color')).not.toBe(await style(page, '#link-two', 'border-inline-start-color'));
		expect(await style(page, '#link-one', 'font-weight')).not.toBe(await style(page, '#link-two', 'font-weight'));
	});

	test('the page scrolls smoothly, and not under reduced motion', async ({ page }) => {
		await open(page);
		expect(await style(page, 'html', 'scroll-behavior')).toBe('smooth');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		expect(await style(page, 'html', 'scroll-behavior')).toBe('auto');
	});

	test('without the module nothing is marked and every link still works', async ({ page }) => {
		await withoutModule(page, 'toc');
		await open(page);
		await page.waitForTimeout(300);
		expect(await current(page)).toBe(null);
		await page.click('#link-three');
		expect(await page.evaluate(() => location.hash)).toBe('#three');
		// The heading lands a scroll padding below the top, not flush against it (see --yeti-scroll-padding).
		const padding = await token(page, '--yeti-scroll-padding');
		await expect.poll(async () => Math.abs((await page.evaluate(() => document.getElementById('three').getBoundingClientRect().top)) - padding), { timeout: 2000 }).toBeLessThanOrEqual(1);
	});

	test('--yeti-toc-padding sets the rows\' density on one toc alone', async ({ page }) => {
		await open(page);
		expect(await px(page, '#link-two', 'padding-top')).toBeCloseTo(await token(page, '--yeti-space-xs'), 1);
		await page.addStyleTag({ content: '#toc { --yeti-toc-padding: 2px; }' });
		expect(await px(page, '#link-two', 'padding-top')).toBe(2);
		expect(await px(page, '#n-two', 'padding-top')).toBeCloseTo(await token(page, '--yeti-space-xs'), 1);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});

	test('the hover fill reads --yeti-toc-hover, with the variant tint as its fallback', async ({ page }) => {
		await open(page);
		await page.hover('#link-two');
		const tinted = await style(page, '#link-two', 'background-color');
		expect(tinted).not.toBe('rgba(0, 0, 0, 0)');
		await page.addStyleTag({ content: '#toc { --yeti-toc-hover: transparent; }' });
		await page.hover('#link-one');
		await page.hover('#link-two');
		await expect.poll(() => style(page, '#link-two', 'background-color')).toBe('rgba(0, 0, 0, 0)');
	});

	test('data-numbered counts the entries, nested ones too, in the muted color', async ({ page }) => {
		await open(page);
		const before = (id) => page.evaluate((i) => { const cs = getComputedStyle(document.getElementById(i), '::before'); return { content: cs.content, color: cs.color, width: parseFloat(cs.minWidth) }; }, id);
		// Chromium reports a counter's content as the unresolved function, so the rule is asserted by its text and its effect by geometry.
		expect((await before('n-two')).content).toContain('counters(toc, ".")');
		expect((await before('n-two-one')).content).toContain('counters(toc, ".")');
		expect((await before('link-two')).content).toBe('none');
		const offset = (id) => page.evaluate((i) => { const a = document.getElementById(i); const r = document.createRange(); r.selectNodeContents(a); return r.getBoundingClientRect().left - a.getBoundingClientRect().left; }, id);
		// The link text starts after the number's box; a plain toc's text starts at its padding.
		expect(await offset('n-two')).toBeGreaterThan((await offset('link-two')) + 8);
		// The number's box is 3ch in the link's own font: room for a two-figure count or a nested 2.1.
		const threeCh = await page.evaluate(() => { const p = document.createElement('span'); p.style.cssText = 'display: inline-block; inline-size: 3ch'; document.getElementById('n-two').append(p); const w = p.getBoundingClientRect().width; p.remove(); return w; });
		expect((await before('n-two')).width).toBeCloseTo(threeCh, 1);
		// The number box fits a nested count, so nested text lines up with its parent's.
		expect(await offset('n-two-one')).toBeCloseTo(await offset('n-two'), 0);
		const muted = await page.evaluate(() => { const p = document.createElement('span'); p.style.color = 'var(--yeti-color-text-muted)'; document.body.append(p); const v = getComputedStyle(p).color; p.remove(); return v; });
		expect((await before('n-two')).color).toBe(muted);
		// The number is not part of the link's name: exact-name lookup finds the link without it.
		await expect(page.locator('#numbered').getByRole('link', { name: 'The stylesheet', exact: true })).toHaveCount(1);
		await expect(page.locator('#numbered').getByRole('link', { name: '2. The stylesheet', exact: true })).toHaveCount(0);
		// The current mark still works on a numbered toc.
		await page.evaluate(() => window.scrollTo(0, document.getElementById('one').offsetTop));
		await expect.poll(() => page.evaluate(() => document.querySelector('#numbered a[aria-current]')?.id)).toBe('n-one');
		expect(await axe(page)).toEqual([]);
	});
});
