import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadSchema, loadAndMerge, loadVocabulary } from '../../bin/lib/manifest.js';
import { REPO_ROOT } from './helpers.js';

const schema = loadSchema(path.join(REPO_ROOT, 'schema/manifest.schema.json'));
const vocabulary = loadVocabulary(path.join(REPO_ROOT, 'schema/vocabulary.json'));
const { merged } = loadAndMerge(path.join(REPO_ROOT, 'src'), schema, vocabulary);

/** Every backticked name in the Yeti column of the migration table. */
function yetiColumn(markdown) {
	const names = [];
	for (const line of markdown.split('\n')) {
		if (!line.startsWith('| ')) continue;
		const cells = line.split('|').map((c) => c.trim());
		if (cells.length < 4 || cells[1] === 'Foundation 6' || cells[1].startsWith('---')) continue;
		for (const m of cells[2].matchAll(/`([^`]+)`/g)) names.push({ name: m[1], line });
	}
	return names;
}

test('every Yeti class and attribute the migration table names exists in the manifest', () => {
	const markdown = fs.readFileSync(path.join(REPO_ROOT, 'docs/guides/migrating.md'), 'utf8');
	const names = yetiColumn(markdown);
	assert.ok(names.length > 20, 'the table has rows');
	const classes = new Set(Object.values(merged).map((c) => c.class));
	const attributes = new Set(Object.values(merged).flatMap((c) => [...c.attributes, ...(c.markers ?? [])].map((a) => a.name)));
	for (const { name, line } of names) {
		const bare = name.replace(/^\./, '').replace(/=.*$/, '').replace(/^<|>$/g, '').replace(/^\[|\]$/g, '');
		const known = classes.has(bare) || attributes.has(bare) || /^(aria-[a-z-]+(=.*)?|role=.*|popover|open|<details>|<dialog>|<summary>|details|dialog|summary|name)$/.test(name);
		assert.ok(known, `${name} is not a Yeti class or attribute: ${line}`);
	}
});
