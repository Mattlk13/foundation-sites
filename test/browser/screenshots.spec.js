// One baseline per fixture per colour scheme, Chromium only. Every fixture
// under test/browser/fixtures is listed at load, so a new fixture is covered
// with no edit here. Baselines are captured on the machine that runs them
// and tied to its fonts; CONTRIBUTING.md says when to re-bless.
import { test, expect } from 'playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { painted } from './lib/layout.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixtures = [];
const walk = (dir) => {
	for (const name of fs.readdirSync(dir).sort()) {
		const file = path.join(dir, name);
		if (fs.statSync(file).isDirectory()) walk(file);
		else if (name.endsWith('.html')) fixtures.push(path.relative(fixturesDir, file));
	}
};
walk(fixturesDir);

test.describe('screenshots', () => {
	test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are captured in Chromium only');

	for (const fixture of fixtures) {
		for (const scheme of ['light', 'dark']) {
			test(`${fixture} in ${scheme}`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.setViewportSize({ width: 1000, height: 800 });
				const response = await page.goto(`/test/browser/fixtures/${fixture}`);
				expect(response.status()).toBe(200);
				await painted(page);
				const name = `${fixture.replace(/\//g, '-').replace(/\.html$/, '')}-${scheme}.png`;
				await expect(page).toHaveScreenshot(name, { fullPage: true });
			});
		}
	}
});
