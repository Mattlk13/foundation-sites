---
raw: true
title: "What is stable"
description: "What 7.0.0-beta means: the names that will not change before 7.0.0, and the things that still may."
nav_group: "Guides"
nav_order: 7
---

# What is stable

From `7.0.0-beta.0`, the surface a page depends on is frozen. This page is the list. Anything on it that changes between beta and `7.0.0` is a bug, and you should report it as one.

## Frozen

- **Component class names.** `card` is `card`. The forty-one names in the manifest.
- **Attribute names and their value lists.** `data-gap` takes the values it takes today; a value may be added, none will be removed or renamed.
- **Vocabularies.** The named value lists attributes draw from, `gap`, `width`, `height` and the rest; a value may be added, none removed.
- **Marker names and values.** `data-span` on a column, `data-numeric` on a cell, and the rest.
- **Public token names.** Every `--yeti-*` in the catalogue. Their default values may still be tuned; their names and meanings will not change.
- **Module file names.** `alert.js`, `tabs.js`, `dialog.js`, `hover.js`, `carousel.js`, and that each is optional.
- **The manifest and token catalogue schemas**, and the package `exports` map, so tooling built on `yeti-css/manifest` and `yeti-css/tokens` keeps working.

## Not frozen

- Private tokens, the `--_yeti-*` ones. They are implementation.
- The default value of a public token. A theme may already change these; so may we, before `7.0.0`, where a measurement says a default is wrong.
- The internal layout of generated files: the exact text of the docs pages, `llms.txt`, the editor data, the types file. Their content follows the manifest.
- Test fixtures, baselines, and everything under `bin/`.
- Browser support minimums, which track Baseline.

## What a breaking change would look like

Renaming a class, removing an attribute value, changing what a value does, renaming a public token, or making a module required. None of these happens before `7.0.0`. After `7.0.0`, any of them is a major version.

## Screenshots

The screenshot baselines are part of how this is kept. A change to how something looks is re-blessed in the same commit that causes it, with the reason in the message. A re-bless with no visible reason is a review question.
