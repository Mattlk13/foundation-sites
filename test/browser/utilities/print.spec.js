import { test, expect } from 'playwright/test';
import { stage, style, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/print.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};

test.describe('print', () => {
	test('on the screen the paper lines are gone and the screen control is there', async ({ page }) => {
		await open(page);
		expect(await style(page, '#url', 'display')).toBe('none');
		expect(await style(page, '#share', 'display')).not.toBe('none');
		expect(await style(page, '#plain', 'display')).not.toBe('none');
	});

	test('on paper the two swap over and the plain one stays', async ({ page }) => {
		await open(page);
		await page.emulateMedia({ media: 'print' });
		expect(await style(page, '#url', 'display')).not.toBe('none');
		expect(await style(page, '#share', 'display')).toBe('none');
		expect(await style(page, '#plain', 'display')).not.toBe('none');
	});

	test('only is the default, so the attribute may be left off', async ({ page }) => {
		await open(page);
		// #bare carries the class and no attribute; #url carries the class and
		// data-print="only". They must never disagree, in either medium.
		expect(await style(page, '#bare', 'display')).toBe('none');
		await page.emulateMedia({ media: 'print' });
		expect(await style(page, '#bare', 'display')).toBe(await style(page, '#url', 'display'));
		expect(await style(page, '#bare', 'display')).not.toBe('none');
	});

	test('the rule outranks a component of its own, so a printable button really goes', async ({ page }) => {
		await open(page);
		// .button sets display in the components layer; .print sets it in the
		// utilities layer, which is later in the cascade order. Without that
		// ordering the button would print anyway and the utility would be a
		// decoration.
		await page.emulateMedia({ media: 'print' });
		expect(await style(page, '#share', 'display')).toBe('none');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
