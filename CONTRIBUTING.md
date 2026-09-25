# Contributing to Yeti

Thanks for helping. Yeti is small on purpose, so most of this document is about what we do not add.

## Running things

```bash
npm ci                   # install the four dev dependencies
npx playwright install   # once, for the browser tests
npm run validate         # manifests, examples, spacing rule, layer contract
npm run test:tools       # node:test suite for the tooling
npm run test:browser     # Playwright smoke and accessibility checks
npm run build            # writes dist/ (gitignored)
npm run docs             # regenerates docs/ from the manifests and src/guides/
npm test                 # validate, tools, browser
```

Node 24 or later. There is nothing to compile.

### Screenshots

`npm run test:browser` compares every fixture in light and dark against the baselines in `test/browser/screenshots/`, in Chromium only. When you change how something looks on purpose, re-bless in the same commit:

```bash
npm run screenshots:update
```

and say what changed in the commit message. A commit that re-blesses with no visible reason is a review question. Baselines are captured on the machine that runs them and depend on its fonts; on another machine the first run will fail and you re-bless locally before you start. That is expected, not a bug. CI runs on Ubuntu, where every baseline differs by a few pixels of text metrics, so its browser job passes `--ignore-snapshots`: the functional suite runs there, the screenshots are compared only where they were taken. To run everything the way CI does plus the screenshots, `bin/runtests.sh`.

## The rules that shape every change

**The frozen surface stays frozen.** `node bin/frozen.js develop` before merging a branch that touches a manifest, a vocabulary or the token catalogue: additions are fine, a break is a stop. The stability guide is the list it checks.

**No build step, ever.** Nothing a user needs can depend on Node, Sass, or a bundler. The source tree under `src/` must load in a browser as-is; the build concatenates it, writes a minified copy of the result beside it, and does nothing else to it.

**No new dependencies.** The dev dependencies are Playwright, axe, parse5, and lightningcss. lightningcss is the single exception to this rule and was taken deliberately: minifying CSS correctly means parsing it, that is not a job to hand-roll, and it runs only here — it produces `dist/yeti.min.css` and never touches the source a user loads. A pull request that adds another dependency needs an issue first explaining why the job cannot be done without it.

**Manifest first.** Every layout or component lands in one pull request with its `manifest.json`, its CSS, its `example.html`, a browser fixture, and the generated docs page. `npm run validate` must pass. If the manifest and the CSS disagree, the manifest is right and the CSS is wrong.

**Docs are generated.** Nothing under `docs/` is written by hand. A component page comes from its `manifest.json`, `example.html` and `docs.md`; a guide comes from `src/guides/<name>.md`, which is where its prose lives. Run `npm run docs` and commit what it writes — CI regenerates and fails on a diff. In a guide, a fenced block written ```` ```html demo ```` renders as the live demo figure as well as the code, and takes an optional height (`sm md lg xl`), a width (`2xs` … `2xl`) and `both` to let the reader drag the box taller as well as wider: ```` ```html demo md lg both ````. A plain ```` ```html ```` block stays a code block.

**Spacing belongs to layouts.** A component never sets its own outer margin. Layouts own the gaps between their children. The validator enforces this on the identity selector.

**Naming.** Identity is a plain class (`.card`). Configuration is a `data-` attribute with a short shared vocabulary (`data-variant`, `data-size`, `data-gap`). State is native or ARIA (`[open]`, `[aria-current]`), never invented. Boolean attributes are bare. Anything not in the manifest is the user's and is ignored.

**Progressive enhancement, no polyfills.** Baseline 2025 is the floor. Newer features go behind `@supports` with a fallback that works.

**Accessibility is part of the contract.** Every component's manifest states its role, required attributes, and keyboard behaviour, and the fixture tests them.

## When a token earns its place

Tokens are the essential settings a designer reaches for to build a site: they guide, not just expose. Every public token is catalogue weight and, from beta, permanent API, so a new one has to pass at least one of three tests:

- **(A) A theme must set it and could not otherwise.** A component's skin is token-only, so a component value a theme should reach is a token. Bare-element typography is not a reason on its own: a theme styles bare elements with rules in its `yeti.theme` layer.
- **(B) The framework must coordinate it.** It is read by several components, or reset where it would otherwise break something.
- **(C) A designer would expect it as part of a standard set.** Link color, and the font controls (family, weight, width, tracking), are what anyone customizing a site looks for first; a set missing one of its members feels broken. A set stands or falls as a whole.

A value that passes none of them, a pass-through to one property on one element, is a literal declaration in the base, and a theme that wants it different writes an element rule.

## Branches

We use git-flow. Work happens on `feature/*` branches cut from `develop` and merged back by pull request. Releases go through `release/*` to `master` and are tagged `v7.x.y`. Foundation for Sites 6 maintenance happens on `v6`.

## Commit messages

Conventional commits, short and specific: `feat(tools): add the validator`, `fix(reset): keep dialog centering`, `docs: explain the token scale`.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
