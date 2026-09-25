import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { REPO_ROOT } from './helpers.js';

const SOURCE_PATH = path.join(REPO_ROOT, 'src/utilities/enter/enter.js');

/**
 * Loads enter.js into a fresh vm context with just enough of a DOM to let the
 * module's top level run without throwing, then hands back the context so a
 * test can call its top-level pure functions directly. The module never
 * exercises the stubs below beyond that: querySelectorAll and getAnimations
 * both come back empty, so no real wiring happens here at all — only
 * shouldPause() and isInView() are under test.
 */
function load() {
	class IntersectionObserver {
		observe() {}
		unobserve() {}
	}
	const context = {
		document: {
			querySelectorAll: () => [],
			getAnimations: () => [],
			addEventListener: () => {},
			timeline: {},
		},
		IntersectionObserver,
		WeakSet,
		console,
	};
	context.window = context;
	context.window.innerHeight = 600;
	vm.createContext(context);
	const source = fs.readFileSync(SOURCE_PATH, 'utf8');
	new vm.Script(source, { filename: SOURCE_PATH }).runInContext(context);
	return context;
}

test('a released element never pauses', () => {
	const { shouldPause } = load();
	assert.equal(shouldPause({ timelineIsDocument: true, released: true, alreadyPaused: false, inView: false }), false);
});

test('an already-paused animation does not pause a second time', () => {
	const { shouldPause } = load();
	assert.equal(shouldPause({ timelineIsDocument: true, released: false, alreadyPaused: true, inView: false }), false);
});

test('a scroll-driven (non-document-timeline) animation is never paused', () => {
	const { shouldPause } = load();
	assert.equal(shouldPause({ timelineIsDocument: false, released: false, alreadyPaused: false, inView: false }), false);
	// Not even an off-screen one: data-view owns it entirely.
	assert.equal(shouldPause({ timelineIsDocument: false, released: false, alreadyPaused: false, inView: true }), false);
});

test('an element already in view is left alone', () => {
	const { shouldPause } = load();
	assert.equal(shouldPause({ timelineIsDocument: true, released: false, alreadyPaused: false, inView: true }), false);
});

test('an off-screen, unreleased, not-yet-paused document-timeline arrival pauses', () => {
	const { shouldPause } = load();
	assert.equal(shouldPause({ timelineIsDocument: true, released: false, alreadyPaused: false, inView: false }), true);
});

test('isInView: entirely below the viewport is not in view', () => {
	const { isInView } = load();
	assert.equal(isInView({ top: 700, bottom: 900 }, 600), false);
});

test('isInView: entirely above the viewport is not in view', () => {
	const { isInView } = load();
	assert.equal(isInView({ top: -900, bottom: -100 }, 600), false);
});

test('isInView: fully inside the viewport is in view', () => {
	const { isInView } = load();
	assert.equal(isInView({ top: 100, bottom: 200 }, 600), true);
});

test('isInView: partial overlap at the top edge counts as in view', () => {
	const { isInView } = load();
	// A tall element whose top has already scrolled past the top of the
	// viewport, but whose bottom has not yet: the case an intersection
	// ratio of the target's own area would badly undercount.
	assert.equal(isInView({ top: -400, bottom: 50 }, 600), true);
});

test('isInView: partial overlap at the bottom edge counts as in view', () => {
	const { isInView } = load();
	assert.equal(isInView({ top: 590, bottom: 1200 }, 600), true);
});
