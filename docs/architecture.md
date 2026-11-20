# Architecture

The page is a set of ES modules loaded by the browser as they are. There is no bundler: `index.html` links the stylesheets and one script, `src/main.js`.

## Start-up

```text
index.html
  └─ src/main.js            imports app.js; shows a message on the page if that throws
       └─ src/app.js        imports each part in order, then fits the sections to the screen
            ├─ graph/graph.js             ─┐
            ├─ sections/hero/hero.js       │  each draws its own part when it is imported
            ├─ sections/experience.js      │
            ├─ sections/skills.js          │
            ├─ sections/projects/projects.js
            ├─ sections/contact.js        ─┘
            └─ navigation/navigation.js   wheel, swipe, keys; imports the commit menu
```

`core/content.js` fetches the five JSON files in `content/` with a top-level `await`. Every module that needs content imports it, so by the time a module's own code runs, the content is there. A project's write-up is fetched the first time its book is picked.

## Layers

Imports only point downward. Nothing in a lower layer imports from a higher one.

```text
navigation/        goTo, jump, input, the commit menu
ceremony/          the hammered commands between sections
sections/          hero, experience, skills, projects, contact
graph/             the git history: model.js (pure) and graph.js (DOM)
core/              content, state, scale, router, dom, env
lib/               markdown, dates, icons, util      (no DOM, no page knowledge)
```

Two things need to go against that direction, and both go through `core/router.js`:

- a section asks for a section change (the hero's buttons, the release summary), and
- the git tree asks to check out a commit.

Navigation registers its `goTo` and `jump` with the router at start-up; sections and the graph call the router. That keeps the import graph free of cycles.

## State

`core/state.js` holds the little that is shared: the current section, the furthest one reached, whether a change or a ceremony is running, whether the commit menu is open, and where HEAD is. Everything else is private to its module: the sphere's angle and spin live in `projects.js`, the hero's pixels in `hero.js`.

## The git history

`graph/model.js` turns `experience` and `projects` into a list of commits and the geometry of the tree. It has no DOM and is unit-tested. `graph/graph.js` draws that model twice: the tree on the left edge in real pixels, and the fixed-size commit table shown during a section change and as the commit menu.

Adding a job or a project adds a commit and, for a project, a lane. The tree sets `--graph-w` from its own width, so sections always leave exactly the room it needs.

## Moving between sections

`navigation/navigation.js` owns `goTo(index, nav)`:

1. cover the page and move the track to the new section underneath,
2. play the ceremony: on a first visit, the commands that create that part of the history (`ceremony/transitions.js`), otherwise one `git checkout`,
3. uncover the page and tell the section it has been entered.

A pause inside a ceremony goes through `sleep()` in `ceremony/hammer.js`, not a plain timer, so Escape can end it at once.

## Fitting the screen

Every length in `src/styles/` is `calc(N * var(--u))`. `tokens.css` defines `--u0`, the page's unit, from the window:

| Screen                          | Drawn for         | `--u0`                                                                         |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| Landscape, wider than 900px     | 695 units tall    | the smaller of height / 695 and width / 1180                                   |
| Portrait, or 900px and narrower | a 390 x 700 phone | the smaller of width / 390 and height / 700, capped by a gentle slope in width |

The landscape rule has no breakpoint in it, so the page never changes size abruptly as a window is resized. 1180 units is the least width the side-by-side layout needs. Above its drawn size the unit grows slower than the window (0.7 of the way), so a large monitor gains room as well as size.

`--u` is `--u0` unless a section overrides it. `core/scale.js` measures each section that has `data-fit` on its content box and, if the content is taller than the screen, sets that section's `--u` to a share of `--u0` until it fits. Scripts that place things in pixels (the tree, the hero's layout, the animations) read the same unit through `unitOf(element)`.

## The hero

`sections/hero/` is the largest part:

| File              | Does                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `hero.js`         | Layout, the opening's timeline, the frame loop                                |
| `markup.js`       | The words, from `profile.json`                                                |
| `portrait-map.js` | Reads `assets/portrait-map.png` (tone, depth, outline) and samples it         |
| `renderer.js`     | One WebGL point renderer, used for the portrait's letters and the word pixels |
| `ink.js`          | Redraws an element on a hidden canvas and returns a dot wherever there is ink |
| `cursors.js`      | The name-tagged cursors                                                       |
| `letters.js`      | The physics that lets the pointer and the cursors knock letters about         |
| `loader.js`       | The counted ring                                                              |
| `pointer.js`      | Where the visitor's pointer is                                                |

Without WebGL, or if anything in the opening throws, `hero.js` falls back to the photograph and the words in place.

## Tests and checks

- `tests/` covers the pure code: dates, the Markdown renderer, the git model, the diagram builder, and the content checker (which is run against the real content and against deliberately broken copies of it).
- `scripts/check-content.mjs` validates `content/`.
- `scripts/sync-head.mjs --check` fails if `index.html`'s head is out of date with `content/site.json`.
- CI runs `npm run verify` and `npm run build` on every push to `main` and on pull requests.
