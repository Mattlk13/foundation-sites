import { test, expect } from 'playwright/test';
import { PAGE_HELPERS, luminance, contrast } from '../lib/color.js';
import { axe, painted } from '../lib/layout.js';

// bg and fg come back as sRGB quadruples from the page-side canvas helper, so
// two colours written in different syntaxes compare as the engine painted them.
const bg = (page, selector) => page.evaluate((s) => window.__yeti.bg(s), selector);
const fg = (page, selector) => page.evaluate((s) => window.__yeti.fg(s), selector);
const rgb = (q) => q.slice(0, 3);
// A 0% or 100% color-mix goes through oklch and back, so it may land a unit
// off the colour it mixed from; "the same colour" allows that and no more.
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);

const open = async (page, scheme) => {
	await page.emulateMedia({ colorScheme: scheme });
	await page.addInitScript(PAGE_HELPERS);
	const response = await page.goto('/test/browser/fixtures/layouts/paint.html');
	expect(response.status()).toBe(200);
	await painted(page);
};

for (const scheme of ['light', 'dark']) {
	test.describe(`paint in ${scheme}`, () => {
		test('grey-0 is the page surface and grey-100 is the page text', async ({ page }) => {
			await open(page, scheme);
			expect(near(rgb(await bg(page, '#g0')), rgb(await bg(page, 'body')))).toBe(true);
			expect(near(rgb(await bg(page, '#g100')), rgb(await fg(page, 'body')))).toBe(true);
			// Falsification: the two ends are not each other.
			expect(near(rgb(await bg(page, '#g0')), rgb(await bg(page, '#g100')))).toBe(false);
		});

		test('the scale runs toward the text, so it flips with the scheme', async ({ page }) => {
			await open(page, scheme);
			const low = luminance(rgb(await bg(page, '#g20')));
			const high = luminance(rgb(await bg(page, '#g80')));
			// Light: text is dark, so grey-80 is darker than grey-20. Dark: the reverse.
			expect(low > high).toBe(scheme === 'light');
			// Falsification: the two are not the same colour.
			expect(Math.abs(low - high)).toBeGreaterThan(0.1);
		});

		test('the constants do not move', async ({ page }) => {
			await open(page, scheme);
			expect(rgb(await bg(page, '#paint-white'))).toEqual([255, 255, 255]);
			expect(rgb(await bg(page, '#paint-black'))).toEqual([0, 0, 0]);
			expect(luminance(rgb(await bg(page, '#paint-grey')))).toBeCloseTo(0.18, 1);
		});

		test('text follows the fill: page text up to grey-40, page surface from grey-50', async ({ page }) => {
			await open(page, scheme);
			expect(rgb(await fg(page, '#g40'))).toEqual(rgb(await fg(page, 'body')));
			expect(rgb(await fg(page, '#g50'))).toEqual(rgb(await bg(page, 'body')));
			expect(rgb(await fg(page, '#paint-g20'))).toEqual(rgb(await fg(page, 'body')));
			expect(rgb(await fg(page, '#paint-g80'))).toEqual(rgb(await bg(page, 'body')));
		});

		test('a hue takes its on- colour and the constants take the one that reads', async ({ page }) => {
			await open(page, scheme);
			expect(contrast(rgb(await bg(page, '#paint-primary')), rgb(await fg(page, '#paint-primary')))).toBeGreaterThanOrEqual(4.5);
			expect(rgb(await fg(page, '#paint-white'))).toEqual([0, 0, 0]);
			expect(rgb(await fg(page, '#paint-black'))).toEqual([255, 255, 255]);
			expect(rgb(await fg(page, '#paint-grey'))).toEqual([0, 0, 0]);
			expect(contrast(rgb(await bg(page, '#paint-grey')), rgb(await fg(page, '#paint-grey')))).toBeGreaterThanOrEqual(4.5);
			// A plain link and a caption inside a painted band take the band's text
			// colour; before this rule the link was primary on primary.
			expect(rgb(await fg(page, '#paint-link'))).toEqual(rgb(await fg(page, '#paint-primary')));
			expect(rgb(await fg(page, '#paint-link'))).not.toEqual(rgb(await bg(page, '#paint-primary')));
			expect(rgb(await fg(page, '#paint-caption'))).toEqual([255, 255, 255]);
			// A caption that names its own colour keeps it; the inherit rule steps aside.
			expect(rgb(await fg(page, '#paint-caption-own'))).toEqual(rgb(await bg(page, '#paint-grey')));
			expect(rgb(await fg(page, '#paint-caption-own'))).not.toEqual([255, 255, 255]);
		});

		test('data-text wins over the automatic text colour, and works alone', async ({ page }) => {
			await open(page, scheme);
			expect(rgb(await fg(page, '#both'))).toEqual(rgb(await bg(page, '#g20')));
			expect(rgb(await fg(page, '#both'))).not.toEqual(rgb(await fg(page, '#paint-g80')));
			await page.evaluate(() => { document.getElementById('alert-probe').hidden = false; });
			expect(rgb(await fg(page, '#text-alert'))).toEqual(rgb(await fg(page, '#alert-probe')));
			expect((await bg(page, '#text-alert'))[3]).toBe(0); // alpha: no background was painted
		});

		test('a hued tone sits at its grey\'s lightness and carries the hue', async ({ page }) => {
			await open(page, scheme);
			const grey = rgb(await bg(page, '#g20'));
			const hued = rgb(await bg(page, '#p20'));
			// Equal oklch lightness is not equal sRGB luminance once chroma is
			// added, so the allowance is wide enough for a tint and no wider.
			expect(Math.abs(luminance(hued) - luminance(grey))).toBeLessThan(0.08);
			// A grey has three equal channels; a hued tone does not.
			expect(hued[0] === hued[2]).toBe(false);
		});

		test('a painted element keeps its background on paper', async ({ page }) => {
			await open(page, scheme);
			const adjust = await page.evaluate(() => getComputedStyle(document.querySelector('#paint-primary')).getPropertyValue('print-color-adjust'));
			expect(adjust).toBe('exact');
			// Falsification: an unpainted element has the default.
			const plain = await page.evaluate(() => getComputedStyle(document.querySelector('#text-alert')).getPropertyValue('print-color-adjust'));
			expect(plain).toBe('economy');
		});

		test('has no accessibility violations', async ({ page }) => {
			await open(page, scheme);
			expect(await axe(page)).toEqual([]);
		});
	});
}
