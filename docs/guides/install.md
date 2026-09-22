---
raw: true
title: "Installing Yeti"
description: "Getting the files, loading the stylesheet and a module, and switching on editor completion."
nav_group: "Guides"
nav_order: 1
---

# Installing Yeti

<p class="lede">Yeti is one stylesheet. Everything else here is optional and most pages need none of it.</p>

The examples on these pages are live: each is a `demo`, a box you can drag from its bottom corner to watch the component change shape, with the code beneath it. The label in the corner names the width stop the box is at.

## Getting the files

Yeti is not released yet. There is no package on npm and nothing to download, so there is nothing to install today. This section will describe npm, the zip on the GitHub release page and a CDN path once there is a release to describe.

Everything below is written the way it will work then. The package will ship `dist/`: the bundled `yeti.css`, the same source tree unbundled under `css/`, the six modules under `js/` and all of them in one `yeti.js`, the two example themes under `themes/`, and the machine-readable files described further down.

To try Yeti before the release, clone the repository and run `npm run build`. That writes the same `dist/` the package will ship, so read `dist/` wherever a path below says `node_modules/yeti-css/dist/`.

## The stylesheet

One link, before your own styles:

```html
<link rel="stylesheet" href="node_modules/yeti-css/dist/yeti.css">
```

Yeti's rules live in cascade layers, so anything you write outside a layer wins over them without a specificity fight. A theme is a second stylesheet of token values that loads after the first:

```html
<link rel="stylesheet" href="node_modules/yeti-css/dist/yeti.css">
<link rel="stylesheet" href="node_modules/yeti-css/dist/themes/soft.css">
```

## Bare HTML

Most of Yeti is opt-in, but the base layer is not: it styles plain HTML the moment the stylesheet loads. Headings take the type scale, running text takes a measure, siblings in flow take the spacing rhythm, form controls and tables come out tidy, definition lists read as pairs, a quotation's caption reads as an attribution, and a `details` opens with a chevron and a panel that grows. A page with no Yeti markup in it at all still reads as a designed page.

One base rule is a convention rather than an element. The first link in the body, if it points at a fragment of the same page, is treated as a skip link: it is out of sight until it is focused, and then it is a box pinned at the top start corner of the window with the focus ring on it.

```html
<body>
	<a href="#content">Skip to content</a>
	<header>…</header>
	<main id="content">…</main>
</body>
```

There is no class to remember, because that is where a skip link goes anyway. The cost runs the other way: if the first link in your body points at a fragment and is not a skip link, it is invisible until someone focuses it. Put anything at all before it — a `header`, a `div`, the site's logo — and it is an ordinary link again.

## A module

Every component works with no script. Six of them do more with one: the alert's close button, the tabs' roving focus, the dialog's opening, a dropdown that opens on hover, the carousel's dots, and a demo's frame built from the code beneath it. Each is a module you load once, anywhere in the page, with nothing to call:

```html
<script type="module" src="node_modules/yeti-css/dist/js/dialog.js"></script>
```

A module finds its own elements and is safe on a page that has none of them. Leave it out and the component is still there, minus what the module adds; the [components guide](components.md) says what that is for each. A page that would rather not pick loads all six at once, about a kilobyte and a half compressed:

```html
<script type="module" src="node_modules/yeti-css/dist/yeti.js"></script>
```

## Editor completion

Yeti configures components through `data-*` attributes with fixed value lists, and the package ships those lists in the two formats editors read, generated from the same manifest the validator uses.

VS Code, Cursor and Windsurf read a custom-data file. One setting, in `.vscode/settings.json`:

```json
{ "html.customData": ["./node_modules/yeti-css/dist/yeti.html-data.json"] }
```

PhpStorm and WebStorm read web-types and find the file through `package.json` on their own. Install the package and the completions are there.

One limit is worth knowing. Neither format can tie a completion to a class, and a Yeti component's identity is its class, so every attribute is offered on every element: typing inside a `p` will offer `data-rows`. Each description opens with the components that accept the attribute, so the list explains itself, and a wrong value is still a validator error rather than a silent nothing.

For a TypeScript project the package ships types for the two JSON files and the vocabularies they are built from:

```ts
import manifest from 'yeti-css/manifest';
import type { YetiGap, YetiManifest } from 'yeti-css';
```

Both resolve with no configuration beyond the default in a modern project. They exist for tools built on those files; a page needs nothing from them.

## For a language model

`llms.txt` and `llms-full.txt` sit at the root of the docs site and in the package. The first lists every component with its class, attributes, legal values and defaults in a few hundred lines; the second adds each component's guidance, accessibility notes and the token catalogue. They are generated from the manifest, so they describe exactly the surface the validator enforces, and nothing else. Point an assistant at the first and it can write valid Yeti; give it the second and it can explain why.
