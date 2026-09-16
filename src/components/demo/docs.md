## When to use it

Showing a piece of Yeti markup and letting the reader see how it behaves as its box gets narrower. Documentation, a pattern library, a design-system page. Not for content a reader has to have: the box is a demonstration, and the markup should be on the page as code as well.

## How it works

The preview box is a size container the reader can drag from its bottom corner, with the browser's own handle and no script. Whatever Yeti markup is inside responds exactly as it would anywhere else, because a Yeti component measures its own box; a card becomes a thumbnail row as the box passes `sm`, and a label in the corner names the stop the box is at, `xs` through `2xl`, flipping at the same widths the components change. That is the framework's responsive model, applied to itself.

The box can hold the example two ways. On a page that already loads Yeti, put the markup straight in and the box takes the height of its content. On any other page, the docs site among them, put an `iframe` in with the example in its `srcdoc` and a link to `yeti.css` ahead of it, so nothing from the host page leaks into the example. A frame cannot size to its content without script, so `data-height` sets the box's height from four stops, `md` when absent, and a tall example scrolls inside. `data-width` sets the width the box starts at, using the width vocabulary, so a demo can open at `sm` and lead with the narrow form. The code goes in a `details` under the box, collapsed.

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

Give the frame a `title`. Give the preview box `tabindex="0"`: direct markup taller than the box scrolls, and a scrollable region must be reachable from the keyboard. The handle is the browser's, which means a mouse or a trackpad; a keyboard or touch reader sees the demo at its starting width, which is why the code is there and why a demo must never be the only place the markup lives. The stop label is generated content, a visual aid to the drag, and is not announced.
