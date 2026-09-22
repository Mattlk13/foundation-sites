---
raw: true
title: "Migrating from Foundation 6"
description: "Every Foundation 6 grid class and component, and its Yeti equivalent or the reason there is none; then the five habits to unlearn."
nav_group: "Guides"
nav_order: 7
---

# Migrating from Foundation 6

<p class="lede">Yeti is not Foundation 7 in the sense of being version 6 with new names. It is what Foundation would be if it were written today, for browsers that have container queries, popovers, dialogs, anchor positioning and cascade layers, and if the JavaScript were allowed to be almost nothing. So a port is not a rename. This page gives you the map, then the five habits that change.</p>

## The map

The table covers the grid and every component in the version 6 kitchen sink. "None" means Yeti does not have it and says why; most of those are things the browser now does.

### Grid

| Foundation 6 | Yeti | Notes |
| --- | --- | --- |
| `.grid-container` | `center` with `data-max` | the reading column |
| `.grid-x` with `.cell.medium-N` | `columns` with `data-span` on children | equal shares unless a child says otherwise |
| `.medium-8` beside `.medium-4` | `columns` with `data-span="2"` on the wider child | shares, not twelfths |
| `.grid-x.grid-margin-x` | `columns` with `data-gap` | the gap is a token, not a gutter class |
| `.small-up-3` / `.large-up-4` | `grid` with `data-columns` | as many columns as fit; `data-fold` for a fixed count above a width |
| `.grid-y` | `stack` | vertical rhythm, no grid needed |
| `.grid-frame` / `.cell-block` | `cover` and `scroller` | full-height frame; a region that scrolls |
| `.float-left` / `.float-right` | none | floats are for text wrapping; a layout is a `sidebar` or a `cluster` |
| `.show-for-medium` / `.hide-for-small` | none | a component changes shape at its own threshold instead of being duplicated and hidden |
| `.text-center` and friends | `data-align` and `data-justify` on the layout | alignment is a layout's attribute, not a text utility |

### Components

| Foundation 6 | Yeti | Notes |
| --- | --- | --- |
| `.button`, `.button.primary`, `.hollow`, `.clear` | `button` with `data-variant` and `data-emphasis` | emphasis replaces hollow and clear |
| `.button-group` | `buttons` | a named group of buttons |
| `.callout` | `alert` for a message, `box` with `data-border` for a plain panel | the callout did two jobs |
| `.card` | `card` | the figure bleeds on its own; `data-stretch` for a whole-card link |
| `.label` and `.badge` | `badge` | one component, sized by `data-size` |
| `.table`, `.hover`, `.stack` | `table` with `data-hover`, `data-striped`; a `scroller` for width | the stacking table is gone, a table stays a table |
| `.top-bar` | `nav` | collapses behind a toggle at its own threshold |
| `.title-bar` with `.off-canvas` | `nav` with `data-panel="drawer"` | the drawer is the nav's own panel |
| `.menu`, `.menu.vertical` | a `cluster` or `stack` of links; `nav` for a site menu | a menu is a list of links |
| `.dropdown-pane` | `dropdown` | a popover, so no script and no z-index |
| `.dropdown.menu` submenus | `dropdown` inside a `nav` item | one level; a mega menu is not shipped |
| `.accordion-menu`, `.drilldown` | none | a site tree is a list of links in a `stack`; the browser's `<details>` disclosure for a section |
| `.reveal` | `dialog`, opened by a `button` with `commandfor` | the native dialog opens itself; the module closes it from the backdrop |
| `.tooltip` | `tooltip` | hover and focus, no script |
| `.accordion` | `accordion` | native `<details>`; `name` for one-at-a-time |
| `.tabs` | `tabs` | roving focus from the module |
| `.orbit` | `carousel` | scroll snap; dots that are links |
| `.progress`, `.progress-meter` | `progress` on the native `<progress>` | indeterminate when no value |
| `.slider` | `field` around a native input type="range" | the native control, filled track from `--yeti-range-value` |
| `.switch` | `field` around a native checkbox with role="switch" | native, styled |
| `.breadcrumbs` | `breadcrumbs` | with `aria-current` on the last |
| `.pagination` | `pagination` | with `aria-current` on the current page |
| `.close-button` | `data-close`, inside `alert` or inside `nav` | a close button belongs to what it closes |
| `.sticky` | `data-sticky` | a marker on a child of `sidebar`, `shell` or `stack`, or on `nav`; the stop is a token |
| `.magellan` | none | a table of contents is a `stack` of links; scroll spying is script the page can add if it must |
| `.responsive-embed` / `.flex-video` | `frame` with `data-ratio` | native `aspect-ratio` |
| `.thumbnail` | `frame` in a `box` with `data-border` | two primitives |
| `.media-object` | `media` | the recipe, or `sidebar` and `frame` yourself |
| `.input-group` | `affix` inside `field` | the joined control and button share a border; the field still owns the label |
| `.help-text`, `.form-error` | `data-hint` and `data-error` inside `field` | tied to the input with `aria-describedby` |
| `.is-invalid-input` | `aria-invalid="true"` on the input | state is ARIA, not a class |
| Abide | none | native validation attributes; the field shows the browser's state |
| Equalizer | none | `columns` and `grid` align heights on their own |
| Interchange | none | `<picture>` and `srcset` |
| Toggler | none | `popover`, `<details>`, and `aria-expanded` cover every case it had |
| Motion UI | none | components transition on the motion tokens; reduced motion is honoured through them |

## The five habits

**Attributes, not modifier classes.** `.button.primary.large.hollow` becomes `class="button" data-variant="primary" data-size="lg" data-emphasis="medium"`. Each attribute has a fixed list of values, and a value outside the list is a validator error. Your own classes never collide with Yeti's, because Yeti only ever has one.

**Native state, not `is-` classes.** There is no `.is-active`, `.is-open`, `.is-invalid-input`. An open accordion has the `open` attribute, the current page has `aria-current="page"`, an invalid field has `aria-invalid="true"`, a selected tab has `aria-selected="true"`. Screen readers read those; they never read a class.

**A threshold, not a breakpoint.** There are no `small-`, `medium-`, `large-` prefixes and no visibility classes. A component changes shape at its own width, chosen from six stops with `data-threshold` or `data-max`. The [responsive guide](responsive.md) is the whole story.

**Nothing to initialise.** There is no `Foundation.init()`, no `data-` attributes for plugins, no jQuery. Six components have an optional module; you load it with one script tag, anywhere, and it finds its own elements. Without the module the component still works, minus what the module adds.

**The browser does the opening and closing.** Dropdowns and the nav's menu are popovers; the dialog is a dialog; the accordion is `<details>`. Escape, light dismiss, the focus trap and the expanded state come from the platform. If you find yourself writing script to open something, look for the attribute that already does.
