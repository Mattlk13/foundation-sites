import { test, expect } from 'playwright/test';
import { stage, rect, style, px, token, axe, painted } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/components/demo.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	await painted(page);
};
// Drag the browser's own resize grip, which sits in the box's bottom end corner.
// The fixture stacks five boxes, so a lower one's grip can sit below the
// viewport; scrolling it into view first keeps the drag on-screen.
const dragGrip = async (page, selector, dx) => {
	await page.locator(selector).scrollIntoViewIfNeeded();
	const r = await rect(page, selector);
	await page.mouse.move(r.right - 4, r.bottom - 4);
	await page.mouse.down();
	await page.mouse.move(r.right - 4 + dx, r.bottom - 4, { steps: 10 });
	await page.mouse.up();
};

test.describe('demo', () => {
	test('the preview is a size container the reader can drag narrower', async ({ page }) => {
		await open(page);
		expect(await style(page, '#framed-preview', 'container-type')).toBe('inline-size');
		expect(await style(page, '#framed-preview', 'resize')).toBe('horizontal');
		const before = await rect(page, '#framed-preview');
		await dragGrip(page, '#framed-preview', -300);
		const after = await rect(page, '#framed-preview');
		expect(after.width).toBeLessThan(before.width - 250);
	});

	test('the frame fills the box and follows it', async ({ page }) => {
		await open(page);
		await dragGrip(page, '#framed-preview', -300);
		const [box, frame, border] = await Promise.all([rect(page, '#framed-preview'), rect(page, '#frame'), px(page, '#framed-preview', 'border-left-width')]);
		expect(frame.width).toBeCloseTo(box.width - 2 * border, 0);
		expect(frame.height).toBeCloseTo(box.height - 2 * border, 0);
		expect(await style(page, '#frame', 'border-top-width')).toBe('0px');
	});

	test('a direct card changes shape as the box is dragged past sm', async ({ page }) => {
		await open(page);
		// Above sm the card is a column: the picture spans the card's width.
		const wide = await Promise.all([rect(page, '#direct-card'), rect(page, '#direct-img')]);
		expect(wide[1].width).toBeGreaterThan(wide[0].width * 0.9);
		const boxBefore = await rect(page, '#direct-preview');
		await dragGrip(page, '#direct-preview', -(boxBefore.width - 300));
		await painted(page);
		// Below sm the card is a thumbnail row: the picture is a fraction of it.
		const narrow = await Promise.all([rect(page, '#direct-card'), rect(page, '#direct-img')]);
		expect(narrow[1].width).toBeLessThan(narrow[0].width * 0.6);
	});

	test('data-width sets the starting width; without it the box is full width', async ({ page }) => {
		await open(page);
		expect((await rect(page, '#narrow-preview')).width).toBeCloseTo(await token(page, '--yeti-width-sm'), 0);
		expect((await rect(page, '#direct-preview')).width).toBeCloseTo(await token(page, '--yeti-width-lg'), 0);
		const [stageBox, framed] = await Promise.all([rect(page, '#stage'), rect(page, '#framed-preview')]);
		expect(framed.width).toBeCloseTo(stageBox.width, 0);
	});

	test('the box never overhangs a container narrower than xs', async ({ page }) => {
		await open(page);
		await stage(page, 200);
		const [stageBox, framed] = await Promise.all([rect(page, '#stage'), rect(page, '#framed-preview')]);
		expect(framed.width).toBeLessThanOrEqual(stageBox.width);
	});

	test('data-height picks the box height and md is the default', async ({ page }) => {
		await open(page);
		for (const [id, name] of [['#narrow-preview', 'sm'], ['#framed-preview', 'md'], ['#mid-preview', 'lg'], ['#tall-preview', 'xl']]) {
			expect((await rect(page, id)).height, id).toBeCloseTo(await token(page, `--yeti-demo-height-${name}`), 0);
		}
	});

	test('the code is a details that opens', async ({ page }) => {
		await open(page);
		expect(await page.evaluate(() => document.getElementById('framed-code').open)).toBe(false);
		await page.click('#framed-code summary');
		expect(await page.evaluate(() => document.getElementById('framed-code').open)).toBe(true);
		expect((await rect(page, '#framed-code pre')).height).toBeGreaterThan(0);
	});

	test('has no accessibility violations, code closed and open', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
		await page.click('#framed-code summary');
		expect(await axe(page)).toEqual([]);
	});
});
