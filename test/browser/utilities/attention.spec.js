import { test, expect } from 'playwright/test';
import { stage, style, rect, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/utilities/attention.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

test.describe('attention', () => {
	test('data-attention picks the gesture, and pulse is what a bare .attention plays', async ({ page }) => {
		await open(page);
		expect(await style(page, '#pulse', 'animation-name')).toBe('yeti-attention-pulse');
		expect(await style(page, '#shake', 'animation-name')).toBe('yeti-attention-shake');
	});

	test('the gesture plays once and does not keep going', async ({ page }) => {
		await open(page);
		expect(await style(page, '#pulse', 'animation-iteration-count')).toBe('1');
		await painted(page);
		// painted() only waits for animations that end, so an infinite one
		// would still be here afterwards.
		expect(await page.evaluate(() => document.getElementById('pulse').getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
	});

	test('the element ends where it started', async ({ page }) => {
		await open(page);
		await painted(page);
		const gesturing = await rect(page, '#pulse');
		const still = await rect(page, '#still');
		expect(gesturing.width).toBeCloseTo(still.width, 0);
		expect(gesturing.left).toBeCloseTo(still.left, 0);
		expect(await style(page, '#pulse', 'scale')).toBe('none');
		expect(await style(page, '#shake', 'translate')).toBe('none');
	});

	test('under reduced motion the gesture collapses to nothing', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		expect(parseFloat(await style(page, '#pulse', 'animation-duration'))).toBeLessThanOrEqual(0.01);
		await painted(page);
		const samples = await page.evaluate(() => new Promise((resolve) => {
			const seen = [];
			const read = () => {
				const el = document.getElementById('pulse');
				seen.push(`${getComputedStyle(el).scale} ${getComputedStyle(el).translate}`);
				if (seen.length < 6) requestAnimationFrame(read); else resolve(seen);
			};
			requestAnimationFrame(read);
		}));
		expect(new Set(samples).size).toBe(1);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		await painted(page);
		expect(await axe(page)).toEqual([]);
	});
});
