import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minifyCss, BASELINE_2025 } from '../../bin/lib/minify-css.js';

// Every construct here is Baseline 2025 or newer and is used in src/. The
// point of the test is that the minified file is the same CSS, smaller.
const modern = `@layer yeti.components {
	@property --_yeti-angle {
		syntax: "<angle>";
		inherits: false;
		initial-value: 0deg;
	}

	.card {
		background: light-dark(#ffffff, #111111);
		color: oklch(62% 0.2 250);
		border-color: color-mix(in oklab, var(--yeti-color-border), transparent 40%);
		anchor-name: --card;
		anchor-scope: --card;
	}

	@starting-style {
		.card { opacity: 0; }
	}

	@container (inline-size < 32rem) {
		.card { display: block; }
	}
}
`;

test('minifyCss makes the stylesheet smaller', () => {
	const { css } = minifyCss({ css: modern });
	assert.ok(css.length < modern.length, `${css.length} is not smaller than ${modern.length}`);
	assert.ok(!css.includes('\t'));
});

test('minifyCss leaves Baseline 2025 syntax exactly as it was written', () => {
	const { css } = minifyCss({ css: modern });
	for (const kept of ['light-dark(', '@starting-style', '@layer', '@property', '@container', 'inline-size', 'oklch(', 'color-mix(', 'anchor-name']) {
		assert.ok(css.includes(kept), `the minifier dropped or rewrote ${kept}`);
	}
	// The three rewrites that would hurt most: a light-dark() turned into
	// custom-property trickery, a range container query turned into max-width,
	// and an oklch() given a hex fallback ahead of it.
	assert.ok(!css.includes('--lightningcss'));
	assert.ok(!css.includes('max-width'));
	assert.ok(!/#[0-9a-f]{3,6}[;}]\s*color:\s*oklch/.test(css));
});

test('minifyCss reports a parse error instead of dropping the rule', () => {
	assert.throws(() => minifyCss({ css: '.a { color: red;; @@ }' }));
});

test('the targets are the last browsers of 2025, one semver byte each', () => {
	assert.equal(BASELINE_2025.chrome, 143 << 16);
	assert.equal(BASELINE_2025.safari, (26 << 16) | (2 << 8));
});

// Yeti's fluid scale (docs/guides/theming.md's scale section) uses
// tan(atan2()) as a division trick and cqi container-query units; both are
// Baseline 2025 and neither has a lightningcss lowering, but a future
// lightningcss release adding one would be exactly the surprise this guards
// against.
test('minifyCss leaves tan(atan2()) and container query units alone', () => {
	const css = `@layer yeti.base {\n\t:root {\n\t\t--_yeti-t: clamp(0, tan(atan2(100vw - 20rem, 80rem - 20rem)), 1);\n\t}\n}\n@layer yeti.utilities {\n\t.sample {\n\t\tfont-size: clamp(1rem, 2cqi, 2rem);\n\t}\n}\n`;
	const { css: out } = minifyCss({ css });
	assert.ok(out.includes('atan2('), 'the minifier dropped or rewrote atan2(');
	assert.ok(out.includes('cqi'), 'the minifier dropped or rewrote cqi');
});
