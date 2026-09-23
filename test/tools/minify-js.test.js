import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { minifyJs, bannered } from '../../bin/lib/minify-js.js';

test('comments and whitespace go, names shorten, and the result still parses', () => {
	const source = '// why this exists\nconst greeting = "hello"; /* a block */\nfunction announce(message) { return `${greeting} ${message}`; }\ndocument.title = announce("world");\n';
	const { js } = minifyJs(source);
	assert.ok(js.length < source.length, `${js.length} is not smaller than ${source.length}`);
	assert.ok(!js.includes('why this exists') && !js.includes('a block'));
	assert.ok(!js.includes('\n'), 'one line');
	assert.ok(js.includes('"hello"'), 'strings survive');
	assert.doesNotThrow(() => new vm.Script(js));
});

test('a comment marker inside a string, a template or a regex is not a comment', () => {
	const source = 'const url = "https://foundationcss.com/yeti/";\nconst t = `a // ${url} /* b */`;\nconst re = /\\/\\/ not a comment/g;\ndocument.title = t + re.source;\n';
	const { js } = minifyJs(source);
	assert.ok(js.includes('https://foundationcss.com/yeti/'));
	assert.ok(js.includes('/* b */'), 'the template keeps its text');
	assert.ok(js.includes('not a comment'), 'the regex keeps its text');
	assert.doesNotThrow(() => new vm.Script(js));
});

test('modern syntax is kept, not transpiled', () => {
	const source = 'const a = document.querySelector?.(".x") ?? null;\nclass K { #hidden = 1; static of() { return new K(); } }\ndocument.title = String(a ?? K.of());\n';
	const { js } = minifyJs(source);
	assert.ok(js.includes('?.') && js.includes('??'), 'optional chaining and nullish coalescing stay');
	assert.ok(js.includes('#'), 'the private field stays a private field');
});

test('a source the minifier cannot read stops the build with the line named', () => {
	assert.throws(() => minifyJs('const a = "unterminated;\n'), /1:/);
	assert.throws(() => minifyJs('const a = /unterminated\n'), /1:/);
	assert.throws(() => minifyJs('function ( {\n'), Error);
});

test('the map names its one source and maps into it', () => {
	const { map } = minifyJs('const a = 1;\n\nconst b = 2;\n', { sourcefile: 'yeti.js' });
	assert.deepEqual(map.sources, ['yeti.js']);
	assert.equal(map.sourcesContent, undefined, 'the readable file is beside it; its text is not repeated');
	assert.ok(map.mappings.length > 0);
});

test('bannered shifts the map down one generated line and names the file', () => {
	const shifted = bannered({ version: 3, sources: ['yeti.js'], mappings: 'AAAA;' }, { file: 'yeti.min.js' });
	assert.equal(shifted.file, 'yeti.min.js');
	assert.equal(shifted.mappings, ';AAAA;');
	assert.deepEqual(shifted.sources, ['yeti.js']);
});
