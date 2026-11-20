## What each part does

- **Split and embed.** Parses each document, splits it at headings and by size, and embeds each passage with its title and section.
- **Postgres with pgvector.** One table of passages, with a vector index and a full-text index.
- **Hybrid search.** Two searches, merged by rank, then re-ranked by a cross-encoder.
- **Answerer.** Writes sentences that each carry a quote and a passage, or refuses.
- **Quote check.** Code that confirms each quote is in its passage.
- **Question set and scorer.** The fixed questions, and the numbers computed from them.
- **CI check.** Compares the numbers with the main branch and fails the build on a drop.

## What crosses each arrow

- **Store to search.** The 30 nearest passages by meaning and the 30 best by words.
- **Search to answerer.** The top six passages after re-ranking.
- **Answerer to scorer.** The answer, its quotes, and the passages it was given.
- **Scorer to CI.** Six numbers, and whether each is within its threshold.
