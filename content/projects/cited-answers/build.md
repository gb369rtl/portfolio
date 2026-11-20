## Build order

| Stage | What I build                     | It is done when                                           |
| ----- | -------------------------------- | --------------------------------------------------------- |
| 1     | Parsing, splitting and the table | A folder of documents becomes passages with section paths |
| 2     | Search by meaning                | A question returns sensible passages                      |
| 3     | Search by words, and the merge   | A part number that the first search missed is now found   |
| 4     | The answerer and the quote check | A sentence with an invented quote is removed              |
| 5     | The question set                 | 60 questions with their right passages are written down   |
| 6     | Scoring, and the CI check        | A deliberately bad change fails the build                 |
| 7     | Re-ranking, measured             | The table shows what it adds and what it costs            |

## How it is measured

A set of 60 questions, written against the documents.

- 40 that the documents answer, each with the passages that hold the answer
- 10 that the documents do not answer
- 10 that turn on an exact term, such as a code or a name

| Number             | What it shows                                          | How it is counted                         |
| ------------------ | ------------------------------------------------------ | ----------------------------------------- |
| Recall at 6        | Whether the right passage reached the answerer         | Plain counting against the known passages |
| Context precision  | Whether the useful passages rank near the top          | Ragas                                     |
| Faithfulness       | Whether the answer says only what the passages say     | Ragas                                     |
| Response relevancy | Whether the answer addresses the question              | Ragas                                     |
| Correct refusals   | How many of the 10 unanswerable questions were refused | Plain counting                            |
| Quote validity     | Whether every quote is in its passage                  | Always, because the code enforces it      |

In CI the set runs on every pull request that touches indexing, search or prompts. The build fails if recall or faithfulness drops by more than two points against the main branch, or if fewer than nine of the ten unanswerable questions are refused. The scores are posted on the pull request as a table.

## The experiments this makes cheap

Passage size. How many passages to send. Word search on or off. Re-ranking on or off. Each is one pull request and one row in a table.

## After the first version

- Tables and images inside documents
- Questions that need several documents put together

## Reading behind this design

- [Hybrid search in Postgres](https://supabase.com/docs/guides/ai/hybrid-search): full-text search and pgvector merged by rank
- [Ragas](https://docs.ragas.io): the metrics
