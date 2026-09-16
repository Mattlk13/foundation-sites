## When to use it

Showing a piece of Yeti markup and letting the reader see how it behaves as its box gets narrower. Documentation, a pattern library, a design-system page. Not for content a reader has to have: the box is a demonstration, and the markup should be on the page as code as well.

## How it works

The preview box is a size container the reader can drag from its bottom corner, with the browser's own handle and no script. Whatever Yeti markup is inside responds exactly as it would anywhere else, because a Yeti component measures its own box; a card becomes a thumbnail row as the box passes `sm`, and a label in the corner names the stop the box is at, `xs` through `2xl`, flipping at the same widths the components change. That is the framework's responsive model, applied to itself.

The box can hold the example two ways. On a page that already loads Yeti, put the markup straight in; on any other page, the docs site among them, put an `iframe` in with the example in its `srcdoc` and a link to `yeti.css` ahead of it, so nothing from the host page leaks into the example. Either way, the box's height is always `data-height`'s, `md` when absent: a frame cannot size to its content, and neither does the box, so a tall example scrolls inside whichever form it's in. `data-width` sets the width the box starts at, using the width vocabulary, so a demo can open at `sm` and lead with the narrow form. That width names the example's own width: the box's edge and, on direct markup, its inset sit outside it, which is why the corner label agrees with the attribute, as long as the container is at least that wide. In a narrower container the box is capped at the container, and the label names the capped width instead. The code goes in a `details` under the box, collapsed.

```html
<figure class="demo" data-width="lg">
	<div data-preview tabindex="0">
		<article class="card">
			<h2>Direct</h2>
			<p>Plain markup on a Yeti page.</p>
		</article>
	</div>
	<details>
		<summary>Code</summary>
		<pre><code>&lt;article class="card"&gt;…&lt;/article&gt;</code></pre>
	</details>
</figure>
```

## Accessibility

Give the frame a `title`. Give a box holding direct markup `tabindex="0"`: markup taller than the box scrolls, and a scrollable region must be reachable from the keyboard. A framed box does not need one, because the iframe fills it exactly and it never scrolls. The handle is the browser's, which means a mouse or a trackpad; a keyboard or touch reader sees the demo at its starting width, which is why the code is there and why a demo must never be the only place the markup lives. The stop label is generated content, a visual aid to the drag, and is not announced. It sits inside the box, so on a tall direct example it scrolls away with the content: an aid to the drag, not a readout.
