## When to use it

A long page a reader scrolls rather than clicks through: a guide, a reference, a post with sections. The list says what is on the page and how far through it the reader is. A page with three short sections does not need one, and neither does a page whose headings would not fit down one side.

## How it works

A column of links, each pointing at the id of a heading on the same page. The current one carries `aria-current="true"` and takes the variant's color, a strong weight, and a bar down its start edge; the bar is on every link and transparent until then, so nothing shifts as the mark moves. `data-variant` picks the hue and `data-size` steps the text. A link under the pointer takes `--yeti-toc-hover`, read with a fallback to the variant's own subtle tint, so setting it to transparent turns the fill off without touching the variant.

`toc.js` moves the mark. It watches the linked headings with one `IntersectionObserver` and marks the link of whichever heading is topmost in view, dispatching `yeti:current` on the `.toc` with the link and the heading each time it moves. Between two headings nothing is in view, and the last mark stays rather than flickering off. Without the module the list is a working list of links, and a page that knows its own current section can simply ship the attribute in its HTML.

Following a link scrolls smoothly, from `--yeti-toc-scroll` applied to the page — the token collapses to `auto` under `prefers-reduced-motion`, which a plain `scroll-behavior` in this layer could not, since it would outrank the reset's own rule.

```html
<nav class="toc" aria-label="On this page" data-variant="secondary" data-size="sm">
	<ul role="list">
		<li><a href="#install">Install</a></li>
		<li><a href="#usage">Usage</a></li>
	</ul>
</nav>
```

## Accessibility

Label the `nav` — `aria-label="On this page"` — because a page with a toc has at least two navs and they have to be told apart. Put `role="list"` on the `ul`, which is what keeps it a list where the reset removes the markers. The current section's link carries `aria-current="true"`; the color and the bar are the visible half of the same fact, never the only half. The module owns that attribute on these links: it sets and clears `aria-current="true"` and strips any other `aria-current` value an author puts on a toc link. The links are ordinary same-page links, so the keyboard reaches them in order and Enter follows one with no script at all.
