// Demo frames. A framed demo carries its example twice, once escaped into the
// iframe's srcdoc and once as code under the box, and an author writing one
// by hand has to keep the two in step. The docs generator does that for the
// site; this module does it for everyone else: the author writes the code
// once, in the pre, and the frame is built from it. Without the module the
// code still shows and the box stays empty, so nothing depends on it.
//
// The framed document is a whole Yeti page: the host page's own Yeti
// stylesheet, found by its file name, unless the figure names another with
// data-stylesheet, and yeti.js from the folder beside it, so an example that
// needs a module has it. A host page in someone else's colors points at a
// plain yeti.css that way; host yeti.js next to it.
// Safe on pages with no demo, and demos added later are filled as they land.
// The resize logic, kept apart from the page so a Node test can call it.
// Widths are CSS pixels of the box's content box, the size the width tokens
// and the stop label measure.

// A drag moves the box's end edge with the pointer: rightward in a
// left-to-right page, leftward in a right-to-left one, never past the box's
// own min and max.
function widthFromDrag(startPx, dx, rtl, minPx, maxPx) {
	return Math.min(maxPx, Math.max(minPx, startPx + (rtl ? -dx : dx)));
}

// A key steps to the next stop strictly beyond the current width, up
// (direction 1) or down (-1); past the last stop that fits, the box goes to
// its max or min. A width a hair off a stop counts as on it.
function stepWidth(currentPx, direction, stopsPx, minPx, maxPx) {
	const beyond = direction > 0
		? stopsPx.filter((stop) => stop > currentPx + 0.5)
		: stopsPx.filter((stop) => stop < currentPx - 0.5);
	const next = beyond.length ? (direction > 0 ? Math.min(...beyond) : Math.max(...beyond)) : (direction > 0 ? maxPx : minPx);
	return Math.min(maxPx, Math.max(minPx, next));
}

// The stop a width is at, named exactly as the bar's label names it: the
// largest stop at or below the width, and xs for anything below sm.
function stopName(px, stops) {
	const floor = stops.find((stop) => stop.name === 'sm')?.px ?? 0;
	let name = 'xs';
	for (const stop of stops) if (stop.px >= floor && px >= stop.px) name = stop.name;
	return name;
}

const stylesheetFor = (figure) => figure.dataset.stylesheet
	|| document.querySelector('link[rel="stylesheet"][href$="yeti.css"]')?.href
	|| '';

function fill(figure) {
	const box = figure.querySelector(':scope > [data-preview]');
	const code = figure.querySelector(':scope > details > pre > code, :scope > details > pre');
	if (!box || !code) return;
	let frame = box.querySelector(':scope > iframe');
	// An empty box asks for its frame to be made; the marker's value names it.
	if (!frame && box.childElementCount === 0) {
		frame = document.createElement('iframe');
		frame.title = `${box.dataset.preview || 'Example'}, live`;
		box.append(frame);
	}
	// A frame the author already filled, or a box holding direct markup, is left alone.
	if (!frame || frame.hasAttribute('srcdoc')) return;
	const href = stylesheetFor(figure);
	if (!href) return;
	// Relative paths in the example resolve beside the stylesheet, as the
	// generator arranges, so a picture the docs host is found from any page.
	// The stylesheet may itself be a relative path, so it is resolved first.
	const base = new URL('.', new URL(href, document.baseURI)).href;
	frame.srcdoc = `<base href="${base}"><link rel="stylesheet" href="${href}"><script type="module" src="${base}yeti.js"></script><body style="margin:0;padding:var(--yeti-space-md)">${code.textContent.trim()}`;
}

const fillAll = (root) => root.querySelectorAll?.('.demo').forEach(fill);
fillAll(document);
new MutationObserver((records) => {
	for (const record of records) for (const node of record.addedNodes) {
		if (node.nodeType !== Node.ELEMENT_NODE) continue;
		if (node.matches('.demo')) fill(node);
		fillAll(node);
	}
}).observe(document.body, { childList: true, subtree: true });
