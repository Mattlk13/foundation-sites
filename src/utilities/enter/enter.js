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
// getBoundingClientRect() on that .enter[data-once], not the element the
// event fired on, decides whether to pause at all: already on screen at
// load, an arrival is left alone entirely, never paused and immediately
// resumed.
//
// prefers-reduced-motion needs no branch of its own here: enter.css has
// already collapsed the animation's duration to nothing under that
// preference, so pausing it and playing it back later still leaves the
// element settled at once, exactly as an ordinary .enter would.
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
		// longer being watched. released does: the listener checks it first
		// and leaves a released element alone for good, seen once or not.
		released.add(entry.target);
		once.unobserve(entry.target);
	}
}, { threshold: 0.15 }); // a sliver over the edge is not yet something the reader can see

const watching = new WeakSet();
// Paused once each: the same currentTime rewind can, on a delayed child,
// put it back before its own delay and so queue up exactly the later,
// unrequested 'animationstart' the comment above describes. Between that
// and release, pausing the same animation a second time would only rewind
// it again for no reason.
const paused = new WeakSet();
document.addEventListener('animationstart', (event) => {
	// data-view wins where a scroll timeline exists: that animation is
	// already scroll-linked, entirely CSS's own doing, and pausing it here
	// would only get in the way — currentTime below is a plain time value,
	// and assigning one to a progress-based animation throws in Chromium and
	// WebKit, before observe() ever runs, stranding it paused partway.
	// data-once still covers the fallback: where view() is unsupported, or
	// the reader has asked for less motion, the animation never leaves the
	// document timeline and everything below applies as normal.
	if (event.animation.timeline !== document.timeline) return;
	const el = event.target.closest('.enter[data-once]');
	if (!el) return;
	if (released.has(el) || paused.has(event.animation)) return;
	const r = el.getBoundingClientRect();
	const inView = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
	if (inView) return;
	paused.add(event.animation);
	event.animation.pause();
	// Pinned back to the very start: 'animationstart' can fire a few
	// milliseconds into the active phase, and left there the element would
	// sit at a hair above 0 opacity rather than fully transparent, which is
	// no different to the eye but is a real, if tiny, contrast value an
	// automated audit can still catch.
	event.animation.currentTime = 0;
	if (watching.has(el)) return;
	watching.add(el);
	once.observe(el);
});
