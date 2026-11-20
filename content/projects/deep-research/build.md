## Build order

| Stage | What I build                            | It is done when                                         |
| ----- | --------------------------------------- | ------------------------------------------------------- |
| 1     | The fetcher and the store               | A list of addresses becomes stored pages and passages   |
| 2     | One searcher                            | A sub-question returns findings tied to passages        |
| 3     | The writer, limited to passage numbers  | Every citation in a report resolves to a stored passage |
| 4     | The supervisor and the parallel fan-out | One question runs five searchers at once                |
| 5     | The checker and the repair loop         | False sentences I plant are caught and removed          |
| 6     | The API and the report page             | A citation can be clicked to show its passage           |
| 7     | The question set and the score          | The numbers below are published                         |

## How it is measured

A fixed set of 40 questions. Half come from public multi-step question sets with known answers. Half I write myself, in areas where I can judge the answer.

| Number             | How it is counted                                                       |
| ------------------ | ----------------------------------------------------------------------- |
| Citation precision | Of the sentences with a citation, the share the passage really supports |
| Citation coverage  | Of the sentences that state a fact, the share that carry a citation     |
| Answer correctness | Whether the report reaches the known answer                             |
| Cost and time      | Per report                                                              |

The checker cannot be the only judge of the checker. So in every scored run I read a fifth of the sentences against their passages myself, and report how often my reading and the checker's agree.

## After the first version

- Sources beyond the open web, such as a folder of PDFs
- A follow-up question that reuses what was already read

## Reading behind this design

- [Open Deep Research](https://github.com/langchain-ai/open_deep_research): a public reference for the scope, research, write shape
