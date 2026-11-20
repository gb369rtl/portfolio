## What it is

A check that runs on a pull request. It replays recorded agent runs against the new build and blocks the merge when the sequence of tool calls drifts from the approved one.

## The problem

Someone rewords a prompt to make the agent more polite. The answers still look fine, so the tests pass. But in one case in ten the agent now skips the step where it looks the record up, and answers from what it assumes. Nothing catches that until a customer does.

## How it works, in short

A run is recorded as an ordered list of tool calls. A person reviews that list once and approves it. On every pull request, the new build of the agent is given the same inputs again. Its tools do not really run: each call is answered from the recording. The new list of calls is then compared with the approved one, under rules that say which steps must match exactly and which may vary. A skipped, added or reordered step fails the check, and the pull request gets a comment showing what moved.

## What it covers

- Recording a run as tool calls with their arguments and results
- Approved recordings kept in the repository and reviewed like code
- Replay with tool results served from the recording, so nothing reaches the network
- Four ways to compare a sequence, and separate rules for arguments
- Repeated runs, because a model does not answer the same way every time
- A check on the pull request, with a readable difference
- A measured catch rate and false alarm rate

## At a glance

|           |                                                           |
| --------- | --------------------------------------------------------- |
| Input     | A pull request that changes a prompt, a tool or the agent |
| Output    | A passed or failed check, with what changed               |
| Stack     | Python, pytest, GitHub Actions                            |
| Judged by | Seeded regressions caught, and false alarms raised        |

## Where it stands

Designed end to end. It is the third of the three I am building. It grows out of the replay tests I built for the approvals system at work.
