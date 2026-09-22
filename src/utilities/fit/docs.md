## When to use it

One line that should grow with the box around it: a hero's headline, a figure's number, a pull quote, the title on a card that is sometimes a column and sometimes a page. Not body copy — prose has a measure and a comfortable size, and neither of them is a percentage of a column.

## How it works

`font-size` reads `cqi`, one percent of the container's inline size, so the line is sized by the box it is in rather than by the window. The same heading is one size in a card and another across a page, on the same page, which no viewport unit can say.

`data-fit` is a pair of steps from the type scale, `<min>-<max>`, and the pair is the two ends of a clamp: the line never sets smaller than the first step or larger than the second, whatever the container does. Any smaller of the eight steps can pair with any larger one, which makes twenty-eight pairs, and `md-3xl` is what you get when the attribute is absent.

Between the ends the size is a proportion of the container, and the proportion is not a number in the stylesheet. It is the pair's own maximum divided by `--yeti-fit-width`, the container width at which a fitted line reaches its ceiling, `32rem` by default. So a pair that ends higher grows faster, every pair arrives at its ceiling in the same box, and a theme moves all twenty-eight by moving one token. With the default pair it works out between six and eleven percent of the container, depending where the fluid scale itself is standing.

```html
<div class="container">
	<h1 class="fit" data-fit="lg-display">Build interfaces that read their own container</h1>
</div>
```

The container is the nearest ancestor with `container-type: inline-size`. That is what the [container](container.md) layout is for, and `grid`, `breakout`, `timeline`, `card`, `nav` and `demo` are already size containers themselves. It has to be an ancestor: an element cannot query itself, so putting `fit` and `container` on the same element measures the box outside it. With no container anywhere above, `cqi` falls back to the small viewport, so a fitted line on a bare page grows with the window instead — a lesser effect, not a broken one.

## Accessibility

The clamp is the accessibility story. A size that is only `cqi` has no floor and no ceiling: it shrinks past legibility in a narrow column and runs off the top of a wide screen, and a reader who zooms in gets neither end back. Both ends here are steps of the type scale, which is set in `rem`, so browser zoom and a larger default font size still move the whole line.

Nothing here changes what an element is. A fitted `h1` is an `h1`; the class sizes it and says nothing about its rank.
