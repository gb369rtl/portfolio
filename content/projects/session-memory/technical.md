## How it works, end to end

1. **Session start.** A hook builds a briefing of about 800 tokens: where things stand, the active tasks, the latest summary, and anything that was paused. The session begins with it.
2. **Each finished turn.** A hook works out which project the turn belongs to. It starts from the working folder, but if most of the files touched sit in another project, the turn is filed there.
3. The turn is appended to that project's session file for the week, with its metadata at the top of the file.
4. A small model reads the turn and returns 3 to 8 tags.
5. **Before compaction.** The model writes a summary of the session so far: what was decided, what came out of it, and what is left to do. That is saved as a diary entry.
6. The upstream tool indexes the same text for vector search.
7. **Later.** I search from the command line by keyword, topic, file, date or project, or the next session's briefing brings it up by itself.

## The parts

- **Hook wrapper** (Python): one entry point for the three hooks
- **Router**: decides the project for a turn
- **Distiller and tagger**: the calls to the small model
- **Vault**: Markdown files that open in Obsidian, one folder per project
- **Search**: my own command-line search over the files' metadata, next to the upstream tool's vector search
- **Backup script**: commits the vault and syncs it

## Decisions that mattered

- **A hook must never block a session.** The wrapper always passes control on. Its own failures are logged and ignored.
- **Three ways to reach a model.** The SDK when a key is set, the agent's own command line when it is not, and plain pattern matching when neither is available. A guard stops a hook from triggering itself.
- **Plain files first.** Everything is readable Markdown, so the memory survives any change of tooling.
- **Route by the files touched, not only by the folder.** Sessions often start in one project and end in another.

## Limits today

- Summaries are written only at compaction, so a short session gets tags but no summary.
- Paths are set for my own machine.
- There are no automated tests.
