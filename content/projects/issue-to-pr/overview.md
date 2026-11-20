## What it is

A coding agent that takes a GitHub issue and returns a pull request. It reads the issue, reproduces the problem with a failing test, changes the code inside a locked-down container, runs the test suite, and opens a pull request that shows its plan and its test evidence. A person reviews and merges.

## The problem

Small, well-described bugs sit in a backlog for weeks. Each one needs an hour of someone's attention: find the code, reproduce it, fix it, run the tests, write it up. That hour is work an agent can do, as long as what comes out is a pull request a person can check in five minutes.

## How it works, in short

A label on an issue starts a run. The run gets a fresh container with the repository inside and no network. The agent has three sets of tools, all reached over MCP: read and edit the repository, run commands, run tests. It must first make a test fail for the reason the issue describes, then make it pass without breaking the others. It gets three attempts. A passing run becomes a pull request. A failing run becomes a comment that says what was tried.

## What it covers

- Starting from a label, a comment, or the command line
- Finding the code an issue is about
- Reproducing before fixing
- Edits as patches, checked before they are applied
- A sandbox with no network and no credentials
- Hard limits on attempts, tool calls, time and cost
- A pull request with the plan, the diff summary and the test output
- A resolve rate measured on SWE-bench Verified tasks and on my own issue set

## At a glance

|           |                                                                                       |
| --------- | ------------------------------------------------------------------------------------- |
| Input     | One GitHub issue                                                                      |
| Output    | A pull request, or a comment explaining why not                                       |
| Stack     | Python, MCP, Docker, a GitHub App, pytest                                             |
| Judged by | Issues resolved, cost per resolved issue, and zero pull requests with a failing suite |

## Where it stands

Designed end to end. It is the first of the three I am building, in the order on the Build tab.
