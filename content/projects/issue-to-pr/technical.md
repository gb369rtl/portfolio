## A run, step by step

1. **Trigger.** Someone adds the label agent:fix to an issue. GitHub calls the app's webhook. The runner checks the signature, creates a run record and answers at once. The work happens in the background.
2. **Prepare the sandbox.** The runner builds or reuses an image for the repository, clones it at the current commit of the default branch, and installs the dependencies. Then it restarts the container with the network off, as a non-root user, with limits on CPU, memory, processes and time.
3. **Baseline.** It runs the test suite once before the agent touches anything and records which tests already fail. Those are not the agent's fault and are left out of the verdict.
4. **Locate.** The agent reads the issue, searches the code, opens the files it needs, and writes a short plan: what is wrong, which files change, and which test will prove it.
5. **Reproduce.** It writes or picks a test that fails for the reason in the issue, and runs it. If it cannot make a test fail, it stops and says so. A fix nobody can demonstrate does not become a pull request.
6. **Fix.** It edits through patches. Each patch is checked to apply cleanly before it is applied.
7. **Verify.** It runs the reproducing test, then the whole suite. The result comes back as structured data, not a wall of text.
8. **Retry.** If something fails, the failure goes back to the agent. It has three attempts in total.
9. **Review the diff.** Before anything leaves the sandbox, the runner checks the diff against fixed rules.
10. **Open the pull request.** The runner pushes a branch named agent/issue-N and opens a pull request with the plan, the files changed, the test that failed before and passes now, the attempts used, and the cost.
11. **Or stop.** When the attempts or a limit run out, it comments on the issue with what it tried and where it got stuck, and removes the label.

## The tools

| Server | Tool        | What it does                                                                        |
| ------ | ----------- | ----------------------------------------------------------------------------------- |
| repo   | search_code | Text search across the repository                                                   |
| repo   | read_file   | A file, or a range of lines                                                         |
| repo   | list_dir    | Names in a directory                                                                |
| repo   | apply_patch | Applies a unified diff after a dry run                                              |
| repo   | diff        | The change so far                                                                   |
| shell  | run         | One command, with a time limit and trimmed output                                   |
| tests  | list_tests  | The tests the project has                                                           |
| tests  | run_tests   | Runs a selection and returns what passed, what failed, and the tail of each failure |

Every tool declares whether it only reads. The servers speak MCP over standard input and output inside the container, so the same three servers work with any MCP client.

## Rules the diff must pass

- No change to CI files, lock files or anything under .github
- No existing test deleted, skipped or weakened. New tests are welcome.
- A size limit, 300 changed lines to begin with
- No new dependency unless it is called out at the top of the pull request

A diff that breaks a rule is not pushed. The run ends as a comment.

## What it keeps

| Table | Fields                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------- |
| runs  | repository, issue, base commit, status, attempts, tool calls, tokens, cost, duration, pull request link |
| steps | run, order, tool, arguments, result summary, milliseconds                                               |

## Decisions, and what I turned down

- **MCP for every tool.** I could call Python functions directly. Going through MCP makes the tools reusable from any client and puts one clear boundary between the agent and the sandbox.
- **Reproduce first.** Without a failing test, passing tests prove nothing. This one rule removes most confident, wrong fixes.
- **Tests as the judge, a person as the merger.** The agent never merges and cannot push to the default branch.
- **The token stays outside.** Many designs give the sandbox a token so the agent can push. Here the runner pushes, so nothing inside the sandbox is worth stealing.
- **No network during the run.** The agent cannot look things up, which costs some convenience. In return, text in an issue cannot make the agent send anything anywhere.
- **Three attempts.** More attempts raise the resolve rate a little and the cost a lot. An agent still failing after three is usually on the wrong track.

## When things go wrong

| What happens                        | What the run does                                         |
| ----------------------------------- | --------------------------------------------------------- |
| Dependencies fail to install        | Stops before the agent starts and comments with the error |
| The suite is already red            | Records the failing tests and ignores them in the verdict |
| A test passes only on a re-run      | Marks it flaky and does not count it as fixed             |
| The agent repeats one action        | The tool-call limit ends the run                          |
| The issue asks for something unsafe | The diff rules stop it, and the comment names the rule    |
| The time or cost limit is reached   | Ends the run and reports the last state                   |

## Limits per run

Three attempts, 40 tool calls, 20 minutes, and a cost ceiling set per repository.
