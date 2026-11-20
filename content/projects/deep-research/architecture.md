## What each part does

- **Supervisor.** Turns the question into three to seven sub-questions and holds the state of the whole run.
- **Searchers.** One per sub-question, running at the same time. Each may run a few searches and open a few pages, then returns findings.
- **Fetcher.** Downloads a page, strips it to readable text, and splits it into passages.
- **Store.** PostgreSQL. It holds pages, passages, findings, claims and verdicts.
- **Writer.** Builds the report section by section. It is given passages by number and must cite by number.
- **Checker.** Reads one claim and its passage and answers supported, partly, or not.
- **API.** Starts a run, streams progress, and serves the report.

## What crosses each arrow

- **Supervisor to searcher.** One sub-question and a budget.
- **Searcher to store.** Pages and passages.
- **Store to writer.** Passages with their numbers. The searchers' own reasoning is not passed on.
- **Writer to checker.** One sentence and the passage it cites.
- **Checker to writer.** The sentences that failed, each with a reason.
