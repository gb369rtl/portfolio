## The problem

A maintainer has forty open issues. Ten are small: a wrong default, an off-by-one, a crash on empty input. Each is an hour of locating, reproducing, fixing and writing up, and none is urgent, so they wait.

## Who it is for

Maintainers and small teams who would rather review a pull request than write one.

## How someone uses it

They read an issue, decide it is clear enough, and add a label. They go back to their own work. Some minutes later there is a pull request. At the top it says what was wrong, which test failed before, and that the suite now passes. They read the diff, then ask for a change or merge it. If the agent could not do it, there is a comment that says what it tried, which often makes the issue easier for a person to pick up.

## In scope

- Issues with a clear expected behavior
- Repositories with a test suite
- Changes of a few files

## Left out on purpose

- Merging. A person does that.
- Design decisions and new features
- Repositories with no tests, because there is nothing to judge a fix against

## How success is judged

- Resolve rate on the two issue sets
- The share of its pull requests merged without changes
- Cost per resolved issue
- Zero pull requests with a failing suite

## Risks

| Risk                                           | What stands in the way                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| A fix that passes the tests but is wrong       | Reproduce-first, the plan at the top of the pull request, and human review |
| Text in an issue that tries to steer the agent | No network, no token in the sandbox, and the diff rules                    |
| Runaway cost                                   | Limits on attempts, calls, time and money                                  |
| Weakening tests to get to green                | The diff rules reject it                                                   |

## What already exists

GitHub's own coding agent, Devin, OpenHands and SWE-agent all work in this space. This build is small on purpose. Its point is that every part is mine and measured: the tools, the sandbox, the rules and the score.
