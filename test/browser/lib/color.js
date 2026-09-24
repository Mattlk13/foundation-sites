// Node side: WCAG 2 contrast from sRGB triples. Page side: a helper that
// paints any CSS color onto a canvas so the engine does the color-space
// conversion and gamut mapping, and returns the sRGB quadruple (alpha
// included, since a transparent fill is itself a colour the engine can
// resolve, in whatever syntax the author wrote it in).

function channel(c) {
	c /= 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]) {
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Inject with page.addInitScript or page.evaluate before use. */
export const PAGE_HELPERS = `
window.__yeti = {
	rgb(color) {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		const d = ctx.getImageData(0, 0, 1, 1).data;
		return [d[0], d[1], d[2], d[3]];
	},
	bg(selector) { return this.rgb(getComputedStyle(document.querySelector(selector)).backgroundColor); },
	fg(selector) { return this.rgb(getComputedStyle(document.querySelector(selector)).color); },
	// Walks from a node upward collecting every painted background, stopping
	// once an opaque one is found (or the tree runs out), then composites
	// them with the standard "over" operator, page-white as the base, so a
	// translucent wash (black/white's quiet emphases, tinting whatever
	// surface they sit on) reads as blended with what is beneath it instead
	// of as a color in its own right.
	background(node) {
		const layers = [];
		while (node) {
			const c = this.rgb(getComputedStyle(node).backgroundColor);
			if (c[3] !== 0) {
				layers.push(c);
				if (c[3] === 255) break;
			}
			node = node.parentElement;
		}
		let [r, g, b] = [255, 255, 255];
		for (let i = layers.length - 1; i >= 0; i -= 1) {
			const [lr, lg, lb, la] = layers[i];
			const a = la / 255;
			r = lr * a + r * (1 - a);
			g = lg * a + g * (1 - a);
			b = lb * a + b * (1 - a);
		}
		return [r, g, b, 255];
	},
};
`;
