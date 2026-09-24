## When to use it

Use a cluster for a row of things that are sized by their content and may need to wrap: tags, buttons, navigation links, a logo beside a menu. When it wraps, the gap holds between rows as well as between items, so nothing needs a margin.

## How it works

A cluster is a wrapping flex row with a `gap`. `data-justify` distributes the items along the row, so `between` pushes the first and last to the edges, and `data-align` lines them up vertically within a row. Items keep their own width; a cluster never stretches them.

```html
<ul class="cluster" data-gap="xs" role="list">
	<li>css</li>
	<li>layout</li>
	<li>intrinsic</li>
</ul>
```

A term and its value on one line, parted to the two ends, is a cluster with `data-justify="between"`. A `div` may wrap a `dt` and its `dd`, so a whole legend is a `dl` that is a `stack` whose rows are clusters; add `data-rule` to the stack for a line between them and `data-numeric` to the values so the digits line up.

```html
<dl class="stack" data-gap="xs">
	<div class="cluster" data-justify="between"><dt>Distance</dt><dd data-numeric>14.2 km</dd></div>
	<div class="cluster" data-justify="between"><dt>Ascent</dt><dd data-numeric>1,120 m</dd></div>
	<div class="cluster" data-justify="between"><dt>Time</dt><dd data-numeric>5 h 30</dd></div>
</dl>
```

## Why this name

The word is exact: items gather, they do not line up in columns. Foundation 6 reached for `.button-group` or a menu for the same job.
