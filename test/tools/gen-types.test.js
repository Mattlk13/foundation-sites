import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeName, renderTypes } from '../../bin/gen-types.js';

const vocabulary = { gap: ['s', 'm', 'l'], 'width-or-none': ['none', 'sm'] };
const merged = {
	rail: {
		name: 'rail', kind: 'layout', class: 'rail', description: 'A rail.',
		attributes: [{ name: 'data-gap', type: 'enum', vocabulary: 'gap', values: ['s', 'm', 'l'], default: 'm', description: 'Gap.' }],
		markers: [], classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: null, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
	pill: {
		name: 'pill', kind: 'component', class: 'pill', description: 'A pill.',
		attributes: [], markers: [], classes: [], children: [], tokens: [], a11y: { requiredAttributes: [], keyboard: [] }, js: { module: 'pill.js', optional: true }, support: { unguarded: [], guarded: [] }, since: '7.0.0', example: 'example.html',
	},
};

test('typeName turns a vocabulary name into a PascalCase Yeti type', () => {
	assert.equal(typeName('gap'), 'YetiGap');
	assert.equal(typeName('width-or-none'), 'YetiWidthOrNone');
	assert.equal(typeName('size-control'), 'YetiSizeControl');
});

test('renderTypes emits one string union per vocabulary and a union of component names', () => {
	const out = renderTypes(merged, vocabulary);
	assert.ok(out.includes("export type YetiGap = 's' | 'm' | 'l';"));
	assert.ok(out.includes("export type YetiWidthOrNone = 'none' | 'sm';"));
	assert.ok(out.includes("export type YetiComponentName = 'rail' | 'pill';"));
});

test('renderTypes types the manifest and token catalogue shapes and declares the two package modules', () => {
	const out = renderTypes(merged, vocabulary);
	for (const name of ['YetiAttribute', 'YetiMarker', 'YetiToken', 'YetiChild', 'YetiA11y', 'YetiComponent', 'YetiManifest', 'YetiTokenEntry', 'YetiTokenCatalogue']) {
		assert.ok(out.includes(`export interface ${name}`) || out.includes(`export type ${name}`), name);
	}
	assert.ok(out.includes("declare module 'yeti-css/manifest'"));
	assert.ok(out.includes("declare module 'yeti-css/tokens'"));
	assert.ok(out.includes('components: Record<YetiComponentName, YetiComponent>;'));
});

test('renderTypes output is structurally sound: balanced braces and every export named', () => {
	const out = renderTypes(merged, vocabulary);
	const opens = (out.match(/\{/g) || []).length;
	const closes = (out.match(/\}/g) || []).length;
	assert.equal(opens, closes);
	for (const line of out.split('\n').filter((l) => l.startsWith('export '))) {
		assert.match(line, /^export (type|interface) Yeti[A-Za-z]+/, line);
	}
});
