## A task, step by step

1. **Submit.** A task arrives: a goal, the site, any inputs, and what will count as done. For example: the file invoice-2026-10.pdf exists in the downloads folder.
2. **Route.** The router looks for an API adapter that covers this kind of task. If there is one, it calls it, with retries.
3. **Fall back.** With no adapter, or after a lasting failure, the task goes to the browser agent.
4. **Open.** A headless browser starts with a fresh profile. If the site needs a session, a saved one is loaded. The agent never sees a password.
5. **Observe.** The page is read as an accessibility snapshot: a tree of roles, names and states. It is trimmed to what matters and written as a short list, each item with a reference.
6. **Decide.** The agent sees the goal, the list, and its last few steps. It chooses one action.
7. **Act.** Playwright performs the action on the element behind that reference.
8. **Observe again.** A page change makes the old references invalid, so a fresh snapshot is taken after every action.
9. **Finish.** The agent says it is done and points at its evidence, or it gives up and says why.
10. **Check.** A separate checker tests the evidence the task named. A file must exist and be the right kind. A confirmation must be on the page. Only a passing check marks the task complete.

## What the agent is shown

```
Page: Invoices - Supplier Portal
[e12] link "Invoices" (current)
[e18] combobox "Month" value "November 2026"
[e21] table "Invoices"
[e27]   row "INV-2291  31 Oct 2026  1,840.00"
[e29]     button "Download PDF"
[e33] button "Next page"
```

## The actions it has

| Action   | What it does                                                              |
| -------- | ------------------------------------------------------------------------- |
| click    | Clicks the element with a reference                                       |
| type     | Types text into a field                                                   |
| select   | Chooses an option                                                         |
| press    | Presses a key                                                             |
| scroll   | Scrolls the page                                                          |
| goto     | Opens an address, if the site is on the allowed list                      |
| wait_for | Waits for some text to appear                                             |
| look     | Takes a screenshot, for charts and other things structure cannot describe |
| done     | Claims the goal is met and names the evidence                             |
| give_up  | Stops and gives a reason                                                  |

## What it keeps

| Table    | Fields                                                                   |
| -------- | ------------------------------------------------------------------------ |
| tasks    | goal, site, how success is checked, status, steps used, cost             |
| steps    | task, order, action, reference, a hash of the page, result, milliseconds |
| evidence | task, what was found, whether the check passed                           |

## Decisions, and what I turned down

- **The API first.** It is faster, cheaper and steadier than any page.
- **Structure before pixels.** A button's role and name survive a redesign better than its position on screen, and a short list costs far less than an image. Screenshots are for the cases structure cannot describe.
- **A new snapshot after every action.** References from an old page may point at something else.
- **Done is a claim, not a fact.** The agent's own word is never enough. The checker decides.
- **A step limit.** A task not finished in 30 actions stops and reports where it got to.
- **A fresh profile for each task.** No cookies or sessions leak from one task to another.
- **No password in the model's context.** Sessions are prepared outside and loaded as a file.
- **I turned down recorded click scripts.** They are cheap until the page changes, and then they fail silently.

## Where it stops and asks a person

- A login page it has no session for
- A CAPTCHA or any other bot check. It does not try to get past these.
- A payment, or any form marked as not reversible, unless the task allows it and a person confirms
- A site that is not on the allowed list

## When things go wrong

| What happens                                          | What the agent does                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The same action fails three times                     | Gives up and reports the page it was on                                                          |
| The page never finishes loading                       | Waits up to a limit, then reports it                                                             |
| Text on the page tells the agent to do something else | Page text is data. The allowed-site list and the small action set leave little for it to trigger |
| The check fails after the agent said done             | The task is marked failed, never complete                                                        |
