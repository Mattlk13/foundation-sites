#!/usr/bin/env node
// Editor completion from the manifest: VS Code custom data and JetBrains
// web-types, both plain JSON from the same traversal. Neither format can key
// a completion off a class, and Yeti's identity is a class, so every
// attribute is offered on every element; each description opens with the
// components that accept it so the list explains itself.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSchema, loadAndMerge, loadVocabulary } from './lib/manifest.js';
import { readPackage } from './build.js';

/** Every distinct data-* name across attributes and markers, with who uses it. */
export function collectAttributes(merged) {
	const map = new Map();
	for (const component of Object.values(merged)) {
		const own = component.attributes.map((a) => ({ ...a, on: null }));
		const markers = (component.markers ?? []).map((m) => ({ ...m, on: m.on ?? '> *' }));
		for (const attr of [...own, ...markers]) {
			const entry = map.get(attr.name) ?? { type: attr.type, vocabulary: attr.vocabulary ?? null, values: attr.values ?? null, uses: [], description: attr.description };
			entry.uses.push({ component: component.name, on: attr.on, description: attr.description });
			map.set(attr.name, entry);
		}
	}
	return map;
}

// "rail, pill: Gap between items." for a root attribute; a marker names the
// element it lives on, since that is where the author will be typing.
function describe(entry) {
	const roots = entry.uses.filter((u) => u.on === null).map((u) => u.component);
	const markers = entry.uses.filter((u) => u.on !== null);
	const who = [
		...(roots.length ? [roots.join(', ')] : []),
		...markers.map((m) => `${m.component}, on a child (${m.on})`),
	].join('; ');
	return `${who}: ${entry.uses[0].description}`;
}

export function htmlData(merged, vocabulary) {
	const map = collectAttributes(merged);
	const used = new Set([...map.values()].map((e) => e.vocabulary).filter(Boolean));
	const valueSets = [...used].sort().map((name) => ({
		name: `yeti-${name}`,
		values: vocabulary[name].map((v) => ({ name: v })),
	}));
	const globalAttributes = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => {
		const out = { name, description: describe(entry) };
		if (entry.vocabulary) out.valueSet = `yeti-${entry.vocabulary}`;
		return out;
	});
	return { version: 1.1, valueSets, globalAttributes };
}

export function webTypes(merged, vocabulary, pkg) {
	const map = collectAttributes(merged);
	const attributes = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => {
		const out = { name, description: describe(entry) };
		if (entry.type === 'boolean') out.value = { kind: 'plain', type: 'boolean' };
		else if (entry.vocabulary) {
			out.value = { kind: 'plain', type: 'string' };
			out.values = vocabulary[entry.vocabulary].map((v) => ({ name: v }));
		} else out.value = { kind: 'plain', type: entry.type === 'number' ? 'number' : 'string' };
		return out;
	});
	return {
		$schema: 'https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json',
		name: pkg.name,
		version: pkg.version,
		'description-markup': 'markdown',
		contributions: { html: { attributes } },
	};
}

export function writeIde({ root, merged, vocabulary, pkg }) {
	const distDir = path.join(root, 'dist');
	fs.mkdirSync(distDir, { recursive: true });
	const outputs = [];
	const write = (rel, obj) => { fs.writeFileSync(path.join(distDir, rel), `${JSON.stringify(obj, null, 2)}\n`); outputs.push(rel); };
	write('yeti.html-data.json', htmlData(merged, vocabulary));
	write('yeti.web-types.json', webTypes(merged, vocabulary, pkg));
	return outputs;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	const root = process.cwd();
	const schema = loadSchema(path.join(root, 'schema', 'manifest.schema.json'));
	const vocabulary = loadVocabulary(path.join(root, 'schema', 'vocabulary.json'));
	const { merged, errors } = loadAndMerge(path.join(root, 'src'), schema, vocabulary);
	if (errors.length) { for (const e of errors) console.error(`${e.file}: ${e.message}`); process.exit(1); }
	const outputs = writeIde({ root, merged, vocabulary, pkg: readPackage(root) });
	console.log(`gen-ide: wrote ${outputs.join(', ')}`);
}
