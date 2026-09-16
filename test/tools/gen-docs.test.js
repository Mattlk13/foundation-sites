import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderPage, generateDocs, isGenerated, GENERATED_MARK, renderTokensPage, escapeAttribute, renderDemo } from '../../bin/gen-docs.js';
import { makeTree, validManifest, validTree, TOKENS_SCHEMA_PATH } from './helpers.js';

const exampleHtml = '<div class="rail" data-gap="l"><p>One</p><p>Two</p></div>\n';

test('renderPage starts with front matter and the generated mark', () => {
	const page = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 3 });
	assert.ok(page.startsWith(
		'---\nraw: true\ntitle: "Rail"\ndescription: "A horizontal rail of items with a shared gap."\nnav_group: "Layouts"\nnav_order: 3\n---\n'
		+ `${GENERATED_MARK} from src/layouts/rail/manifest.json. Do not edit. -->\n`,
	));
});

test('renderPage includes every section with the manifest content', () => {
	const page = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 1 });
	for (const heading of ['# Rail', '## Example', '## Attributes', '## Children', '## Tokens', '## Accessibility', '## Browser support', '## JavaScript']) {
		assert.ok(page.includes(`\n${heading}\n`), `missing ${heading}`);
	}
	assert.ok(page.includes('```html\n<div class="rail" data-gap="l"><p>One</p><p>Two</p></div>\n```'));
	assert.ok(page.includes('| `data-gap` | enum | `s`, `m`, `l` | `m` | Gap between items. |'));
	assert.ok(page.includes('| `data-wrap` | boolean |  |  | Allow items to wrap. |'));
	assert.ok(page.includes('- `> *`: at least 1. The items.'));
	assert.ok(page.includes('| `--rail-gap` | The gap between items. |'));
	assert.ok(page.includes('<details><summary>Internal tokens'));
	assert.ok(page.includes('- `--rail-internal`'));
	assert.ok(page.includes('- Used without guards: flexbox'));
	assert.ok(page.includes('None. This component is CSS only.'));
	assert.ok(page.includes('Available since 7.0.0.'));
});

test('renderPage handles roles, keyboard, js, and multi-word names', () => {
	const manifest = validManifest({
		name: 'tab-strip', class: 'tab-strip', kind: 'component',
		a11y: { role: 'tablist', requiredAttributes: ['aria-label'], keyboard: [{ key: 'ArrowRight', action: 'Next tab' }], notes: 'Labels are required.' },
		js: { module: 'tab-strip.js', optional: true },
		support: { unguarded: [], guarded: ['anchor positioning'] },
	});
	const page = renderPage({ manifest, exampleHtml, navOrder: 1 });
	assert.ok(page.includes('title: "Tab Strip"'));
	assert.ok(page.includes('nav_group: "Components"'));
	assert.ok(page.includes('- Role: `tablist`'));
	assert.ok(page.includes('- Required attributes: `aria-label`'));
	assert.ok(page.includes('| `ArrowRight` | Next tab |'));
	assert.ok(page.includes('Optional enhancement: `components/tab-strip/tab-strip.js`. The component works without it.'));
	assert.ok(page.includes('- Behind `@supports`: anchor positioning'));
});

test('generateDocs writes a page per component, removes orphans, and leaves hand-written files alone', () => {
	const root = makeTree(validTree({
		'docs/guides/.gitkeep': '',
		'docs/hand-written.md': '# Mine\n',
		'docs/stale.md': `---\ntitle: "Old"\n---\n${GENERATED_MARK} from src/layouts/old/manifest.json. Do not edit. -->\n`,
	}));
	const r = generateDocs({ root });
	assert.deepEqual(r.errors, []);
	assert.deepEqual(r.written.map((f) => path.relative(root, f)), ['docs/rail.md']);
	assert.deepEqual(r.deleted.map((f) => path.relative(root, f)), ['docs/stale.md']);
	assert.ok(fs.existsSync(path.join(root, 'docs/hand-written.md')));
	assert.ok(fs.readFileSync(path.join(root, 'docs/rail.md'), 'utf8').includes('nav_order: 1'));
	const again = generateDocs({ root });
	assert.deepEqual(again.deleted, []);
});

test('isGenerated requires the mark right after the front matter, not anywhere in the file', () => {
	assert.equal(isGenerated(`---\ntitle: "X"\n---\n${GENERATED_MARK} from src/layouts/x/manifest.json. Do not edit. -->\n`), true);
	assert.equal(isGenerated(`---\ntitle: "Guide"\n---\n\n# About the generator\n\n\`\`\`html\n${GENERATED_MARK} from src/layouts/x/manifest.json. Do not edit. -->\n\`\`\`\n`), false);
	assert.equal(isGenerated(`# No front matter\n${GENERATED_MARK}`), false);
});

test('generateDocs keeps a hand-written page that quotes the generated mark', () => {
	const root = makeTree(validTree({
		'docs/about-docs.md': `---\ntitle: "About"\n---\n\nGenerated pages begin with:\n\n\`\`\`html\n${GENERATED_MARK} from src/layouts/x/manifest.json. Do not edit. -->\n\`\`\`\n`,
	}));
	const r = generateDocs({ root });
	assert.deepEqual(r.deleted, []);
	assert.ok(fs.existsSync(path.join(root, 'docs/about-docs.md')));
});

test('generateDocs refuses to overwrite a hand-written page with a component name', () => {
	const root = makeTree(validTree({ 'docs/rail.md': '# My own rail page\n' }));
	const r = generateDocs({ root });
	assert.equal(r.errors.length, 1);
	assert.match(r.errors[0].message, /refusing to overwrite/);
	assert.equal(fs.readFileSync(path.join(root, 'docs/rail.md'), 'utf8'), '# My own rail page\n');
});

test('generateDocs refuses to run on manifest errors', () => {
	const root = makeTree(validTree({ 'src/layouts/rail/manifest.json': validManifest({ since: 'x' }) }));
	const r = generateDocs({ root });
	assert.equal(r.errors.length, 1);
	assert.deepEqual(r.written, []);
});

const entries = [
	{ name: '--yeti-space-md', group: 'space', public: true, default: 'step 0', description: 'Default gap.' },
	{ name: '--yeti-hue-primary', group: 'hue', public: true, default: '250', description: 'Brand hue.' },
	{ name: '--yeti-base', group: 'scale', public: true, declared: false, default: 'unset', description: 'Pins both ends.' },
];

test('renderTokensPage groups by group with a table per group and notes internals', () => {
	const page = renderTokensPage(entries, 12);
	assert.ok(page.startsWith('---\nraw: true\ntitle: "Tokens"\n'));
	assert.ok(page.includes(`${GENERATED_MARK} from src/tokens/tokens.json. Do not edit. -->`));
	for (const h of ['## Scale', '## Space', '## Hue']) assert.ok(page.includes(`\n${h}\n`), h);
	assert.ok(page.indexOf('## Scale') < page.indexOf('## Space') && page.indexOf('## Space') < page.indexOf('## Hue'));
	assert.ok(page.includes('| `--yeti-space-md` | `step 0` | Default gap. |'));
	assert.ok(page.includes('| `--yeti-base` | unset (override only) | Pins both ends. |'));
	assert.ok(page.includes('12 internal `--_yeti-*` tokens'));
});

test('generateDocs writes tokens.md when a catalogue exists and never sweeps it', () => {
	const root = makeTree(validTree({
		'schema/tokens.schema.json': fs.readFileSync(TOKENS_SCHEMA_PATH, 'utf8'),
		'src/tokens/scale.css': '@layer yeti.base { :root { --yeti-base-min: 1rem; --_yeti-t: 0; --_yeti-base: 1rem; } }\n',
		'src/tokens/tokens.json': [{ name: '--yeti-base-min', group: 'scale', public: true, default: '1rem', description: 'x' }],
		'src/base/reset.css': '',
		'src/yeti.css': '@import "layers.css";\n@import "tokens/scale.css";\n@import "base/reset.css";\n@import "layouts/rail/rail.css";\n',
	}));
	const r = generateDocs({ root });
	assert.deepEqual(r.errors, []);
	assert.ok(r.written.map((f) => path.basename(f)).includes('tokens.md'));
	const again = generateDocs({ root });
	assert.deepEqual(again.deleted, []);
	assert.ok(fs.readFileSync(path.join(root, 'docs/tokens.md'), 'utf8').includes('2 internal `--_yeti-*` tokens'));
});

test('generateDocs sweeps a stale generated docs/tokens.md when there is no catalogue', () => {
	const root = makeTree(validTree({
		'docs/tokens.md': `---\ntitle: "Tokens"\n---\n${GENERATED_MARK} from src/tokens/tokens.json. Do not edit. -->\n`,
	}));
	const r = generateDocs({ root });
	assert.deepEqual(r.errors, []);
	assert.deepEqual(r.deleted.map((f) => path.basename(f)), ['tokens.md']);
	assert.ok(!fs.existsSync(path.join(root, 'docs/tokens.md')));
});

test('generateDocs refuses to run on an invalid catalogue', () => {
	const root = makeTree(validTree({
		'schema/tokens.schema.json': fs.readFileSync(TOKENS_SCHEMA_PATH, 'utf8'),
		'src/tokens/scale.css': '@layer yeti.base { :root { --yeti-base-min: 1rem; } }\n',
		'src/tokens/tokens.json': [{ name: '--yeti-base-min', group: 'nope', public: true, default: '1rem', description: 'x' }],
		'src/base/reset.css': '',
		'src/yeti.css': '@import "layers.css";\n@import "tokens/scale.css";\n@import "base/reset.css";\n@import "layouts/rail/rail.css";\n',
	}));
	const r = generateDocs({ root });
	assert.equal(r.errors.length, 1);
	assert.deepEqual(r.written, []);
	assert.ok(!fs.existsSync(path.join(root, 'docs/tokens.md')));
});

test('the internal token count ignores comments', () => {
	const root = makeTree(validTree({
		'schema/tokens.schema.json': fs.readFileSync(TOKENS_SCHEMA_PATH, 'utf8'),
		'src/tokens/scale.css': '/* --_yeti-commented: 0; */\n@layer yeti.base { :root { --yeti-base-min: 1rem; --_yeti-real: 1; } }\n',
		'src/tokens/tokens.json': [{ name: '--yeti-base-min', group: 'scale', public: true, default: '1rem', description: 'x' }],
		'src/base/reset.css': '',
		'src/yeti.css': '@import "layers.css";\n@import "tokens/scale.css";\n@import "base/reset.css";\n@import "layouts/rail/rail.css";\n',
	}));
	generateDocs({ root });
	assert.ok(fs.readFileSync(path.join(root, 'docs/tokens.md'), 'utf8').includes('1 internal `--_yeti-*` tokens'));
});

test('the tokens page renders the width and layout groups in order', () => {
	const page = renderTokensPage([
		{ name: '--yeti-width-xs', group: 'width', public: true, default: '16rem', description: 'x' },
		{ name: '--yeti-cover-height', group: 'layout', public: true, default: '100dvh', description: 'x' },
		{ name: '--yeti-radius-sm', group: 'radius', public: true, default: 'x', description: 'x' },
	], 0);
	assert.ok(page.indexOf('## Radius') < page.indexOf('## Width') && page.indexOf('## Width') < page.indexOf('## Layout'));
});

test('renderPage inserts a docs.md fragment after the example', () => {
	const page = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 1, docsMd: '## When to use it\n\nProse here.\n\n## Why this name\n\nBecause.\n' });
	assert.ok(page.indexOf('## Example') < page.indexOf('## When to use it'));
	assert.ok(page.indexOf('## Why this name') < page.indexOf('## Attributes'));
});

test('generateDocs reads docs.md from the component folder', () => {
	const root = makeTree(validTree({ 'src/layouts/rail/docs.md': '## Why this name\n\nBecause.\n' }));
	generateDocs({ root });
	assert.ok(fs.readFileSync(path.join(root, 'docs/rail.md'), 'utf8').includes('## Why this name'));
});

test('a recipe renders into the Recipes group', () => {
	const page = renderPage({ manifest: validManifest({ name: 'duo', kind: 'recipe', class: 'duo' }), exampleHtml: '<div class="duo"><p>a</p><p>b</p></div>\n', navOrder: 1 });
	assert.ok(page.includes('nav_group: "Recipes"'));
	assert.ok(page.includes('from src/recipes/duo/manifest.json'));
});

test('the tokens page renders component groups after the framework groups', () => {
	const page = renderTokensPage([
		{ name: '--yeti-card-radius', group: 'card', public: true, default: 'x', description: 'x' },
		{ name: '--yeti-border-width', group: 'border', public: true, default: '1px', description: 'x' },
		{ name: '--yeti-color-text', group: 'color', public: true, default: 'x', description: 'x' },
	], 0);
	assert.ok(page.indexOf('## Color') < page.indexOf('## Border') && page.indexOf('## Border') < page.indexOf('## Card'));
});

test('renderPage renders a Markers table after Attributes, only when the manifest has markers', () => {
	const none = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 1 });
	assert.ok(!none.includes('## Markers'));
	const manifest = validManifest({ markers: [
		{ name: 'data-span', type: 'enum', values: ['1', '2'], on: '> *', description: 'Shares of the row.' },
		{ name: 'data-split', type: 'boolean', description: 'Pushed to the end.' },
	] });
	const page = renderPage({ manifest, exampleHtml, navOrder: 1 });
	assert.ok(page.indexOf('## Attributes') < page.indexOf('## Markers'));
	assert.ok(page.indexOf('## Markers') < page.indexOf('## Children'));
	assert.ok(page.includes('| `data-span` | enum | `1`, `2` | `> *` | Shares of the row. |'));
	assert.ok(page.includes('| `data-split` | boolean |  |  | Pushed to the end. |'));
});

test('renderPage spells a required-attribute alternation with "or"', () => {
	const manifest = validManifest({ a11y: { requiredAttributes: ['role', 'aria-label | aria-labelledby'], keyboard: [] } });
	const page = renderPage({ manifest, exampleHtml, navOrder: 1 });
	assert.ok(page.includes('- Required attributes: `role`, `aria-label` or `aria-labelledby`'));
});

test('escapeAttribute escapes exactly what an attribute value needs and round-trips', () => {
	const raw = '<a href="x" data-q=\'y\'>a & b</a>';
	const escaped = escapeAttribute(raw);
	assert.equal(escaped, '&lt;a href=&quot;x&quot; data-q=&#39;y&#39;&gt;a &amp; b&lt;/a&gt;');
	const back = escaped.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
	assert.equal(back, raw);
});

test('renderDemo frames the example with the stylesheet ahead of it and fences it under a details', () => {
	const out = renderDemo({ title: 'Rail', exampleHtml: '<div class="rail"><p>One</p></div>', stylesheet: '/yeti/yeti.css' });
	assert.ok(out.startsWith('<figure class="demo" data-height="md">\n<div data-preview tabindex="0"><iframe title="Rail, live" srcdoc="'));
	assert.ok(out.includes('&lt;link rel=&quot;stylesheet&quot; href=&quot;/yeti/yeti.css&quot;&gt;'));
	assert.ok(out.includes('&lt;div class=&quot;rail&quot;&gt;'));
	// Blank lines separate the raw HTML from the fence, so Markdown parses the code.
	assert.ok(out.includes('</div>\n\n<details>\n<summary>Code</summary>\n\n```html\n<div class="rail"><p>One</p></div>\n```\n\n</details>\n</figure>'));
});

test('renderPage puts the demo where the bare example was and honours the stylesheet option', () => {
	const page = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 1, demoStylesheet: '/assets/y.css' });
	assert.ok(page.includes('## Example\n\n<figure class="demo"'));
	assert.ok(page.includes('href=&quot;/assets/y.css&quot;'));
	assert.ok(page.includes('```html\n<div class="rail" data-gap="l"><p>One</p><p>Two</p></div>\n```'));
	assert.ok(!page.includes('## Example\n\n```html'));
});

test('renderPage defaults the demo stylesheet to the site path', () => {
	const page = renderPage({ manifest: validManifest(), exampleHtml, navOrder: 1 });
	assert.ok(page.includes('href=&quot;/yeti/yeti.css&quot;'));
});
