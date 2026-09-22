import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadSchema, loadAndMerge, loadVocabulary } from '../../bin/lib/manifest.js';
import { REPO_ROOT } from './helpers.js';
import { renderAttributeTable, renderGuide, GUIDE_TABLES } from '../../bin/gen-docs.js';

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
	const markdown = fs.readFileSync(path.join(REPO_ROOT, 'src/guides/migrating.md'), 'utf8');
	const names = yetiColumn(markdown);
	assert.ok(names.length > 20, 'the table has rows');
	const classes = new Set(Object.values(merged).map((c) => c.class));
	const attributes = new Set(Object.values(merged).flatMap((c) => [...c.attributes, ...(c.markers ?? [])].map((a) => a.name)));
	for (const { name, line } of names) {
		const bare = name.replace(/^\./, '').replace(/=.*$/, '').replace(/^<|>$/g, '').replace(/^\[|\]$/g, '');
		// The Yeti column sometimes answers a Foundation 6 class with something
		// the platform already provides and Yeti does not redeclare: an ARIA
		// attribute, a native element, the hidden attribute, a CSS declaration
		// to write yourself. Those have no manifest entry by design, so they are
		// named here rather than being allowed to slip through as a typo would.
		const known = classes.has(bare) || attributes.has(bare) || /^(aria-[a-z-]+(=.*)?|role=.*|popover|open|commandfor|hidden|visibility: hidden|<details>|<dialog>|<summary>|details|dialog|summary|name)$/.test(name);
		assert.ok(known, `${name} is not a Yeti class or attribute: ${line}`);
	}
});

test('every guide under docs/ is a fresh render of its source in src/guides', () => {
	const sourceDir = path.join(REPO_ROOT, 'src/guides');
	const sources = fs.readdirSync(sourceDir).filter((n) => n.endsWith('.md')).sort();
	assert.equal(sources.length, 10, 'the ten guides are written in src/guides');
	const tables = new Map(GUIDE_TABLES.map((t) => [t.file, t]));
	for (const name of sources) {
		const file = path.join(sourceDir, name);
		const { markdown, errors } = renderGuide({
			markdown: fs.readFileSync(file, 'utf8'),
			source: `src/guides/${name}`,
			file,
			table: tables.get(`guides/${name}`),
			merged,
		});
		assert.deepEqual(errors, [], `src/guides/${name} does not render`);
		assert.equal(markdown, fs.readFileSync(path.join(REPO_ROOT, 'docs/guides', name), 'utf8'), `docs/guides/${name} is stale; run npm run docs and commit it`);
	}
});

test('no page under docs/guides is left over from a source that is gone', () => {
	const sources = new Set(fs.readdirSync(path.join(REPO_ROOT, 'src/guides')).filter((n) => n.endsWith('.md')));
	for (const name of fs.readdirSync(path.join(REPO_ROOT, 'docs/guides')).filter((n) => n.endsWith('.md'))) {
		assert.ok(sources.has(name), `docs/guides/${name} has no source; run npm run docs`);
	}
});

test('each guide table has at least one row for every component of its kinds', () => {
	for (const { file, kinds, label } of GUIDE_TABLES) {
		const table = renderAttributeTable({ merged, kinds, label });
		for (const [name, m] of Object.entries(merged)) {
			if (!kinds.includes(m.kind)) continue;
			if (!m.attributes.length && !(m.markers ?? []).length) continue;
			assert.ok(table.includes(name), `${file} never names ${name}`);
		}
	}
});
