// Tabs: pairs every tab with the panel its aria-controls names, shows one of
// them, and moves selection with the arrow keys. Without this module the CSS
// hides nothing, so every panel is readable; loading it is an enhancement.
// Tabs added after load are not picked up.
const tabsOf = (root) => [...root.querySelectorAll('[role="tab"]')];

function select(root, tab) {
	for (const other of tabsOf(root)) {
		const on = other === tab;
		other.setAttribute('aria-selected', String(on));
		other.tabIndex = on ? 0 : -1;
		const panel = document.getElementById(other.getAttribute('aria-controls'));
		if (panel) panel.hidden = !on;
		// A panel with nothing focusable inside it must take focus itself, or
		// Tab leaves the tab list and skips straight past the content.
		if (panel) panel.tabIndex = panel.querySelector('a, button, input, select, textarea, [tabindex]') ? -1 : 0;
	}
}

// Selecting is what both handlers do, and only a selection a reader made is
// an event: the pass at load is not a change, it is the markup being obeyed.
function choose(root, tab) {
	select(root, tab);
	tab.focus();
	root.dispatchEvent(new CustomEvent('yeti:select', {
		bubbles: true,
		composed: true,
		detail: { tab, panel: document.getElementById(tab.getAttribute('aria-controls')) },
	}));
}

for (const root of document.querySelectorAll('.tabs')) {
	const tabs = tabsOf(root);
	if (tabs.length) select(root, tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0]);
}

// A link elsewhere on the page, or the URL itself, can point at something
// inside a hidden panel. Opening that panel's tab is what makes the target
// reachable at all; a reader who did not touch the tabs did not ask to be
// moved, so this selects and reveals without taking focus the way choose()
// does for an actual tab activation. `instant` is true only for the pass at
// load: the page has not been seen yet, so landing on the target should be
// immediate, not a glide the reader watches happen to a page they have not
// looked at; a later hashchange, from a link they just clicked, keeps the
// page's own scroll behavior.
function reveal(instant) {
	const hash = location.hash;
	if (!hash) return;
	let id;
	try {
		id = decodeURIComponent(hash.slice(1));
	} catch {
		return;
	}
	if (!id) return;
	const target = document.getElementById(id);
	if (!target) return;
	const panel = target.closest('[role="tabpanel"]');
	if (!panel) return;
	const root = panel.closest('.tabs');
	if (!root) return;
	const tab = root.querySelector(`[role="tab"][aria-controls="${CSS.escape(panel.id)}"]`);
	if (!tab || tab.getAttribute('aria-selected') === 'true') return;
	select(root, tab);
	root.dispatchEvent(new CustomEvent('yeti:select', {
		bubbles: true,
		composed: true,
		detail: { tab, panel: document.getElementById(tab.getAttribute('aria-controls')) },
	}));
	target.scrollIntoView(instant ? { behavior: 'instant' } : undefined);
}

reveal(true);
window.addEventListener('hashchange', () => reveal(false));

document.addEventListener('click', (event) => {
	// The page's own listener ran first and asked for nothing to happen.
	if (event.defaultPrevented) return;
	const tab = event.target?.closest?.('.tabs [role="tab"]');
	if (!tab) return;
	choose(tab.closest('.tabs'), tab);
});

document.addEventListener('keydown', (event) => {
	// The page's own listener ran first and asked for nothing to happen.
	if (event.defaultPrevented) return;
	const tab = event.target?.closest?.('.tabs [role="tab"]');
	if (!tab) return;
	const root = tab.closest('.tabs');
	const tabs = tabsOf(root);
	const vertical = root.getAttribute('data-orientation') === 'vertical';
	const step = { [vertical ? 'ArrowDown' : 'ArrowRight']: 1, [vertical ? 'ArrowUp' : 'ArrowLeft']: -1 }[event.key];
	let target;
	if (step) target = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
	else if (event.key === 'Home') target = tabs[0];
	else if (event.key === 'End') target = tabs[tabs.length - 1];
	if (!target) return;
	event.preventDefault();
	choose(root, target);
});
