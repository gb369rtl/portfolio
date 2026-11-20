## What it is

Memory for my coding-agent sessions. Hooks file every session into a notes vault under the project it belongs to, a small model tags and summarizes it, and the next session starts with the context that matters. It is built on the open-source mempalace tool, which provides the storage and the vector search. My part is everything around it.

## What it covers

- Hooks on session start, on each finished turn, and before the context is compacted
- Filing each turn under the right project, even when the session wandered into another one
- 3 to 8 tags per turn
- A written summary with decisions, outcomes and follow-ups
- A command-line search by keyword, topic, file, date and project
- A short briefing injected at the start of each session
- A backup that commits the vault and syncs it

## In numbers

- 19 modules, about 3,200 lines of Python
- 6 projects filed so far, 37 session files, 11 summaries
- 243 hook runs recorded

## Where it stands

A personal project, running on my own machine since May 2026. It has one user and no tests yet. Not public.
