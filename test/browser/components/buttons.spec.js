import { test, expect } from 'playwright/test';
import { stage, rect, style, px, token, axe, painted } from '../lib/layout.js';
import { PAGE_HELPERS, expectAA } from '../lib/contrast.js';

const open = async (page, width = 1000) => {
	await page.addInitScript(PAGE_HELPERS);
	const response = await page.goto('/test/browser/fixtures/components/buttons.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

test.describe('buttons', () => {
	test('a loose group keeps a gap; an affixed group fuses its members', async ({ page }) => {
		await open(page);
		const [l1, l2] = await Promise.all([rect(page, '#l1'), rect(page, '#l2')]);
		expect(l2.left - l1.right).toBeCloseTo(await token(page, '--yeti-space-sm'), 0);
		const [a1, a2, a3] = await Promise.all([rect(page, '#a1'), rect(page, '#a2'), rect(page, '#a3')]);
		const border = await token(page, '--yeti-border-width');
		expect(a2.left - a1.right).toBeCloseTo(-border, 1);
		expect(a3.left - a2.right).toBeCloseTo(-border, 1);
		expect(await px(page, '#a1', 'border-top-right-radius')).toBe(0);
		expect(await px(page, '#a2', 'border-top-left-radius')).toBe(0);
		expect(await px(page, '#a2', 'border-top-right-radius')).toBe(0);
		expect(await px(page, '#a3', 'border-top-left-radius')).toBe(0);
		expect(await px(page, '#a1', 'border-top-left-radius')).toBeGreaterThan(0);
	});

	test('a focused member is lifted above its neighbours', async ({ page, browserName }) => {
		// See the identical note in button.spec.js: headless WebKit does not
		// include plain buttons in Tab order by default, so Shift+Tab/Tab away
		// from a scripted .focus() cannot land back on a button either;
		// verified for real in chromium and firefox.
		test.skip(browserName === 'webkit', 'headless WebKit does not Tab to buttons');
		await open(page);
		await page.focus('#a2');
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('a2');
		expect(await style(page, '#a2', 'z-index')).toBe('1');
	});

	test('a label.button over a radio is pressed while checked, as a pressed button is', async ({ page }) => {
		await open(page);
		await page.click('#s2');
		expect(await page.isChecked('#s2-input')).toBe(true);
		await page.mouse.move(0, 0);
		await painted(page);
		expect(await style(page, '#s2', 'background-color')).toBe(await style(page, '#pressed', 'background-color'));
		expect(await style(page, '#s1', 'background-color')).not.toBe(await style(page, '#pressed', 'background-color'));
		// A disabled input dims its label as a disabled button is dimmed.
		expect(await style(page, '#s3', 'opacity')).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--yeti-opacity-muted').trim()));
	});

	test('the arrow keys move the choice, and the focused label rises and draws the ring', async ({ page, browserName }) => {
		await open(page);
		await page.focus('#s1-input');
		expect(await style(page, '#s1', 'outline-style')).toBe('solid');
		expect(await px(page, '#s1', 'outline-width')).toBe(2);
		await page.keyboard.press('ArrowRight');
		expect(await page.isChecked('#s2-input')).toBe(true);
		expect(await page.isChecked('#s1-input')).toBe(false);
		expect(await page.evaluate(() => document.activeElement.id)).toBe('s2-input');
		// The ring follows the input's :focus-visible, and WebKit stops matching
		// it on a radio that the arrow keys focus, as it does for a bare radio;
		// the filled segment still shows where the choice, and the focus, is.
		const ringAfterArrow = await page.evaluate(() => document.activeElement.matches(':focus-visible'));
		if (browserName !== 'webkit') expect(ringAfterArrow).toBe(true);
		expect(await style(page, '#s2', 'outline-style')).toBe(ringAfterArrow ? 'solid' : 'none');
		expect(await style(page, '#s2', 'z-index')).toBe(ringAfterArrow ? '1' : 'auto');
	});

	test('an affixed group short of room stays one row, its labels wrapping inside', async ({ page }) => {
		await open(page, 1000);
		// Narrower than the labels need on one line, so a wrapping row would break.
		const [first, last] = await Promise.all([rect(page, '#s1'), rect(page, '#s3')]);
		await page.evaluate((w) => { document.querySelector('#segmented').style.inlineSize = `${w}px`; }, Math.round((last.right - first.left) * 0.8));
		const [a, b, c] = await Promise.all([rect(page, '#s1'), rect(page, '#s2'), rect(page, '#s3')]);
		expect(Math.round(b.top)).toBe(Math.round(a.top));
		expect(Math.round(c.top)).toBe(Math.round(a.top));
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
