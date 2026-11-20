## Build order

| Stage | What I build                               | It is done when                                            |
| ----- | ------------------------------------------ | ---------------------------------------------------------- |
| 1     | The page reader                            | Any page becomes a short list with references              |
| 2     | The actions, on top of Playwright          | A script can finish a task using only the ten actions      |
| 3     | The loop, for one task on one site         | The agent downloads a file from a demo portal              |
| 4     | The completion check                       | A task the agent wrongly calls done is marked failed       |
| 5     | The router and one API adapter             | The same task uses the API, and falls back when I break it |
| 6     | The stops: allowed sites, logins, payments | Each stop is triggered by a test                           |
| 7     | The task set and the score                 | The table below is published                               |

## How it is measured

**My own set.** 30 tasks across six demo sites that I host, so the pages do not change and nothing is blocked. This is the set that can be rerun and compared over time.

**A public sample.** 50 tasks drawn from WebVoyager, a public set of 643 tasks on 15 real websites. Live sites change and some block automation, so this number is reported with its date. Published results on such sets depend heavily on how completion is judged, so I use my own checker and audit a sample by hand.

| Number                    | How it is counted                                        |
| ------------------------- | -------------------------------------------------------- |
| Completion rate           | Tasks where the check passed                             |
| Wrong completions         | Tasks reported complete that were not. This must be zero |
| Steps per task            | Median                                                   |
| Cost per task             | Model cost                                               |
| Share needing the browser | Tasks the API could not finish                           |

## After the first version

- More API adapters, so the browser is needed less often
- Reusing the path from a past success as a hint, never as a script

## Reading behind this design

- [Playwright MCP snapshots](https://playwright.dev/mcp/snapshots): reading a page as an accessibility tree with references
- [WebVoyager](https://arxiv.org/abs/2401.13919): the public task set
