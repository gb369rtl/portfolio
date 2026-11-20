## The problem

An analyst asks a model for a summary of a technical question and gets two confident pages. Three of the links are dead ends, and one sentence says the opposite of its source. Finding that out took longer than doing the research.

## Who it is for

Analysts and engineers who need a first draft they can verify quickly.

## How someone uses it

They type a question. A plan appears and they adjust it. They watch the searchers work and the list of sources grow. A few minutes later they have a report. Clicking a citation opens the exact passage, highlighted, with the date it was fetched. At the end there is a short list of things the agent looked for and could not confirm.

## In scope

- Public web pages
- A report with inline citations
- A list of what could not be confirmed

## Left out on purpose

- Paywalled sources and anything that needs a login
- Giving an opinion. The report states what the sources say.

## How success is judged

- Citation precision and coverage on the question set
- Whether a reader accepts a sentence after reading only its passage
- Time and cost per report

## Risks

| Risk                                   | What stands in the way                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| A sentence the source does not support | The checker, the repair loop, and my manual audit                                       |
| A source that is itself wrong          | The report shows where each claim came from, so the reader can weigh it                 |
| An old page presented as current       | Every passage carries the date it was fetched, and the published date when one is found |
| Instructions hidden in a page          | Searchers have no tools beyond search and fetch                                         |

## What already exists

The large assistants each have a research mode, and LangChain publishes an open one. What this build adds is that checking is a first-class step, and that everything read is kept, so any claim can be audited later.
