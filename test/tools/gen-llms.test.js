import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCompact, renderFull } from '../../bin/gen-llms.js';

const pkg = { name: 'yeti-css', version: '7.0.0-beta.0', homepage: 'https://foundationcss.com/yeti/' };
const merged = {
	rail: {
		name: 'rail', kind: 'layout', class: 'rail', description: 'A horizontal rail of items with a shared gap.',
		attributes: [
			{ name: 'data-gap', type: 'enum', vocabulary: 'gap', values: ['s', 'm', 'l'], default: 'm', description: 'Gap between items.' },
			{ name: 'data-wrap', type: 'boolean', description: 'Allow items to wrap.' },
		],
		markers: [{ name: 'data-span', type: 'enum', values: ['1', '2'], on: '> *', description: 'Shares of the row.' }],
		classes: [], children: [{ selector: '> *', min: 1, max: null, description: 'The items.' }], tokens: [{ name: '--rail-gap', public: true, description: 'The gap.' }],
		a11y: { requiredAttributes: ['aria-label | aria-labelledby'], keyboard: [{ key: 'Tab', action: 'Moves between items.' }], notes: 'Give it a name.' },
		js: { module: 'rail.js', optional: true }, support: { unguarded: ['flexbox'], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
	pill: {
		name: 'pill', kind: 'component', class: 'pill', description: 'A pill.',
		attributes: [], markers: [], classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: null, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
};
const tokens = [{ name: '--yeti-space-md', group: 'space', public: true, default: '1rem', description: 'Medium space.' }];
const docs = { rail: '## When to use it\n\nA row of things.\n' };

test('the compact file names every component once with its class, kind and attributes', () => {
	const out = renderCompact(merged, pkg);
	assert.equal(out.match(/^## rail /gm).length, 1);
	assert.equal(out.match(/^## pill /gm).length, 1);
	assert.ok(out.includes('## rail (layout, class="rail")'));
	assert.ok(out.includes('- data-gap: s | m (default) | l — Gap between items.'));
	assert.ok(out.includes('- data-wrap (boolean) — Allow items to wrap.'));
	assert.ok(out.includes('- data-span on > *: 1 | 2 — Shares of the row.'));
	assert.ok(out.includes('module: rail.js (optional)'));
	assert.ok(out.indexOf('## rail') < out.indexOf('## pill'), 'layouts come before components');
});

test('the compact file opens with the framework name, version and the three-part model', () => {
	const out = renderCompact(merged, pkg);
	assert.ok(out.startsWith('# Yeti 7.0.0-beta.0\n'));
	assert.ok(out.includes('identity is a class'));
	assert.ok(!out.includes('When to use it'), 'no docs fragments in the compact file');
});

test('the full file adds the docs fragment, accessibility, children and the token catalogue', () => {
	const out = renderFull(merged, tokens, docs, pkg);
	assert.ok(out.includes('A row of things.'));
	assert.ok(out.includes('Required: aria-label | aria-labelledby'));
	assert.ok(out.includes('- Tab: Moves between items.'));
	assert.ok(out.includes('Give it a name.'));
	assert.ok(out.includes('- > *: at least 1. The items.'));
	assert.ok(out.includes('--yeti-space-md (space): 1rem — Medium space.'));
	assert.ok(out.includes('- --rail-gap — The gap.'));
});

test('every enumerated value appears and the default is marked exactly once per attribute', () => {
	const out = renderCompact(merged, pkg);
	const line = out.split('\n').find((l) => l.startsWith('- data-gap:'));
	for (const v of ['s', 'm', 'l']) assert.ok(line.includes(v));
	assert.equal((line.match(/\(default\)/g) || []).length, 1);
});
