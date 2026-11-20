# Portfolio

Geetam's portfolio: one page that tells a career as a git history. Scrolling **up** moves forward. Each section adds to a git tree on the left edge, the commands that would create it are "run" on the way in, and the tree is also the navigation: click any commit to go to that job or project.

It is plain HTML, CSS and JavaScript modules. There is no framework and no build step; what is in this repository is what the browser runs. Everything the page says lives in [`content/`](content/), apart from the code.

## Run it

Needs Node 20 or newer.

```bash
npm install     # only the linter and formatter; the page itself has no dependencies
npm run dev     # http://127.0.0.1:5173/
```

The page loads its modules and content over HTTP, so it has to be served. Opening `index.html` straight from the disk shows a note saying so.

## Change what the page says

All of it is in `content/`. After any edit, run `npm run check`: it reports the file and the entry of anything missing or mistyped before a visitor sees it.

| To change                                     | Edit                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Name, email, links, resume, education         | `content/profile.json`                                                    |
| The hero's words, the contact section's words | `content/profile.json` (`hero`, `contact`)                                |
| Jobs and what was done in each                | `content/experience.json`                                                 |
| Skills, and which are highlighted             | `content/skills.json`                                                     |
| Projects: name, summary, stack, status        | `content/projects.json`                                                   |
| A project's write-up and diagram              | `content/projects/<id>/`                                                  |
| Page title, description and link preview      | `content/site.json`, then `npm run sync`                                  |
| The resume PDF                                | replace `assets/Geetam-Resume.pdf` (source: `resume/resume.html`)         |
| The portrait                                  | replace `tools/portrait-source.jpg`, then `python tools/bake_portrait.py` |

The full reference, field by field, is in [`docs/content.md`](docs/content.md). The short version:

**Add a skill.** Add its name to a group's `items` in `skills.json`. To highlight it, also add the name to that group's `highlight`.

**Add a job.** Add an entry to `experience.json`, oldest first. Months are written `YYYY-MM`; `"end": null` means the job is current. The dates shown on the page, and the "N years and M months" in the last section, are worked out from these.

**Add a project.**

1. Add an entry to `projects.json`. Its place in the list is its place on the page. `status` is `shipped` or `design`.
2. Create `content/projects/<id>/` and write any of `overview.md`, `technical.md`, `build.md`, `product.md`, plus `architecture.json` for the diagram.
3. List the ones you wrote in the entry's `writeup`. A project with none still opens: its book shows the summary, highlights and stack from the entry.

The git tree, the commit table, the sphere of books, the project list and the counts in the last section all follow from these files.

## How it is put together

```text
index.html            the page's skeleton: containers only, no content
content/              everything the page says (JSON for facts, Markdown for write-ups)
assets/               images and the resume PDF
src/
  main.js             entry: starts app.js, and says so on the page if that fails
  app.js              loads each part in order; handles window resizes
  core/               shared by every part
    content.js          loads content/
    state.js            which section is on screen, what is in progress
    scale.js            the page's unit, and fitting each section to the screen
    router.js           how a section asks for a section change
    dom.js, env.js      shared elements; reduced motion and device hints
  graph/              the git history
    model.js            which commits exist and where they sit (no DOM)
    graph.js            draws the tree and the commit table
  ceremony/           what plays between sections: the hammered git commands
  navigation/         wheel, swipe and keys; the commit list as a menu
  sections/           one module per section
    hero/               the opening: WebGL letter portrait, pixel text, cursors
    projects/           the sphere of books, the reader, diagrams
    experience.js, skills.js, contact.js
  lib/                small pure helpers: markdown, dates, icons
  styles/             one stylesheet per part; tokens.css holds colours, type and the unit
scripts/              dev server, content check, head sync, build
tests/                node --test
tools/                the portrait bake script and its source photo
resume/               the resume's source (HTML, printed to PDF)
docs/                 architecture and content reference
```

More detail, including how modules depend on each other, is in [`docs/architecture.md`](docs/architecture.md).

### No section scrolls

Every section fits the screen, on a tablet, a laptop or a 32-inch monitor, so a visitor never scrolls inside a section and then again to leave it. Three things make that hold:

1. **One unit.** The page is drawn for a window 695 units tall, and every length in the stylesheets is a multiple of `--u`, one design pixel. `tokens.css` sets `--u` from the window: as large as the height allows, as long as the width keeps the 1180 units the layout needs. The drawing therefore grows and shrinks as a whole, with no jump at any width.
2. **Two layouts, three sizes.** Landscape screens get the side-by-side layout with the git tree on the left. Portrait screens and narrow windows get a stacked layout, with the tree behind a menu button. Phones use the stacked layout at their own sizes: always 390 units wide, with tap targets of at least 44px, and each section set to fit phones from 553px tall upward.
3. **A safety net.** After layout, `scale.js` measures each section. If one is still taller than the screen, that section's own `--u` is lowered until it fits.

The one place that scrolls is the inside of a project's book, which is a document.

Small type has a floor of 11px so it stays legible when the page is scaled down.

## Scripts

| Command          | What it does                                                          |
| ---------------- | --------------------------------------------------------------------- |
| `npm run dev`    | Serves the folder at `http://127.0.0.1:5173/` (`-- --port 8080`)      |
| `npm run check`  | Validates `content/` and that `index.html` matches it                 |
| `npm run sync`   | Rewrites the `<head>` and no-script line of `index.html` from content |
| `npm test`       | Unit tests for the helpers, the git model and the content checker     |
| `npm run lint`   | ESLint                                                                |
| `npm run format` | Prettier                                                              |
| `npm run verify` | Lint, formatting, content check and tests: what CI runs               |
| `npm run build`  | Makes `dist/`: only the files a browser asks for                      |

## Putting it online

It is a static site. `npm run build` writes `dist/`; put that folder on any static host. Once the address is known, set `url` in `content/site.json` and run `npm run sync`, so link previews get an absolute image address.

## Browser support

Current Chrome, Edge, Firefox and Safari (Safari 15.4 or newer). The page uses ES modules with top-level `await`, WebGL, the Web Animations API and CSS `min()`/`clamp()`. Without WebGL the hero shows the photograph and the words, still. With "reduce motion" set, everything is in place at once and section changes are instant.

## Touch

On a touch screen a swipe up goes to the next section and a swipe down to the one before; the hint on the first screen is also a button. Dragging the sphere sideways turns it, while a vertical swipe on it still changes section. Wording follows the input ("tap" and "swipe" for a finger, "click" and "scroll" for a pointer), decided by media queries, never by screen width. A phone held on its side is too short for any section, so the page asks for it to be turned upright.

## Keyboard

| Key                           | Does                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| Up / Page Up                  | Next section                                                     |
| Down / Page Down              | Previous section                                                 |
| Home / End                    | First / last section                                             |
| Tab to "Open the commit list" | Opens the commit table as a menu; arrows and Enter pick a commit |
| Enter                         | Opens the book that is pulled out                                |
| Esc                           | Skips a section change; steps back out of a book                 |
