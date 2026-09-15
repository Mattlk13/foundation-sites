import { test, expect } from 'playwright/test';
import { stage, rect, rects, style, px, token, axe, painted } from '../lib/layout.js';
import { PAGE_HELPERS, expectAA } from '../lib/contrast.js';

const open = async (page, width = 1000) => {
	await page.addInitScript(PAGE_HELPERS);
	const response = await page.goto('/test/browser/fixtures/components/card.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
	// The buttons transition colour, and the source stylesheet's imports land
	// after load, so axe once sampled a footer button half way from unstyled to
	// styled: grey text on a half-mixed blue. Read nothing until that settles.
	await painted(page);
};

test.describe('card', () => {
	test('the figure bleeds to the edges and crops to the ratio', async ({ page }) => {
		await open(page);
		const [card, img] = await Promise.all([rect(page, '#short'), rect(page, '#img')]);
		const border = await token(page, '--yeti-border-width');
		expect(img.left).toBeCloseTo(card.left + border, 0);
		expect(img.right).toBeCloseTo(card.right - border, 0);
		expect(img.top).toBeCloseTo(card.top + border, 0);
		expect(img.width / img.height).toBeCloseTo(16 / 9, 1);
	});

	test('card children keep the card\'s rhythm instead of stacking their own prose margin', async ({ page }) => {
		await open(page);
		const [img, h2] = await Promise.all([rect(page, '#img'), rect(page, '#short h2')]);
		expect(h2.top - img.bottom).toBeCloseTo(await token(page, '--yeti-card-gap'), 0);
	});

	test('the footer sits at the bottom of a card stretched in a row', async ({ page }) => {
		await open(page);
		const [short, tall, sf, tf] = await Promise.all([rect(page, '#short'), rect(page, '#tall'), rect(page, '#short-footer'), rect(page, '#tall-footer')]);
		expect(short.height).toBeCloseTo(tall.height, 0);
		expect(sf.bottom).toBeCloseTo(tf.bottom, 0);
	});

	test('a footer button still takes the click when the heading link is stretched', async ({ page }) => {
		await open(page);
		const hit = await page.evaluate(() => {
			const button = document.getElementById('short-action');
			button.addEventListener('click', () => { button.dataset.pressed = 'yes'; });
			const r = button.getBoundingClientRect();
			return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).id;
		});
		// The stretched link's pseudo-element covered the whole card, footer
		// included, so the button was unreachable and the page navigated.
		expect(hit).toBe('short-action');
		await page.click('#short-action');
		expect(await page.evaluate(() => document.getElementById('short-action').dataset.pressed)).toBe('yes');
		expect(await page.evaluate(() => location.hash)).toBe('');
	});

	test('a card without a picture keeps its intrinsic width where a parent lets it size itself', async ({ page }) => {
		await open(page);
		const width = await page.evaluate(() => {
			const wrap = document.createElement('div');
			wrap.className = 'cluster';
			wrap.innerHTML = '<article class="card"><h2>A heading of some length</h2><p>Body text wider than the padding.</p></article>';
			document.body.append(wrap);
			const w = wrap.querySelector('.card').getBoundingClientRect().width;
			wrap.remove();
			return w;
		});
		// Always-on size containment removed the content's contribution to
		// intrinsic width, and the card came out at its padding: 37px.
		expect(width).toBeGreaterThan(150);
	});

	test('below the sm width of its own content a card with a picture becomes a thumbnail row', async ({ page }) => {
		await open(page);
		const [card, img, title] = await Promise.all([rect(page, '#thumb'), rect(page, '#thumb-img'), rect(page, '#thumb-title')]);
		const border = await token(page, '--yeti-border-width');
		expect(title.left).toBeGreaterThan(img.right);
		expect(img.width).toBeCloseTo(card.width * 0.4, -1);
		expect(img.height).toBeCloseTo(card.height - 2 * border, 0);
		expect(title.left - img.right).toBeCloseTo(await token(page, '--yeti-card-gap'), 0);

		const [variantCard, variantImg] = await Promise.all([rect(page, '#thumb-variant'), rect(page, '#thumb-variant-img')]);
		expect(variantImg.top).toBeCloseTo(variantCard.top + 4 * border, 0);
	});

	test('raised, tinted, and captioned variants', async ({ page }) => {
		await open(page);
		expect(await style(page, '#raised', 'box-shadow')).not.toBe('none');
		expect(await style(page, '#raised', 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
		const border = await token(page, '--yeti-border-width');
		expect(await px(page, '#tinted', 'border-top-width')).toBeCloseTo(border * 4, 1);
		expect(await px(page, '#tinted', 'border-left-width')).toBeCloseTo(border, 1);
		const [cap, img, card] = await Promise.all([rect(page, '#caption'), rect(page, '#cap-img'), rect(page, '#captioned')]);
		expect(cap.top).toBeGreaterThanOrEqual(img.bottom);
		expect(img.width).toBeCloseTo(card.width - 2 * border, 0);
	});

	test('a layer figure puts its caption over the picture', async ({ page }) => {
		await open(page);
		const [img, cap, card] = await Promise.all([rect(page, '#lay-img'), rect(page, '#lay-caption'), rect(page, '#layered')]);
		const border = await token(page, '--yeti-border-width');
		expect(img.width).toBeCloseTo(card.width - 2 * border, 0);
		expect(img.width / img.height).toBeCloseTo(16 / 9, 1);
		expect(cap.bottom).toBeCloseTo(img.bottom, 1);
		expect(cap.top).toBeGreaterThan(img.top);
		expect(await style(page, '#lay-caption', 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('data-stretch makes the whole card the link', async ({ page }) => {
		await open(page);
		const card = await rect(page, '#short');
		await page.mouse.click(card.right - 10, card.bottom - 10);
		expect(await page.evaluate(() => location.hash)).toBe('#hills');
	});

	test('cards in a ranked grid align their footers and keep the wide figure', async ({ page }) => {
		await open(page);
		const footers = await rects(page, '#ranked-row footer');
		expect(new Set(footers.map((r) => Math.round(r.bottom))).size).toBe(1);
		const [card, img] = await Promise.all([rect(page, '#ranked-row .card'), rect(page, '#ranked-row .card img')]);
		expect(img.width).toBeCloseTo(card.width - 2 * (await token(page, '--yeti-border-width')), 0);
	});

	for (const scheme of ['light', 'dark']) {
		test(`text meets AA in ${scheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page);
			for (const sel of await page.evaluate(() => [...document.querySelectorAll('[data-contrast]')].map((el, i) => { el.dataset.contrastId = String(i); return `[data-contrast-id="${i}"]`; }))) {
				await expectAA(page, sel, { large: await page.evaluate((s) => document.querySelector(s).dataset.contrast === 'large', sel), label: `${sel} ${scheme}` });
			}
		});
	}

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});
});
