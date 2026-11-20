## The problem

Running four agents in four terminals works until I lose track of which one is waiting for me, or two of them edit the same file.

## Who it is for

Developers who hand several tasks to coding agents at the same time. For now, that is me.

## How I use it

I open the app, pick a repository and give the agent a task. I start a second and a third in other repositories. The sidebar tells me which ones are working and which have finished, and I step into one when it needs a nudge.

## In scope

Starting, watching, steering and stopping agents, each isolated in its own worktree.

## Left out on purpose

Being an editor. Reading and changing code stays in the editor I already use.

## How success is judged

How many agents I can keep useful at once without losing work or losing track.

## Main risk

The agent tool's output format changes. The parser is the only part that knows that format, and the fake agent in the tests pins what the app expects.
