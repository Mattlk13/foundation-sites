import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { minifyJs } from '../../bin/lib/minify-js.js';

test('line and block comments and blank lines go, code stays', () => {
	const source = '// why this exists\nconst a = 1;\n\n/* a block\n   over two lines */\nconst b = 2; // trailing\n';
	assert.equal(minifyJs(source), 'const a = 1;\nconst b = 2;\n');
});

test('a comment marker inside a string is not a comment', () => {
	const source = 'const url = "https://foundationcss.com/yeti/"; // the home page\nconst q = \'a // b\';\n';
	assert.equal(minifyJs(source), 'const url = "https://foundationcss.com/yeti/";\nconst q = \'a // b\';\n');
});

test('a template literal keeps its expressions, its nested strings and its slashes', () => {
	const source = 'const s = `${box.dataset.preview || \'Example\'}: //${a / b}`; // note\n';
	assert.equal(minifyJs(source), 'const s = `${box.dataset.preview || \'Example\'}: //${a / b}`;\n');
});

test('a nested template inside an expression is read as a template', () => {
	const source = 'const s = `a${`b${c}`}d`; /* gone */\n';
	assert.equal(minifyJs(source), 'const s = `a${`b${c}`}d`;\n');
});

test('a regex literal keeps its slashes and its comment markers', () => {
	const source = 'const re = /a\\/\\/b/g; // strips nothing\nconst m = "x".match(/[/*]/);\n';
	assert.equal(minifyJs(source), 'const re = /a\\/\\/b/g;\nconst m = "x".match(/[/*]/);\n');
});

test('division is not mistaken for a regex', () => {
	const source = 'const half = total / 2; // half\nconst other = (a + b) / c;\n';
	assert.equal(minifyJs(source), 'const half = total / 2;\nconst other = (a + b) / c;\n');
});

test('a regex after return is a regex', () => {
	assert.equal(minifyJs('function f() { return /a/.test(b); } // x\n'), 'function f() { return /a/.test(b); }\n');
});

test('an unterminated string stops the build instead of eating the file', () => {
	assert.throws(() => minifyJs('const a = "open;\nconst b = 2;\n'), /unterminated string/);
});

test('an unterminated block comment stops the build', () => {
	assert.throws(() => minifyJs('/* open\nconst b = 2;\n'), /unterminated block comment/);
});

test('the output of a real-shaped module still parses', () => {
	const source = [
		'// Closes the alert when its close button is clicked.',
		'document.addEventListener("click", (event) => {',
		'\tconst button = event.target.closest("[data-close]");',
		'\tif (!button) return; // nothing of ours',
		'\tbutton.closest(".alert")?.remove();',
		'});',
		'',
	].join('\n');
	const out = minifyJs(source);
	assert.ok(!out.includes('//'));
	assert.doesNotThrow(() => new vm.Script(out));
});
