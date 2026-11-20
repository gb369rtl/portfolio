## What each part does

- **GitHub App.** Receives the webhook when an issue is labelled, and later opens the pull request. It holds the only credential in the system.
- **Runner.** A Python service that owns one run. It starts the container, drives the agent loop, counts attempts, enforces the limits and records every step.
- **Agent.** The model and a short system prompt. It can do nothing except call the tools it is given.
- **Tool servers.** Three small MCP servers that run inside the container: repository, shell and tests. They are the agent's whole world.
- **Sandbox.** One Docker container per run. The repository is cloned and its dependencies installed while the network is on. Then the network is cut for the rest of the run.
- **Run store.** A table of runs and steps, so any run can be read back later.

## What crosses each arrow

- **Issue to agent.** The title, the body and the comments, passed as data.
- **Agent to tools.** Tool calls with typed arguments.
- **Tools to tests.** A test selection goes in. A structured result comes out: which tests failed, and the last lines of each failure.
- **Tests to pull request.** Only a diff. The runner takes the patch out of the container and pushes it itself, so the container never holds a token.
