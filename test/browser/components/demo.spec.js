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
// The box is box-sizing: content-box, so its rect is bigger than the width
// and height tokens by the border and (on direct markup) the inset padding;
// this reads the content box those tokens actually name.
const content = async (page, sel) => {
	const r = await rect(page, sel);
	const [b, p] = await Promise.all([px(page, sel, 'border-left-width'), px(page, sel, 'padding-left')]);
	return { width: r.width - 2 * (b + p), height: r.height - 2 * (b + p) };
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
		const [box, frame] = await Promise.all([content(page, '#framed-preview'), rect(page, '#frame')]);
		expect(frame.width).toBeCloseTo(box.width, 0);
		expect(frame.height).toBeCloseTo(box.height, 0);
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
		expect((await content(page, '#narrow-preview')).width).toBeCloseTo(await token(page, '--yeti-width-sm'), 0);
		expect((await content(page, '#direct-preview')).width).toBeCloseTo(await token(page, '--yeti-width-lg'), 0);
		const [stageBox, framed, border] = await Promise.all([rect(page, '#stage'), content(page, '#framed-preview'), px(page, '#framed-preview', 'border-left-width')]);
		expect(framed.width).toBeCloseTo(stageBox.width - 2 * border, 0);
	});

	test('the box never overhangs a container narrower than xs', async ({ page }) => {
		await open(page);
		await stage(page, 200);
		// #framed-preview has no padding, only the border term of --_yeti-demo-max;
		// #direct-preview is direct markup, so it also carries the inset term.
		const [stageBox, framed, direct] = await Promise.all([rect(page, '#stage'), rect(page, '#framed-preview'), rect(page, '#direct-preview')]);
		expect(framed.width).toBeLessThanOrEqual(stageBox.width);
		expect(direct.width).toBeLessThanOrEqual(stageBox.width);
	});

	test('data-height picks the box height and md is the default', async ({ page }) => {
		await open(page);
		for (const [id, name] of [['#narrow-preview', 'sm'], ['#framed-preview', 'md'], ['#mid-preview', 'lg'], ['#tall-preview', 'xl']]) {
			expect((await content(page, id)).height, id).toBeCloseTo(await token(page, `--yeti-demo-height-${name}`), 0);
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

	// The label's content is generated, so it is read from the pseudo-element
	// (or the child span, if that is what the engines required; see the CSS).
	const label = (page, id) => page.evaluate((i) => {
		const box = document.getElementById(i);
		const child = box.querySelector(':scope > [data-stop]');
		const raw = child ? getComputedStyle(child, '::after').content : getComputedStyle(box, '::after').content;
		return raw.replace(/"/g, '');
	}, id);

	test('the label names the width stop the box is at and follows a drag', async ({ page }) => {
		await open(page, 1400);
		// The stage is wider than the default 1280px viewport, so the box's own
		// resize grip would sit off-screen and undraggable; widen the viewport
		// to fit the whole box before reading and dragging its corner.
		await page.setViewportSize({ width: 1500, height: 900 });
		// Full width at 1400px is past 2xl (80rem = 1280px).
		expect(await label(page, 'framed-preview')).toBe('2xl');
		const r = await rect(page, '#framed-preview');
		await dragGrip(page, '#framed-preview', -(r.width - 400));
		await painted(page);
		// 400px is 25rem: at or above sm (24rem), below md (32rem).
		expect(await label(page, 'framed-preview')).toBe('sm');
	});

	test('the label flips exactly at the width defaults, not near them', async ({ page }) => {
		await open(page);
		// Set the box to one pixel either side of md (32rem = 512px) and read.
		const at = async (px) => {
			await page.evaluate((w) => { document.getElementById('framed-preview').style.inlineSize = `${w}px`; }, px);
			await painted(page);
			return label(page, 'framed-preview');
		};
		expect(await at(511)).toBe('sm');
		expect(await at(512)).toBe('md');
		expect(await at(767)).toBe('md');
		expect(await at(768)).toBe('lg');
	});

	test('a box narrower than sm reads xs, and data-width="sm" reads sm at rest', async ({ page }) => {
		await open(page);
		expect(await label(page, 'narrow-preview')).toBe('sm');
		await page.evaluate(() => { document.getElementById('narrow-preview').style.inlineSize = '300px'; });
		await painted(page);
		expect(await label(page, 'narrow-preview')).toBe('xs');
	});
});
