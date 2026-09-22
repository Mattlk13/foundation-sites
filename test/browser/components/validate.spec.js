import { test, expect } from 'playwright/test';
import { stage, style, axe, withoutModule } from '../lib/layout.js';

const open = async (page, width = 1000) => {
	const response = await page.goto('/test/browser/fixtures/components/validate.html');
	expect(response.status()).toBe(200);
	await stage(page, width);
};
const invalid = (page, id) => page.evaluate((i) => document.getElementById(i).getAttribute('aria-invalid'), id);
const text = (page, id) => page.evaluate((i) => document.getElementById(i).textContent, id);

// The module listens on document, so a listener added here runs after it and
// sees whether it prevented the submission. The test's own preventDefault is
// what keeps the page from navigating away when the module allows it through.
const submitOutcome = (page) => page.evaluate(() => new Promise((resolve) => {
	document.addEventListener('submit', (event) => {
		const prevented = event.defaultPrevented;
		event.preventDefault();
		resolve(prevented);
	}, { once: true });
	document.getElementById('send').click();
}));

test.describe('form validation', () => {
	test('an empty required control is marked, told why, and focused', async ({ page }) => {
		await open(page);
		expect(await invalid(page, 'email')).toBe(null);
		expect(await style(page, '#email-error', 'display')).toBe('none');
		await page.click('#send');
		expect(await invalid(page, 'email')).toBe('true');
		expect(await style(page, '#email-error', 'display')).toBe('block');
		const message = await page.evaluate(() => document.getElementById('email').validationMessage);
		expect(message).not.toBe('');
		expect(await text(page, 'email-error')).toBe(message);
		expect(await page.evaluate(() => document.activeElement.id)).toBe('email');
	});

	test('an error the page already wrote is left alone', async ({ page }) => {
		await open(page);
		await page.click('#send');
		expect(await invalid(page, 'name')).toBe('true');
		expect(await text(page, 'name-error')).toBe('Tell us what to call you.');
	});

	test('a refused submit dispatches yeti:invalid with the controls, in order', async ({ page }) => {
		await open(page);
		const caught = await page.evaluate(() => new Promise((resolve) => {
			document.addEventListener('yeti:invalid', (event) => resolve({
				target: event.target.id,
				bubbles: event.bubbles,
				composed: event.composed,
				controls: event.detail.controls.map((c) => c.id),
			}), { once: true });
			document.getElementById('send').click();
		}));
		expect(caught).toEqual({ target: 'signup', bubbles: true, composed: true, controls: ['email', 'name'] });
		expect(await submitOutcome(page)).toBe(true);
	});

	test('typing a valid value clears the mark', async ({ page }) => {
		await open(page);
		await page.click('#send');
		expect(await invalid(page, 'email')).toBe('true');
		await page.fill('#email', 'joe@example.com');
		expect(await invalid(page, 'email')).toBe(null);
		expect(await style(page, '#email-error', 'display')).toBe('none');
	});

	test('a form with nothing wrong is left to submit', async ({ page }) => {
		await open(page);
		await page.fill('#email', 'joe@example.com');
		await page.fill('#name', 'Joe');
		expect(await submitOutcome(page)).toBe(false);
	});

	test('without the module nothing is marked and the submit goes through', async ({ page }) => {
		await withoutModule(page, 'validate');
		await open(page);
		expect(await submitOutcome(page)).toBe(false);
		expect(await invalid(page, 'email')).toBe(null);
		expect(await text(page, 'email-error')).toBe('');
	});

	test('has no accessibility violations, before and after a refused submit', async ({ page }) => {
		await open(page);
		expect(await axe(page)).toEqual([]);
		await page.click('#send');
		expect(await axe(page)).toEqual([]);
	});
});
