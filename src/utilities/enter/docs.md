## When to use it

Once, near the top of a page, on the thing the page is about: a row of product cards, a hero's headline, the three panels a landing page is built from. An arrival is a punctuation mark, and a page that punctuates every sentence is harder to read than one that punctuates none. If everything on the page enters, nothing has entered.

## How it works

One animation, one run, ending exactly where the layout already put the element. Every keyframe list names only a `from`, so the `to` is the element's own computed style: `enter` has no opinion about where anything belongs and cannot move it. The animation fills backwards, which means its first frame applies from the moment the element is painted, so nothing has to be given `opacity: 0` by a rule of its own. That detail is what makes the whole utility safe to fail: an element whose animation never runs is visible, not stranded.

`data-enter` picks the arrival. `fade` is the default and is the quietest. `rise` starts `--yeti-enter-distance` below its place, which is the one to reach for when the element is a card or a panel arriving into a row. `scale` starts at `--yeti-enter-scale` of its size, for something that should feel like it landed rather than slid.

`data-stagger` moves the animation down one level: the element itself no longer animates and each of its children does, every one `--yeti-enter-stagger` behind the one before it. Put it on the layout that holds the row, not on the items.

```html
<ul class="grid enter" data-enter="rise" data-stagger data-min="xs" role="list">
	<li class="card"><h3>One</h3></li>
	<li class="card"><h3>Two</h3></li>
	<li class="card"><h3>Three</h3></li>
</ul>
```

Past the ninth child the delay stops growing and every remaining child shares the ninth's. A stagger that kept counting would turn a list of thirty into a ten-second wait, and the gesture is long over by then.

`data-view` waits for the element to scroll into view instead of playing on load, so an arrival below the fold happens where the reader is rather than before they arrive. It is guarded twice, and both fallbacks land on the same place: the element plays its arrival on load. Once for `@supports`, because `animation-timeline: view()` is not yet Baseline — Chromium and Safari have it, Firefox does not, and that line will move; and once for `prefers-reduced-motion`, because a scroll-driven animation is paced by the scroll and never reads `animation-duration`, so the collapsed token that stills everything else in Yeti would sail straight past this one.

## Accessibility

Nothing here changes reading order, focus order, or what any element is. The only way an element is ever hidden is the animation's own backwards fill, so a browser that cannot run the animation shows the content instead of swallowing it.

Under reduced motion both `--yeti-enter-duration` and `--yeti-enter-stagger` collapse, so every element is simply present at once — the step collapses too, because a stagger with the smooth part removed is still a row of boxes popping into place one after another. The scroll-driven form is switched off outright for the same reader, and they get the collapsed load-timed animation instead.
