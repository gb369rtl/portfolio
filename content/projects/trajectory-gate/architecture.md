## What each part does

- **Recorder.** A wrapper at the point where the agent calls a tool. It writes each call to a file.
- **Approved recordings.** Files in the repository. Each is one case: an input, the expected steps, and optional rules.
- **Replayer.** Stands in for every tool. It answers each call from the recording.
- **Comparer.** Plain code. It lines up the new sequence against the approved one under the case's rules.
- **GitHub Action.** Runs the cases, sets the check, and writes the comment.

## What crosses each arrow

- **Recordings to replay.** The input for the agent, and a recorded result for each tool call.
- **Replay to compare.** The sequence of calls the new build made, once per repeat.
- **Compare to author.** Which case failed, which step, and in how many repeats.
