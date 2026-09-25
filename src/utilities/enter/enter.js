// Enter: data-once, the play-once mode. On its own an .enter's arrival plays
// once already, on load; data-once pushes that same arrival out to the first
// time the element scrolls into view, so a card far down the page does not
// finish arriving before the reader ever sees it move. Without this module
// data-once does nothing, and the manifest is honest about the fallback: the
// element simply arrives on load, exactly like any other .enter.
//
// This module never starts, stops or picks an animation. enter.css always
// starts one running the instant the page paints, backwards-filled, and all
// this does is pause a not-yet-seen one and later let it run to the end it
// was already headed for.
//
// It listens for each arrival's own 'animationstart' rather than polling for
// the moment a browser has built the CSSAnimation object: the event is the
// browser's own guarantee that the object now exists, on whichever element
// is actually arriving. data-stagger moves the animation down to the
// children, and the event bubbles, so one listener on the document catches
// a lone element and every one of a stagger's children alike; closest()
// finds the .enter[data-once] each belongs to.
//
// prefers-reduced-motion needs no branch of its own here: an unseen element
// still waits, paused, at its start until it is first seen, reduced motion
// or not; enter.css has already collapsed the animation's duration to
// nothing under that preference, so the moment this module plays it back,
// it simply arrives at once rather than visibly animating. Collapsed means
// the arrival itself is instant once it happens, not that it happens sooner.

// --- Pure decisions ---------------------------------------------------------
// No DOM here at all: these are the small decisions the module makes, kept
// as plain top-level functions so test/tools/enter.test.js can call them
// straight, in milliseconds, for every case below instead of driving a
// browser to prove them.

/**
 * Whether an arrival should be paused right now.
 * - timelineIsDocument: false for a scroll-driven (view()) animation, which
 *   data-view already owns entirely; data-once never touches it — a plain
 *   time value assigned to a progress-based animation throws in Chromium
 *   and WebKit.
 * - released: true once the element has already been seen and let go for
 *   good; a released element is never paused again.
 * - alreadyPaused: true if this exact animation has already been paused
 *   once. Pausing it a second time would only rewind a delayed child's
 *   currentTime again for nothing.
 * - inView: true if the element already overlaps the viewport, in which
 *   case an arrival is left alone entirely, never paused and immediately
 *   resumed.
 */
function shouldPause({ timelineIsDocument, released, alreadyPaused, inView }) {
	if (!timelineIsDocument) return false;
	if (released) return false;
	if (alreadyPaused) return false;
	if (inView) return false;
	return true;
}

/**
 * Any part of rect overlaps the viewport's visible vertical band, whatever
 * the element's own height. A straight overlap test, not a ratio of the
 * target's own area, is what lets a partial overlap — the top of a long
 * element already scrolled past its own top edge — still count as in view.
 */
function isInView(rect, viewportHeight) {
	return rect.bottom > 0 && rect.top < viewportHeight;
}

// --- DOM wiring --------------------------------------------------------------

const released = new WeakSet();
const once = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (!entry.isIntersecting) continue;
		for (const animation of entry.target.getAnimations({ subtree: true })) animation.play();
		// Released, not just unobserved: pinning currentTime back to 0 below
		// can put a delayed child before its own delay again, so playing it
		// here can still end with one more 'animationstart' arriving later,
		// on its own, once that delay runs out a second time. unobserve()
		// alone stops this callback firing again; it does nothing about that
		// later event reaching the listener below and pausing a child no
		// longer being watched. released does: the decision above leaves a
		// released element alone for good, seen once or not.
		released.add(entry.target);
		once.unobserve(entry.target);
	}
	// rootMargin's bottom edge pulled 15% of the viewport inward makes
	// isIntersecting turn true exactly when the element has come 15% of the
	// viewport up from the bottom, whatever its own height — a one-line
	// paragraph or an 800vh exhibit alike. An intersectionRatio, being of
	// the target's own area, could never clear 0.15 for anything taller
	// than the viewport itself.
}, { rootMargin: '0px 0px -15% 0px', threshold: 0 });

const watching = new WeakSet();
// Paused once each: see shouldPause's alreadyPaused.
const paused = new WeakSet();

/** Applies the pause decision to one animation on one .enter[data-once] element. */
function maybePause(el, animation) {
	const rect = el.getBoundingClientRect();
	const pause = shouldPause({
		timelineIsDocument: animation.timeline === document.timeline,
		released: released.has(el),
		alreadyPaused: paused.has(animation),
		inView: isInView(rect, window.innerHeight),
	});
	if (!pause) return;
	paused.add(animation);
	animation.pause();
	// Pinned back to the very start: 'animationstart' can fire a few
	// milliseconds into the active phase, and left there the element would
	// sit at a hair above 0 opacity rather than fully transparent, which is
	// no different to the eye but is a real, if tiny, contrast value an
	// automated audit can still catch.
	animation.currentTime = 0;
	if (watching.has(el)) return;
	watching.add(el);
	once.observe(el);
}

document.addEventListener('animationstart', (event) => {
	const el = event.target.closest('.enter[data-once]');
	if (!el) return;
	maybePause(el, event.animation);
});
