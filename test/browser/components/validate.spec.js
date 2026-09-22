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

// Every required control in the fixture, answered. The form has five of them,
// in a field and out of one, so a test about one has to satisfy the rest.
const fillAll = async (page) => {
	await page.fill('#email', 'joe@example.com');
	await page.fill('#name', 'Joe');
	await page.check('#plan-free');
	await page.selectOption('#size', 's');
	await page.fill('#code', 'YETI');
};

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
		expect(caught).toEqual({ target: 'signup', bubbles: true, composed: true, controls: ['email', 'name', 'plan-free', 'plan-pro', 'size', 'code'] });
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
		await fillAll(page);
		expect(await submitOutcome(page)).toBe(false);
	});

	test("a radio group's message goes to the fieldset that owns the slot", async ({ page }) => {
		await open(page);
		expect(await style(page, '#plan-error', 'display')).toBe('none');
		await page.click('#send');
		// Every radio of the group suffers from being missing, so every one of
		// them is marked; the message belongs to the fieldset above them, not to
		// the .field around each input, which has no slot at all.
		expect(await invalid(page, 'plan-free')).toBe('true');
		expect(await invalid(page, 'plan-pro')).toBe('true');
		const message = await page.evaluate(() => document.getElementById('plan-free').validationMessage);
		expect(message).not.toBe('');
		expect(await text(page, 'plan-error')).toBe(message);
		expect(await text(page, 'plan-error')).not.toBe('');
		expect(await style(page, '#plan-error', 'display')).toBe('block');
	});

	test('a select in a plain field still gets its own message', async ({ page }) => {
		await open(page);
		await page.click('#send');
		const message = await page.evaluate(() => document.getElementById('size').validationMessage);
		expect(await text(page, 'size-error')).toBe(message);
		expect(await style(page, '#size-error', 'display')).toBe('block');
	});

	test('picking one radio clears the mark on its siblings and hides the group error', async ({ page }) => {
		await open(page);
		await page.click('#send');
		expect(await invalid(page, 'plan-free')).toBe('true');
		expect(await invalid(page, 'plan-pro')).toBe('true');
		// change fires on the radio that became checked and on no other, so the
		// siblings would keep the mark and the group would stay red.
		await page.check('#plan-pro');
		expect(await invalid(page, 'plan-pro')).toBe(null);
		expect(await invalid(page, 'plan-free')).toBe(null);
		expect(await style(page, '#plan-error', 'display')).toBe('none');
	});

	test('an invalid control outside any field still stops the submit and is named', async ({ page }) => {
		await open(page);
		await fillAll(page);
		await page.fill('#code', '');
		await page.evaluate(() => {
			window.caught = null;
			window.prevented = null;
			document.addEventListener('yeti:invalid', (event) => { window.caught = event.detail.controls.map((c) => c.id); }, { once: true });
			document.addEventListener('submit', (event) => {
				window.prevented = event.defaultPrevented;
				event.preventDefault();
			}, { once: true });
		});
		await page.click('#send');
		// Nothing is written, because there is no slot; the submit stops all the
		// same, which under novalidate is the only thing standing in the way.
		expect(await page.evaluate(() => window.prevented)).toBe(true);
		expect(await page.evaluate(() => window.caught)).toEqual(['code']);
		expect(await invalid(page, 'code')).toBe('true');
	});

	test('a submit the page prevented first is left alone', async ({ page }) => {
		await open(page);
		// Capture phase, so it runs before the module's own listener on document.
		await page.evaluate(() => document.addEventListener('submit', (event) => event.preventDefault(), { capture: true }));
		await page.click('#send');
		// Nothing marked and nothing written. The empty box the field shows is
		// :user-invalid, which a submit attempt sets whatever any script does.
		expect(await invalid(page, 'email')).toBe(null);
		expect(await invalid(page, 'plan-free')).toBe(null);
		expect(await invalid(page, 'code')).toBe(null);
		expect(await text(page, 'email-error')).toBe('');
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
