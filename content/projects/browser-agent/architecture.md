## What each part does

- **Router.** Knows which kinds of task have an API adapter. It tries that first and passes the task on when it cannot be done there.
- **Browser agent.** The model and the loop: observe, decide, act.
- **Page reader.** Turns the accessibility snapshot into a short list with references, and trims what does not matter.
- **Headless browser.** Playwright with a fresh profile for each task.
- **Completion check.** Plain code that tests the evidence the task named.

## What crosses each arrow

- **Router to agent.** The task, when there is no API or the API failed.
- **Agent to page reader.** A request for the current page.
- **Page reader to browser.** One action on one reference.
- **Agent to check.** A claim that the task is done, and where the evidence is.
