---
raw: true
title: "Installing Yeti"
description: "Getting the files, loading the stylesheet and a module, and switching on editor completion."
nav_group: "Guides"
nav_order: 1
---

# Installing Yeti

Yeti is one stylesheet. Everything else here is optional and most pages need none of it.

## Getting the files

From npm:

```bash
npm install yeti-css
```

The package ships `dist/`: the bundled `yeti.css`, the same source tree unbundled under `css/`, the five modules under `js/`, the two example themes under `themes/`, and the machine-readable files described below. A release also carries a zip of the same `dist/` folder on its GitHub release page, for a site with no build step at all. There is no CDN path yet; when there is one it will be listed here.

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

## A module

Every component works with no script. Five of them do more with one: the alert's close button, the tabs' roving focus, the dialog's opening, a dropdown that opens on hover, and the carousel's dots. Each is a module you load once, anywhere in the page, with nothing to call:

```html
<script type="module" src="node_modules/yeti-css/dist/js/dialog.js"></script>
```

A module finds its own elements and is safe on a page that has none of them. Leave it out and the component is still there, minus what the module adds; the [components guide](components.md) says what that is for each.

## Editor completion

Yeti configures components through `data-*` attributes with fixed value lists, and the package ships those lists in the two formats editors read, generated from the same manifest the validator uses.

VS Code, Cursor and Windsurf read a custom-data file. One setting, in `.vscode/settings.json`:

```json
{ "html.customData": ["./node_modules/yeti-css/dist/yeti.html-data.json"] }
```

PhpStorm and WebStorm read web-types and find the file through `package.json` on their own. Install the package and the completions are there.

One limit is worth knowing. Neither format can tie a completion to a class, and a Yeti component's identity is its class, so every attribute is offered on every element: typing inside a `p` will offer `data-ranks`. Each description opens with the components that accept the attribute, so the list explains itself, and a wrong value is still a validator error rather than a silent nothing.

For a TypeScript project the package also ships `yeti.d.ts`, which types `yeti-css/manifest` and `yeti-css/tokens`. It exists for tools built on those files; a page needs nothing from it.

## For a language model

`llms.txt` and `llms-full.txt` sit at the root of the docs site and in the package. The first lists every component with its class, attributes, legal values and defaults in a few hundred lines; the second adds each component's guidance, accessibility notes and the token catalogue. They are generated from the manifest, so they describe exactly the surface the validator enforces, and nothing else. Point an assistant at the first and it can write valid Yeti; give it the second and it can explain why.
