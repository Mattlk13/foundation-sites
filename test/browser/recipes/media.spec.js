import { test, expect } from 'playwright/test';
import { stage, rect, token, expectNoChildMargins, same, axe } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/recipes/media.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

// The figure selector, shared by media and hero:
// > :is(img, video, picture), > :has(> :is(img, video, picture))

test.describe('media recipe', () => {
	test('matches the composed form side by side', async ({ page }) => {
		await open(page, 1000);
		const [c, p, cf, pf, cb, pb] = await Promise.all([rect(page, '#classed'), rect(page, '#composed'), rect(page, '#c-figure'), rect(page, '#p-figure'), rect(page, '#c-body'), rect(page, '#p-body')]);
		same(cf, pf, c, p);
		same(cb, pb, c, p);
		// flex-grow: 1 against the body's 999 leaves the figure a fraction of a pixel over its basis
		// (same behavior as .sidebar's first child; see test/browser/layouts/sidebar.spec.js).
		expect(Math.abs(cf.width - await token(page, '--yeti-width-xs'))).toBeLessThan(2);
		expect(cf.width / cf.height).toBeCloseTo(1, 1);
	});

	test('matches the composed form stacked', async ({ page }) => {
		await open(page, 400);
		const [c, p, cf, pf, cb, pb] = await Promise.all([rect(page, '#classed'), rect(page, '#composed'), rect(page, '#c-figure'), rect(page, '#p-figure'), rect(page, '#c-body'), rect(page, '#p-body')]);
		same(cf, pf, c, p);
		same(cb, pb, c, p);
		expect(cb.top).toBeGreaterThanOrEqual(cf.bottom);
	});

	test('the figure is found wherever it sits, and data-side overrides the side', async ({ page }) => {
		await open(page, 1000);
		const [lb, lf] = await Promise.all([rect(page, '#l-body'), rect(page, '#l-figure')]);
		expect(lf.left).toBeGreaterThan(lb.right);
		expect(lf.width / lf.height).toBeCloseTo(16 / 9, 1);
		const [fb, ff] = await Promise.all([rect(page, '#f-body'), rect(page, '#f-figure')]);
		expect(ff.left).toBeGreaterThan(fb.right);
	});

	test('data-side moves the figure in the row only; stacked, the source order holds', async ({ page }) => {
		await open(page, 1000);
		const [fsb, fsf] = await Promise.all([rect(page, '#fs-body'), rect(page, '#fs-figure')]);
		expect(fsf.right).toBeLessThanOrEqual(fsb.left);
		await open(page, 300);
		const [b, f] = await Promise.all([rect(page, '#fs-body'), rect(page, '#fs-figure')]);
		expect(f.top).toBeGreaterThanOrEqual(b.bottom);
		const [fb, ff] = await Promise.all([rect(page, '#f-body'), rect(page, '#f-figure')]);
		expect(fb.top).toBeGreaterThanOrEqual(ff.bottom);
	});

	test('the fill reaches an img inside a picture inside a wrapped figure', async ({ page }) => {
		await open(page, 1000);
		const [figure, img] = await Promise.all([rect(page, '#w-figure'), rect(page, '#w-figure img')]);
		expect(img.width).toBeCloseTo(figure.width, 0);
		expect(img.height).toBeCloseTo(figure.height, 0);
	});

	test('a figure with a figcaption keeps its caption below the image, and the image keeps its ratio', async ({ page }) => {
		await open(page, 1000);
		const [image, caption] = await Promise.all([rect(page, '#cap-image'), rect(page, '#cap-caption')]);
		expect(caption.top).toBeGreaterThanOrEqual(image.bottom);
		expect(image.width / image.height).toBeCloseTo(1, 1);
	});

	test('data-max caps the text and the figure takes the rest; data-width still sets the stack point', async ({ page }) => {
		await open(page, 1000);
		const md = await token(page, '--yeti-width-md');
		const [row, figure, body] = await Promise.all([rect(page, '#capped'), rect(page, '#cap-figure'), rect(page, '#cap-body')]);
		expect(Math.abs(body.width - md)).toBeLessThan(1);
		expect(figure.width).toBeGreaterThan(await token(page, '--yeti-width-xs') + 50);
		expect(Math.abs(figure.width + body.width - row.width)).toBeLessThan(await token(page, '--yeti-space-md') + 2);
		await open(page, 400);
		const [f, b] = await Promise.all([rect(page, '#cap-figure'), rect(page, '#cap-body')]);
		expect(b.top).toBeGreaterThanOrEqual(f.bottom);
	});

	test('a reversed media, stacked, keeps a narrow child at the start edge', async ({ page }) => {
		await open(page, 300);
		const [row, body] = await Promise.all([rect(page, '#narrow-start'), rect(page, '#ns-body')]);
		expect(Math.round(body.left)).toBe(Math.round(row.left));
	});

	test('children have no margins', async ({ page }) => {
		await open(page);
		await expectNoChildMargins(page, '.media');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
