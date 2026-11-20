## A check, step by step

1. **Record.** A wrapper sits where the agent calls its tools. For each call it writes the tool name, the arguments, the result and the time taken. One run becomes one file.
2. **Approve.** A person reads the recording. If the steps are right, they commit it as an approved case. A rules file can be placed next to it.
3. **Trigger.** A pull request changes something under the prompts, tools or agent folders. The check starts.
4. **Replay.** For each approved case, the new build of the agent gets the recorded input. When it calls a tool, the replayer looks up that call in the recording and returns the recorded result.
5. **Miss.** If the agent makes a call the recording does not contain, the replayer returns a marked error and notes an unexpected call. This is a normal outcome, not a crash.
6. **Repeat.** Each case runs several times, because the model is the part that varies.
7. **Compare.** The new sequences are compared with the approved one under the case's rules.
8. **Report.** The check passes or fails. On failure, a comment on the pull request shows the expected steps, the actual steps, and how many of the repeats differed.

## What a recording looks like

```
case: refund-over-limit
input: "Refund order 4471, it arrived broken"
steps:
  1  lookup_order      {id: 4471}     -> {total: 180}
  2  check_policy      {amount: 180}  -> {needs_approval: true}
  3  request_approval  {order: 4471}  -> {ticket: 9012}
output: "I have asked a supervisor to approve this refund."
```

## The rules for one case

```
compare: strict          # same tools, same order
arguments:
  lookup_order.id: exact
  request_approval.note: ignore
must_call: [check_policy]
must_not_call: [issue_refund]
pass_when: 5 of 5 runs match
```

## Ways to compare

| Mode      | It passes when                                       |
| --------- | ---------------------------------------------------- |
| Strict    | The same tools are called in the same order          |
| Unordered | The same tools are called, in any order              |
| Superset  | Every approved call is made; extra calls are allowed |
| Subset    | No call is made beyond the approved ones             |

These four follow the vocabulary of LangChain's agentevals, so the idea is familiar to people who use it. Arguments are matched by their own rule for each field: exact, ignore, or a custom match.

## Decisions, and what I turned down

- **Compare the steps, not the final text.** Wording changes between runs. The sequence of actions should not.
- **Serve tool results from the recording.** No network, no test database, no cost per tool call, and the same result every time.
- **The model runs for real.** The prompt and the model are the things under test, so they cannot be faked.
- **A miss is reported, not fatal.** From the approvals system I know that a replayed agent often asks for something the recording never saw. That is exactly the signal the gate exists to show.
- **Recordings are reviewed files.** Approving a new sequence is an ordinary code review. Nobody can change the expected behavior without a diff.
- **I turned down grading with another model.** A judge model adds its own variation. Comparing sequences is plain code and gives the same verdict every time.

## When things go wrong

| What happens                    | What the check does                                                          |
| ------------------------------- | ---------------------------------------------------------------------------- |
| The agent makes an unknown call | Marks an unexpected call and continues to the end of the run                 |
| One repeat in five differs      | Fails or passes by the case's own threshold, and always lists the difference |
| A tool's schema changed         | Fails every case that uses it, with one grouped message                      |
| The change is intended          | The author re-records, and the reviewer approves the new file                |

## Cost and time

Only model calls cost anything. A hundred cases at five repeats is 500 short runs, which run in parallel. The check is skipped when a pull request touches nothing that can change the agent's behavior.
