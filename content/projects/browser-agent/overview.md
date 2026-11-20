## What it is

An agent that finishes a task in a real browser when there is no API for it, or when the API fails. It reads a page the way a screen reader does, acts through a small set of actions, and does not report success until a separate check has seen evidence.

## The problem

A lot of everyday work sits behind a web page with no API: downloading last month's invoice from a supplier's portal, changing a delivery address, pulling a report. Where an API does exist, it sometimes fails, and the task stops there. Scripts written for these pages break whenever the page is redesigned.

## How it works, in short

A task comes in with a goal and a way to tell that it is done. A router tries the API first. If there is none, or it fails, the task goes to the browser agent. The agent is shown the page as a short list of the things on it that can be acted on, each with a reference. It picks one action, the browser performs it, and it is shown the new page. At the end a checker looks for the evidence the task named. Only then is the task reported as done.

## What it covers

- An API-first router, with the browser as the fallback
- Reading pages from their structure, with a screenshot only when structure is not enough
- A small, fixed set of actions
- A fresh browser profile for every task
- A list of sites the agent is allowed to visit
- A completion check that is separate from the agent
- A stop, and a hand-off, at logins, CAPTCHAs and payments
- A completion rate measured on a fixed set of tasks

## At a glance

|           |                                                            |
| --------- | ---------------------------------------------------------- |
| Input     | A task, with its goal and its evidence of success          |
| Output    | The result, and a log of every step                        |
| Stack     | Python, Playwright, FastAPI, SQLite                        |
| Judged by | Tasks completed, and wrong completions, which must be zero |

## Where it stands

Designed end to end.
