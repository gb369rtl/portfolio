## How it works, end to end

1. I add a repository and start an agent with a name.
2. The app creates a worktree beside the repository, on a new branch named after the agent.
3. It starts the agent's command-line tool in that worktree, in streaming JSON mode, and keeps its standard input open.
4. Three async tasks watch the process. One reads its output and publishes each line on a channel, one keeps the last 50 lines of errors, and one waits for it to exit.
5. A parser turns each output line into a typed event: started, retrying, rate limited, assistant message with tool calls, tool result, partial text, finished, exited.
6. The interface updates from those events. The sidebar shows the latest activity and the center shows the transcript.
7. A message typed in the composer is written to the agent's input as JSON. Stop sends an interrupt request when the tool supports one, and ends the process otherwise.

## The parts

- **Supervisor** (tokio): starts, watches and stops the agent processes
- **Worktree manager**: creates a worktree and branch per agent
- **Stream parser**: newline-delimited JSON to typed events
- **Interface** (iced): sidebar, transcript, composer, launcher
- **Discovery**: asks the agent tool every two seconds which sessions exist, and lists the ones started elsewhere

## Decisions that mattered

- **Rust and iced, in one process.** It began as a web view with a React front end. I replaced that on the first day, because a tool that sits open all day should start instantly and stay light.
- **One worktree per agent.** Agents cannot overwrite each other, and each one's work is already a branch.
- **Unknown events are not errors.** The agent tool adds event types over time. The parser keeps going when it meets one it does not know.
- **Reuse the tool's own login.** The app never handles a key.

## Limits today

- Only the list of repositories is saved. Transcripts live in memory and are gone on restart.
- A worktree is not removed when its agent is done.
- A session started outside the app can be messaged, but its reply is not shown yet.
