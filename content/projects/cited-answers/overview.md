## What it is

Question answering over a set of documents, where every answer quotes the lines it rests on, and where the quality of the search is measured on every change and never assumed.

## The problem

Teams build a system that answers questions from their documents, try ten questions by hand, and ship it. Then someone changes how the documents are split, or swaps a model, and nobody knows whether answers got better or worse. Meanwhile the system sometimes answers confidently from a passage that does not say that.

## How it works, in short

Documents are split into passages and stored in PostgreSQL, both as vectors and as searchable text. A question is searched both ways, and the two result lists are merged and re-ranked. The answerer may use only the top passages, must quote the lines it used, and must say when the documents do not hold the answer. Each quote is then checked in code against the passage. A fixed set of questions runs through the same path in CI, and a change that lowers the scores fails the build.

## What it covers

- Splitting documents by their headings, keeping the title and section on every passage
- Search by meaning and by exact words, merged into one ranking
- A re-ranking step
- Answers in which every sentence carries a quote and a passage
- A code check that each quote really appears in its passage
- Saying so when the documents do not cover a question
- Scores for retrieval and for faithfulness on a fixed question set
- A CI check with thresholds

## At a glance

|           |                                                                                |
| --------- | ------------------------------------------------------------------------------ |
| Input     | A question, and a set of documents                                             |
| Output    | An answer with quotes, or a plain statement that the documents do not cover it |
| Stack     | Python, PostgreSQL with pgvector, FastAPI, Ragas, GitHub Actions               |
| Judged by | Recall of the right passage, faithfulness of the answer, and correct refusals  |

## Where it stands

Designed end to end.
