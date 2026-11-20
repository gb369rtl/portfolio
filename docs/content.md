# Content reference

Everything the page says is in `content/`. Facts are JSON; long write-ups are Markdown files beside the JSON that names them, because a hundred lines of prose inside a JSON string cannot be edited sanely.

Run `npm run check` after editing. It names the file and the entry of every problem.

## `site.json`

What search engines and link previews read. After changing it, run `npm run sync` to write it into `index.html`.

| Field                              | Meaning                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `language`                         | The page's language code, for example `en`                                       |
| `title`                            | The browser tab's title                                                          |
| `description`                      | The description under the title in search results                                |
| `url`                              | The site's address once it is online, starting with `https://`. Empty until then |
| `share.title`, `share.description` | The words on a link preview                                                      |
| `share.image`                      | The preview image, 1200 x 630                                                    |

## `profile.json`

| Field                              | Meaning                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `brand`, `role`            | Your name; the wordmark at the top of the hero; your role in one line                                                                                                   |
| `location`, `timezone`             | Kept for reference; the contact blurb is what the page shows                                                                                                            |
| `email`                            | Shown in the last section; a click copies it                                                                                                                            |
| `links`                            | A list of `{ id, label, url }`. `github`, `linkedin` and `x` get an icon in the hero; any other id is shown as text. To add an icon, add its path to `src/lib/icons.js` |
| `resume`                           | `{ label, file }`: the PDF the resume links open                                                                                                                        |
| `education`                        | `{ degree, school, years }`, shown in the last section                                                                                                                  |
| `hero.availability`                | The line in the small box at the top of the hero                                                                                                                        |
| `hero.greeting`                    | The line under it                                                                                                                                                       |
| `hero.headline`                    | `marked` is highlighted; `rest` follows it                                                                                                                              |
| `hero.bio`                         | Two or three lines under the headline                                                                                                                                   |
| `hero.actions`                     | The labels of the two buttons: `work` goes to projects, `contact` to the last section                                                                                   |
| `hero.portraitWords`               | The words the portrait is set in, in order                                                                                                                              |
| `hero.collaborators`               | The names on the three other cursors. Yours is the fourth                                                                                                               |
| `contact.heading`, `contact.blurb` | The last section's heading and the line under it                                                                                                                        |
| `contact.release`                  | The tag the story ends on, for example `v1.0`                                                                                                                           |
| `contact.focus`                    | The "skills" line of the release summary                                                                                                                                |

## `experience.json`

A list of jobs, **oldest first**. Each job becomes one commit on the `experience` branch.

```json
{
  "id": "acme",
  "company": "Acme",
  "role": "Software Engineer",
  "start": "2025-09",
  "end": null,
  "note": "contract",
  "work": [{ "type": "feat", "scope": "billing", "text": "build the invoicing service" }]
}
```

- `start` and `end` are months written `YYYY-MM`. `"end": null` means the job is current.
- `note` is optional and follows the dates on the page ("May - Sep 2025, contract").
- Each line of `work` is written like a commit: a `type`, a short `scope`, and what was done. The page shows the scope and the text.
- The time shown in the last section runs from the first job's `start` to today.

## `skills.json`

A list of groups. Each group is one tape in the Skills section.

```json
{ "id": "backend", "name": "Backend", "items": ["FastAPI", "NestJS", "asyncio"], "highlight": ["FastAPI"] }
```

`items` appear in the order written. Every name in `highlight` must be one of the `items`.

## `projects.json`

A list of projects. The order here is the order everywhere: on the sphere, in the tree and in the list.

| Field        | Meaning                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `id`         | Lower-case words joined by hyphens. It names the branch (`project/<id>`) and the write-up folder    |
| `name`       | The title on the book                                                                               |
| `tagline`    | One line, used as the commit message                                                                |
| `status`     | `shipped` or `design`. A design is drawn as a `docs` commit and marked on its cover                 |
| `summary`    | Two or three sentences, shown beside the write-up                                                   |
| `stack`      | A list of names                                                                                     |
| `repo`       | `"owner/name"` for a public GitHub repository, or `null`. A public one gets a link and a README tab |
| `sourceNote` | Optional: what to say in place of a link when the source is private                                 |
| `highlights` | Lines written like commits. They are what the book shows when a tab has no write-up yet             |
| `writeup`    | Which tabs the book has, from: `overview`, `architecture`, `technical`, `build`, `product`          |

## `projects/<id>/`

One folder per project, holding the files its `writeup` lists.

- `overview.md`, `technical.md`, `build.md`, `product.md`: Markdown. Headings start at `##`. Supported: headings, paragraphs, lists, tables, block quotes, links, bold, emphasis, inline code, and code blocks fenced with `~~~`.
- `architecture.json`: the diagram.

```json
{
  "note": "One sentence shown under the diagram.",
  "details": "architecture.md",
  "nodes": [
    { "id": "user", "label": "Reviewer", "col": 0, "row": 0, "kind": "person" },
    { "id": "api", "label": "API, FastAPI", "col": 1, "row": 0 }
  ],
  "edges": [{ "from": "user", "to": "api", "label": "asks" }]
}
```

- A node sits at a column and a row, both counted from 0. No two nodes may share a cell.
- `kind` is `person` or `storage`; leave it out for a service or a step.
- A label written `"Name, detail"` is set on two lines.
- `details` is optional: a Markdown file in the same folder, shown under the diagram.

Raw HTML in a write-up is never passed through to the page.
