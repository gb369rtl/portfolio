## The problem

Every month someone in operations logs in to six supplier portals and downloads six invoices. It takes an hour and nobody enjoys it. A script was written for it once. It worked until the first portal changed its menu.

## Who it is for

Operations teams that repeat the same clicks in portals that offer no API.

## How someone uses it

They describe the task once: the site, the goal, and how to tell it is done. They prepare a session for the site. After that the task runs when it is asked to. It goes through the API when there is one and through the browser when it has to, and it comes back with the result and a step log. If it met a login or a CAPTCHA, it says so and waits for a person.

## In scope

- Reading pages, filling forms, downloading files
- Tasks a person could do in a few minutes

## Left out on purpose

- Getting past CAPTCHAs or bot checks
- Creating accounts
- Anything that moves money

## How success is judged

- Completion rate on the fixed task set
- Wrong completions, which must stay at zero
- The share of tasks that needed the browser at all

## Risks

| Risk                                       | What stands in the way                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| Clicking the wrong thing on a changed page | The step limit and the completion check                   |
| Reporting success when it failed           | The checker, which does not take the agent's word         |
| Being steered by text on a page            | Allowed sites, a small action set, no credentials in view |
| A site that forbids automation             | The task is not attempted there                           |

## What already exists

browser-use, Playwright MCP and the large assistants' own browsing agents all drive a browser. What this adds is the router in front, so the browser is the last resort, and the check behind, so done means done.
