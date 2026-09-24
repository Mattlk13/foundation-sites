import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceAt, compareSurfaces } from '../../bin/frozen.js';
import { REPO_ROOT } from './helpers.js';

const empty = () => ({ classes: new Set(), attributes: new Map(), markers: new Map(), events: new Set(), modules: new Set(), vocabularies: new Map(), tokens: new Set() });

test('a marker on * is also its class\'s attribute', () => {
	const head = surfaceAt(REPO_ROOT, 'HEAD');
	assert.ok(head.attributes.has('box data-border'));
	assert.ok(head.markers.has('box data-border'));
});

test('an attribute that became a marker on * is not reported gone', () => {
	const before = empty();
	before.attributes.set('box data-border', new Set());
	const { breaks } = compareSurfaces(before, surfaceAt(REPO_ROOT, 'HEAD'));
	assert.ok(!breaks.includes('attribute box data-border is gone'), breaks.join('\n'));
});
