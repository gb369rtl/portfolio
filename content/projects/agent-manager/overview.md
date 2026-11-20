## What it is

A native desktop app, written in Rust, for running several coding agents at once. Each agent works in its own git worktree, on its own branch, so two agents never edit the same checkout. The app shows what each one is doing, live, and lets me steer or stop it.

## What it covers

- Starting an agent in a repository with one click, in a fresh worktree
- A sidebar grouped by repository, with a live line of activity for each agent
- A transcript of the agent's messages, tool calls and results
- Sending a new instruction to an agent that is still working
- Stopping an agent cleanly
- Listing sessions that were started outside the app

## In numbers

- 3,563 lines of Rust
- 112 tests, run against a fake agent binary
- One process, with no web view

## Where it stands

Phase one of four, a personal project. The core runs and is tested against the fake agent; the full manual run against real agents is the next thing to sign off. Still to build: tiled panes, approving or denying an agent's requests, reviewing its diff, and committing or opening a pull request from the app. Not public yet.
