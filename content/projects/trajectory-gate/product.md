## The problem

Agent changes are reviewed by reading a prompt diff and trying two or three examples by hand. That shows whether the answer reads well. It does not show whether the agent still does the steps it is supposed to do.

## Who it is for

Teams that ship agents and review changes through pull requests.

## How someone uses it

They open a pull request that changes a prompt. A few minutes later the check is green, or it is red with a comment such as: in the refund case, step 2, the policy check, was skipped in 2 of 5 runs. They fix the prompt, or they decide the new behavior is right, record it again, and ask a reviewer to approve the new file.

## In scope

- Recording, replay and comparison
- Rules per case
- A clear message on failure

## Left out on purpose

- Judging whether an answer is good. That is a different kind of eval, and other tools do it.
- Load and latency testing

## How success is judged

- Regressions caught before merge
- A false alarm rate low enough that nobody switches the check off
- Minutes added to CI

## Risks

| Risk                                    | What stands in the way                                |
| --------------------------------------- | ----------------------------------------------------- |
| A gate so strict that people disable it | Rules per case, per field, and a threshold on repeats |
| Recordings that go stale                | A miss is reported, and re-recording is one command   |
| Cases that only cover the easy paths    | Cases can be made from real production traces         |

## What already exists

Eval libraries can compare trajectories inside a test. What this adds is the full loop around that comparison: recording, offline replay, reviewed files, and a check that sits on the pull request.
