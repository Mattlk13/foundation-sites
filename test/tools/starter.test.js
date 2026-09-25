import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers.js';

// The starter theme lists the essential settings, most of them commented out.
// A token removed or renamed in the catalogue must fail here rather than leave
// the starter naming something that no longer exists.
test('every token the starter theme names, commented or not, is public and themable', () => {
	const catalogue = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/tokens/tokens.json'), 'utf8'));
	const byName = new Map(catalogue.map((t) => [t.name, t]));
	const theme = fs.readFileSync(path.join(REPO_ROOT, 'src/starter/theme.css'), 'utf8');
	const names = [...new Set([...theme.matchAll(/--yeti-[a-z0-9-]+/g)].map((m) => m[0]))];
	assert.ok(names.length > 0, 'the starter theme names no tokens');
	const problems = names.flatMap((name) => {
		const token = byName.get(name);
		if (!token) return [`${name} is not in the catalogue`];
		if (!token.public) return [`${name} is not public`];
		if (token.theme === false) return [`${name} is a per-element input, not a theme value`];
		return [];
	});
	assert.deepEqual(problems, []);
});
