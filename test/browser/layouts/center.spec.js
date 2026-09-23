import { test, expect } from 'playwright/test';
import { open, stage, rect, token, axe } from '../lib/layout.js';

test.describe('center', () => {
	test('content is capped at the maximum and centered at 1400px', async ({ page }) => {
		await open(page, 'center', 1400);
		const [box, s] = await Promise.all([rect(page, '#center'), rect(page, '#stage')]);
		const gap = await token(page, '--yeti-space-md');
		expect(box.width - 2 * gap).toBeCloseTo(await token(page, '--yeti-width-xl'), 1);
		expect(box.left - s.left).toBeCloseTo(s.right - box.right, 1);
	});

	test('fills a narrow container minus the gutters', async ({ page }) => {
		await open(page, 'center', 500);
		const box = await rect(page, '#center');
		const gap = await token(page, '--yeti-space-md');
		expect(box.width).toBeCloseTo(500, 1);
		expect((await rect(page, '#center > p')).width).toBeCloseTo(500 - 2 * gap, 1);
	});

	test('data-intrinsic shrinks the column to its content and centers it', async ({ page }) => {
		await open(page, 'center');
		const [s, box, button] = await Promise.all([rect(page, '#stage'), rect(page, '#intrinsic'), rect(page, '#button')]);
		const gap = await token(page, '--yeti-space-md');
		expect(box.width).toBeCloseTo(button.width + 2 * gap, 0);
		expect(box.left - s.left).toBeCloseTo(s.right - box.right, 1);
		expect((button.left + button.right) / 2).toBeCloseTo((box.left + box.right) / 2, 0);
	});

	test('keeps its width inside a stack, where auto margins would shrink it', async ({ page }) => {
		await open(page, 'center', 1000);
		const [sm, md] = await Promise.all([token(page, '--yeti-width-sm'), token(page, '--yeti-space-md')]);
		let [stack, stacked] = await Promise.all([rect(page, '#in-stack'), rect(page, '#stacked')]);
		// Wide: the content is capped at sm plus the two gutters, and centered.
		expect(stacked.width).toBeCloseTo(sm + 2 * md, 0);
		expect(stacked.left - stack.left).toBeCloseTo((stack.width - stacked.width) / 2, 0);
		// Narrow: it is the stack's whole width, gutters included.
		await stage(page, 300);
		[stack, stacked] = await Promise.all([rect(page, '#in-stack'), rect(page, '#stacked')]);
		expect(stacked.width).toBeCloseTo(stack.width, 0);
		// Falsification: the paragraph inside is narrower than the column by the gutters.
		expect((await rect(page, '#stacked p')).width).toBeCloseTo(stack.width - 2 * md, 0);
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page, 'center');
		expect(await axe(page)).toEqual([]);
	});
});
