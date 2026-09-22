import { test, expect } from 'playwright/test';
import { stage, style, axe, withoutModule } from '../lib/layout.js';

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
			document.addEventListener('yeti:current', (event) => resolve({
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
		await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('three').getBoundingClientRect().top))).toBeLessThan(5);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
