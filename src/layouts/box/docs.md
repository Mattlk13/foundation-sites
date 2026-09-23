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

## Painting anything

`data-surface` names a role of the page: raised, sunken, or the page itself. `data-paint` names a colour, and any element can carry it, not only a box: a section, a heading, a table cell. The value is one of the six hues at its base step, one of three constants, or a step of the greyscale.

```html
<section data-paint="primary">A band in the brand colour, with the text made for it.</section>
<aside class="box" data-paint="grey-20">A quiet panel, a little off the page.</aside>
<figcaption data-paint="black" data-text="white">A caption band that is black on every page.</figcaption>
```

A painted hue takes the text its base colour was made for, the same pair a button uses. A painted grey takes the page text up to `grey-40` and the page surface from `grey-50`, because half-way toward the text is where the text stops reading. `data-text` sets the words alone, from the same list, and on an element that is also painted it wins over that automatic colour.

The greyscale is scheme-aware. `grey-0` is the page surface and `grey-100` is the page text, each step ten percent further from the one toward the other, so `grey-20` is near the page in light mode and in dark mode, and a theme that sets its own surface and text gets its own greys. A grey names a distance, not a colour. `white`, `black` and `grey` (18% reflectance, the photographic middle) are the only three colours in Yeti that never move; reach for them when a thing must be that colour on every page, and for the scale otherwise.

Every step is a token, `--yeti-grey-20`, and every hue has the same eleven steps, `--yeti-color-primary-20`, for your own classes; the [theming guide](guides/theming.md) says how they derive.

## Why this name

There is no plainer word for a padded rectangle. Foundation 6's Callout was a styled box with a colour scheme; the plain one had no name.
