## Build order

| Stage | What I build                                              | It is done when                                                                    |
| ----- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | The three MCP servers, with their own tests               | A script can search, patch and run tests in a sample repository through MCP alone  |
| 2     | The loop for one issue, from the command line             | It fixes a seeded bug in a demo repository and prints a diff                       |
| 3     | The sandbox: image build, network cut, limits             | The same run works with the network off, and a hostile issue cannot reach anything |
| 4     | The baseline, the reproduce-first rule and the diff rules | A run with no failing test ends without a pull request                             |
| 5     | The GitHub App: webhook in, branch and pull request out   | Labelling an issue in a test repository produces a pull request                    |
| 6     | Scoring                                                   | The table below is filled in and published                                         |

## How it is measured

Two sets of issues.

**SWE-bench Verified.** A sample of 50 of its 500 tasks. Each task is a real issue from an open-source Python project, with the commit before the fix. A task counts as resolved only if the tests the real fix made pass now pass, and the tests that passed before still pass. The agent never sees those tests. Grading uses the benchmark's own Docker harness.

**My own set.** 20 issues written against repositories I control, with seeded bugs of known difficulty. This set tests the whole path, including the GitHub side.

| Number                  | Why it matters                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| Resolve rate            | The headline                                                     |
| Cost per resolved issue | Whether it is worth running                                      |
| Median time per run     | Whether it is pleasant to use                                    |
| Attempts used           | Whether the limit is in the right place                          |
| Why the failures failed | Could not locate, wrong fix, broke other tests, or out of budget |

One rule is a requirement, not a score: no pull request is ever opened with a failing suite.

## After the first version

- Review comments on the pull request start a second run
- A cheaper model for locating, a stronger one for fixing
- Languages beyond Python

## Reading behind this design

- [SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/): the benchmark and how it grades
- [Model Context Protocol](https://modelcontextprotocol.io): the tool protocol
