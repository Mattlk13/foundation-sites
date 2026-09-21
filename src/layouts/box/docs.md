## When to use it

A box is the thing to reach for when content needs breathing room from its edges: a card body, a callout, a panel in a sidebar. Combine it with a stack inside for the spacing between its children, and with `data-surface` or `data-border` to make it something you can see.

## How it works

`padding` on all four sides from `data-gap`, a border of `--yeti-border-width` in `--yeti-color-border` when `data-border` is present, and a fill from `data-surface`. Nothing else. Unlike the spacing layouts, a box does not reset its children's margins, so paragraphs inside it keep their prose rhythm.

`data-surface` takes the three surface tones. `raised` is a step above the page and is what a panel usually wants; `sunken` is a step below, for a well that content sits in; `base` is the page's own surface, for a panel inside a sunken area that should not change tone. Without it a box is transparent and only its padding does anything, which is right when the thing behind it is already a surface.

There is no corner radius, on purpose. A box is square. A rounded panel that lifts off the page is a `card`, and the two should not blur into each other.

```html
<div class="box" data-surface="raised" data-border>
	<div class="stack" data-gap="sm">
		<h3>Title</h3>
		<p>Body</p>
	</div>
</div>
```

## Why this name

There is no plainer word for a padded rectangle. Foundation 6's Callout was a styled box with a colour scheme; the plain one had no name.
