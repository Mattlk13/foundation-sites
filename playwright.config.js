import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
	testDir: 'test/browser',
	testMatch: '**/*.spec.js',
	// Baselines are named by the test, not by Playwright's platform suffix,
	// and live beside the tests so a re-bless is a reviewable diff.
	snapshotPathTemplate: '{testDir}/screenshots/{arg}{ext}',
	expect: {
		// A ratio over a two-million-pixel page hid a 178-pixel change, so the
		// allowance is absolute: enough for antialiasing wobble, not for a
		// moved border. The per-pixel distance is the other half of the
		// comparison, and the default 0.2 is blind to colour: moving
		// --yeti-hue-primary from 250 to 270 left all 96 baselines passing,
		// and only a 40-degree step to 290 failed 20 of them. At 0.1 the same
		// 10-degree step to 260 fails 20 and 270 fails 40, with the suite
		// green twice on an unchanged tree.
		toHaveScreenshot: { maxDiffPixels: 25, threshold: 0.1, animations: 'disabled' },
	},
	fullyParallel: true,
	reporter: process.env.CI ? 'github' : 'list',
	webServer: {
		command: 'node test/browser/serve.js',
		url: 'http://localhost:4173/test/browser/smoke.html',
		reuseExistingServer: !process.env.CI,
	},
	use: { baseURL: 'http://localhost:4173' },
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
	],
});
