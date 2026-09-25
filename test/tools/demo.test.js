import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// demo.js is a plain script that wires itself to the page as it loads, so it
// runs here against a page with no demos; its top-level functions are then
// globals of the context.
const source = readFileSync(new URL('../../src/components/demo/demo.js', import.meta.url), 'utf8');
const context = vm.createContext({
	document: { querySelectorAll: () => [], querySelector: () => null, body: {}, baseURI: 'http://localhost/', documentElement: {} },
	MutationObserver: class { observe() {} },
	ResizeObserver: class { observe() {} },
	Node: { ELEMENT_NODE: 1 },
	getComputedStyle: () => ({ fontSize: '16px' }),
});
vm.runInContext(source, context);
const { widthFromDrag, stepWidth, stopName } = context;

const rem = 16;
const stops = [['2xs', 12], ['xs', 16], ['sm', 24], ['md', 32], ['lg', 48], ['xl', 64], ['2xl', 80]].map(([name, r]) => ({ name, px: r * rem }));
const stopsPx = stops.map((s) => s.px);

test('a drag adds the travel, or takes it away in a right-to-left page', () => {
	assert.equal(widthFromDrag(500, 40, false, 256, 1000), 540);
	assert.equal(widthFromDrag(500, -40, false, 256, 1000), 460);
	assert.equal(widthFromDrag(500, 40, true, 256, 1000), 460);
	assert.equal(widthFromDrag(500, -40, true, 256, 1000), 540);
});

test('a drag stops at the min and the max', () => {
	assert.equal(widthFromDrag(500, -400, false, 256, 1000), 256);
	assert.equal(widthFromDrag(500, 900, false, 256, 1000), 1000);
	assert.equal(widthFromDrag(500, 400, true, 256, 1000), 256);
});

test('a step goes to the next stop up or down', () => {
	assert.equal(stepWidth(600, 1, stopsPx, 256, 1400), 768);
	assert.equal(stepWidth(600, -1, stopsPx, 256, 1400), 512);
});

test('a width on a stop, or a hair off it, steps to the stop beyond', () => {
	assert.equal(stepWidth(512, 1, stopsPx, 256, 1400), 768);
	assert.equal(stepWidth(512, -1, stopsPx, 256, 1400), 384);
	assert.equal(stepWidth(511.8, 1, stopsPx, 256, 1400), 768);
	assert.equal(stepWidth(512.2, -1, stopsPx, 256, 1400), 384);
});

test('past the last stop that fits, a step lands on the max or the min', () => {
	assert.equal(stepWidth(1280, 1, stopsPx, 256, 1400), 1400);
	assert.equal(stepWidth(1400, 1, stopsPx, 256, 1400), 1400);
	assert.equal(stepWidth(900, 1, stopsPx, 256, 1000), 1000);
	assert.equal(stepWidth(256, -1, stopsPx, 256, 1400), 256);
	assert.equal(stepWidth(300, -1, stopsPx, 256, 1400), 256);
});

test('a stop below the min is clamped to the min', () => {
	assert.equal(stepWidth(384, -1, stopsPx, 300, 1400), 300);
});

test('the stop name is the largest stop at or below the width', () => {
	assert.equal(stopName(512, stops), 'md');
	assert.equal(stopName(511, stops), 'sm');
	assert.equal(stopName(767, stops), 'md');
	assert.equal(stopName(768, stops), 'lg');
	assert.equal(stopName(1400, stops), '2xl');
	assert.equal(stopName(511.8, stops), 'sm', 'exact, as the container query is');
});

test('below sm the name is xs, as the label reads', () => {
	assert.equal(stopName(383, stops), 'xs');
	assert.equal(stopName(256, stops), 'xs');
	assert.equal(stopName(100, stops), 'xs');
	assert.equal(stopName(384, stops), 'sm');
});
