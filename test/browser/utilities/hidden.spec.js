import { test, expect } from 'playwright/test';
import { stage, rect, style, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/hidden.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};

test.describe('hidden', () => {
	test('the text is taken out of the flow and clipped to nothing', async ({ page }) => {
		await open(page);
		expect(await style(page, '#label', 'position')).toBe('absolute');
		expect(await style(page, '#label', 'overflow')).toBe('hidden');
		expect(await style(page, '#label', 'white-space')).toBe('nowrap');
		// The three engines serialise the shape differently past the first
		// argument; all of them keep the function and the percentage.
		expect(await style(page, '#label', 'clip-path')).toMatch(/^inset\(50%/);
		const box = await rect(page, '#label');
		expect(box.width).toBeLessThanOrEqual(1.5);
		expect(box.height).toBeLessThanOrEqual(1.5);
	});

	test('the link is no wider for the words only a screen reader hears', async ({ page }) => {
		await open(page);
		const [withHidden, plain] = await Promise.all([rect(page, '#link'), rect(page, '#plain')]);
		expect(withHidden.width).toBeCloseTo(plain.width, 0);
	});

	test('hidden text is part of the accessible name; the hidden attribute drops it', async ({ page }) => {
		await open(page);
		await expect(page.locator('#kept')).toHaveAccessibleName('Save changes');
		await expect(page.locator('#dropped')).toHaveAccessibleName('Save');
		await expect(page.locator('#link')).toHaveAccessibleName('Read more about the trail map');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
