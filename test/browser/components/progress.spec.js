import { test, expect } from 'playwright/test';
import { stage, rect, style, token, axe } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/components/progress.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};

test.describe('progress', () => {
	test('the bar is half the size step thick and rounded', async ({ page }) => {
		await open(page);
		expect((await rect(page, '#bar')).height).toBeCloseTo((await token(page, '--yeti-space-sm')) / 2, 0);
		expect((await rect(page, '#lg')).height).toBeCloseTo((await token(page, '--yeti-space-md')) / 2, 0);
		expect(await style(page, '#bar', 'border-top-left-radius')).not.toBe('0px');
	});

	test('the value is drawn in the variant colour', async ({ page, browserName }) => {
		await open(page);
		// Only Firefox exposes the progress value's own box to getComputedStyle:
		// Chromium reports the host element's background for
		// ::-webkit-progress-value, and WebKit reports nothing.
		test.skip(browserName !== 'firefox', 'the value is only readable through ::-moz-progress-bar');
		const [fill, primary] = await page.evaluate(() => {
			// Resolve the token on a probe, so the fill is checked against the
			// palette rather than against another reading of the same element.
			const probe = document.createElement('span');
			probe.style.color = 'var(--yeti-color-primary)';
			document.body.append(probe);
			const expected = getComputedStyle(probe).color;
			probe.remove();
			return [getComputedStyle(document.getElementById('bar'), '::-moz-progress-bar').backgroundColor, expected];
		});
		expect(fill).toBe(primary);
	});

	test('with no value the track is striped and moving', async ({ page }) => {
		await open(page);
		expect(await style(page, '#busy', 'background-image')).not.toBe('none');
		expect(await style(page, '#busy', 'animation-name')).toBe('yeti-progress');
		expect(await style(page, '#bar', 'background-image')).toBe('none');
	});

	test('under reduced motion the stripes stand still', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await open(page);
		expect(await style(page, '#busy', 'animation-iteration-count')).toBe('1');
		const positions = await page.evaluate(() => new Promise((resolve) => {
			const seen = [];
			const read = () => { seen.push(getComputedStyle(document.getElementById('busy')).backgroundPosition); if (seen.length < 6) requestAnimationFrame(read); else resolve(seen); };
			requestAnimationFrame(read);
		}));
		expect(new Set(positions).size).toBe(1);
	});

	test('data-scroll fills with the scroll of the page, or is not shown where a scroll timeline is missing', async ({ page }) => {
		await open(page);
		const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
		if (!supported) {
			expect(await style(page, '#scroll', 'display')).toBe('none');
			return;
		}
		// A scroll timeline advances with the rendered frame, not the scroll
		// call, so two frames are waited on after every move.
		const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
		const fill = () => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('scroll'), '::before').scale.split(' ')[0]));
		await frames();
		expect(await fill()).toBeCloseTo(0, 1);
		await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
		await frames(); await page.waitForTimeout(100); await frames();
		expect(await fill()).toBeCloseTo(0.5, 1);
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await frames(); await page.waitForTimeout(100); await frames();
		expect(await fill()).toBeCloseTo(1, 1);
		// Falsification: a plain value bar has no such fill.
		expect(await page.evaluate(() => getComputedStyle(document.getElementById('bar'), '::before').content)).toBe('none');
	});

	test('has no accessibility violations', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
	});

	test('--yeti-progress-size sets the thickness, on the element itself', async ({ page }) => {
		await open(page);
		await page.evaluate(() => document.getElementById('scroll').style.setProperty('--yeti-progress-size', '2px'));
		expect((await rect(page, '#scroll')).height).toBeCloseTo(2, 0);
		expect((await rect(page, '#bar')).height).toBeCloseTo((await token(page, '--yeti-space-sm')) / 2, 0);
	});
});
