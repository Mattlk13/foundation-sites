import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAttributes, htmlData, webTypes } from '../../bin/gen-ide.js';

const vocabulary = { gap: ['s', 'm', 'l'], span: ['1', '2'] };
const merged = {
	rail: {
		name: 'rail', kind: 'layout', class: 'rail', description: 'A horizontal rail.',
		attributes: [
			{ name: 'data-gap', type: 'enum', vocabulary: 'gap', values: ['s', 'm', 'l'], default: 'm', description: 'Gap between items.' },
			{ name: 'data-wrap', type: 'boolean', description: 'Allow items to wrap.' },
		],
		markers: [{ name: 'data-span', type: 'enum', vocabulary: 'span', values: ['1', '2'], on: '> *', description: 'Shares of the row the child takes.' }],
		classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: null, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
	pill: {
		name: 'pill', kind: 'component', class: 'pill', description: 'A pill.',
		attributes: [{ name: 'data-gap', type: 'enum', vocabulary: 'gap', values: ['s', 'm', 'l'], default: 's', description: 'Space inside.' }],
		classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: null, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
};

test('collectAttributes merges an attribute shared by two components and keeps markers apart by element', () => {
	const map = collectAttributes(merged);
	assert.deepEqual([...map.keys()].sort(), ['data-gap', 'data-span', 'data-wrap']);
	assert.deepEqual(map.get('data-gap').uses.map((u) => u.component), ['rail', 'pill']);
	assert.equal(map.get('data-span').uses[0].on, '> *');
	assert.equal(map.get('data-wrap').type, 'boolean');
});

test('htmlData emits one value set per used vocabulary', () => {
	const out = htmlData(merged, vocabulary);
	assert.equal(out.version, 1.1);
	assert.deepEqual(out.valueSets.map((s) => s.name).sort(), ['yeti-gap', 'yeti-span']);
	assert.deepEqual(out.valueSets.find((s) => s.name === 'yeti-gap').values.map((v) => v.name), ['s', 'm', 'l']);
});

test('htmlData emits one global attribute per name', () => {
	const out = htmlData(merged, vocabulary);
	const names = out.globalAttributes.map((a) => a.name);
	assert.deepEqual(names.sort(), ['data-gap', 'data-span', 'data-wrap']);
	assert.equal(names.length, new Set(names).size);
});

test('htmlData descriptions open with the components that accept the attribute', () => {
	const out = htmlData(merged, vocabulary);
	const gap = out.globalAttributes.find((a) => a.name === 'data-gap');
	assert.ok(gap.description.startsWith('rail, pill: '), gap.description);
	assert.equal(gap.valueSet, 'yeti-gap');
});

test("a marker's description names the element it lives on", () => {
	const out = htmlData(merged, vocabulary);
	const span = out.globalAttributes.find((a) => a.name === 'data-span');
	assert.ok(span.description.startsWith('rail, on a child (> *): '), span.description);
});

test('a boolean attribute carries no value set', () => {
	const out = htmlData(merged, vocabulary);
	const wrap = out.globalAttributes.find((a) => a.name === 'data-wrap');
	assert.equal(wrap.valueSet, undefined);
	assert.ok(wrap.description.length > 0);
});

test('every enumerated attribute references a value set that exists', () => {
	const out = htmlData(merged, vocabulary);
	const sets = new Set(out.valueSets.map((s) => s.name));
	for (const a of out.globalAttributes) if (a.valueSet) assert.ok(sets.has(a.valueSet), a.name);
});

test('an enum with inline values and no vocabulary still gets a value set', () => {
	const withInline = {
		tabs: {
			name: 'tabs', kind: 'component', class: 'tabs', description: 'A tab list.',
			attributes: [{ name: 'data-orientation', type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal', description: 'Layout direction.' }],
			classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: null, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
		},
	};
	const html = htmlData(withInline, {});
	const attr = html.globalAttributes.find((a) => a.name === 'data-orientation');
	assert.equal(attr.valueSet, 'yeti-data-orientation');
	assert.deepEqual(html.valueSets.find((s) => s.name === 'yeti-data-orientation').values.map((v) => v.name), ['horizontal', 'vertical']);

	const types = webTypes(withInline, {}, { name: 'yeti-css', version: '7.0.0-beta.0' });
	const wtAttr = types.contributions.html.attributes.find((a) => a.name === 'data-orientation');
	assert.deepEqual(wtAttr.values.map((v) => v.name), ['horizontal', 'vertical']);
});

test('webTypes carries the package name and version and lists values for enumerated attributes', () => {
	const out = webTypes(merged, vocabulary, { name: 'yeti-css', version: '7.0.0-beta.0' });
	assert.equal(out.name, 'yeti-css');
	assert.equal(out.version, '7.0.0-beta.0');
	const attrs = out.contributions.html.attributes;
	const gap = attrs.find((a) => a.name === 'data-gap');
	assert.deepEqual(gap.values.map((v) => v.name), ['s', 'm', 'l']);
	assert.ok(gap.description.startsWith('rail, pill: '));
	const wrap = attrs.find((a) => a.name === 'data-wrap');
	assert.equal(wrap.values, undefined);
	assert.equal(wrap.value.type, 'boolean');
});
