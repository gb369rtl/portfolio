## A run, step by step

1. **Scope.** The supervisor restates the question. If it is ambiguous, it asks one clarifying question.
2. **Plan.** It writes three to seven sub-questions. The plan is shown to the user, who can edit it.
3. **Fan out.** One searcher starts per sub-question, all at once. In LangGraph this is a dynamic fan-out: the supervisor sends one message per sub-question and the graph runs them in parallel.
4. **Search and read.** A searcher runs a query, picks results, and asks the fetcher for pages. It may refine and search again, within a budget of four searches and six pages.
5. **Store.** Each page is saved with its address, its text, a hash of the text and the time it was fetched. The text is split into passages of about 200 words.
6. **Findings.** A searcher does not return prose. It returns findings: a short claim, and the number of the passage that supports it.
7. **Write.** The writer gets the question, the plan, and the findings with their passages. It writes the report section by section. Every sentence that states a fact ends with a passage number.
8. **Check.** For each such sentence, the checker sees only the sentence and the passage. It answers supported, partly supported or not supported, and gives a reason.
9. **Repair.** Sentences that fail go back to the writer, which must rewrite them to match the passage or drop them. This happens twice at most.
10. **Release.** The report is published with inline citations. Anything dropped appears in a section called Could not confirm.

## The state that moves through the graph

| Object  | Fields                                             |
| ------- | -------------------------------------------------- |
| Plan    | question, sub-questions                            |
| Finding | claim, passage id, address                         |
| Section | heading, and sentences that each carry passage ids |
| Verdict | sentence, passage id, supported or not, reason     |

Each node receives and returns these typed objects. A node that returns anything else fails loudly.

## What it keeps

| Table    | Fields                                                        |
| -------- | ------------------------------------------------------------- |
| runs     | question, plan, status, cost, started, finished               |
| pages    | address, text hash, text, fetched at, published date if found |
| passages | page, order, text                                             |
| claims   | run, sentence, passage, verdict, reason                       |

## Decisions, and what I turned down

- **Write from stored passages, never from memory.** The writer cites by passage number, and the numbers come from the store. It cannot cite something that was never fetched.
- **Searchers return findings, not summaries.** A summary invites the next step to trust it. A finding is tied to a passage from the start.
- **A separate checker.** The writer should not grade its own work. The checker sees one sentence and one passage and nothing else, so the rest of the report cannot talk it round.
- **Keep what was read.** A stored page can be checked again next month, after the live page has changed or gone.
- **A budget per searcher.** Unlimited searching makes a slow, expensive run that is not noticeably better.
- **I turned down one long-running agent.** A single agent that searches, reads and writes in one context loses track of which fact came from where.

## When things go wrong

| What happens                                    | What the run does                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A page cannot be fetched                        | Records it as unavailable and moves on                                                      |
| A page needs a login or payment                 | Skips it and lists it as not read                                                           |
| Two sources disagree                            | The report says so and cites both                                                           |
| A page contains instructions aimed at the agent | Page text is data. A searcher can only search and fetch, so the text has nothing to trigger |
| The checker rejects a sentence twice            | The sentence is dropped and listed under Could not confirm                                  |
| The budget runs out                             | The report is written from what was found, and says what was not covered                    |

## Cost and time

Most of the cost is the checker, because it runs once per sentence. It uses a small model, since its job is narrow. A run is capped by the number of sub-questions, searches, pages and repair rounds.
