## Indexing, step by step

1. **Parse.** A document is read into plain text with its headings kept.
2. **Split.** It is split first at headings, then by size, into passages of about 350 tokens with a small overlap.
3. **Label.** Each passage keeps the document title and its section path, for example Leave policy > Sick leave.
4. **Embed.** The title, the section path and the text are embedded together, so a passage knows where it sits.
5. **Store.** The passage goes into PostgreSQL with its vector and a searchable text column.

## A question, step by step

1. **Search by meaning.** The question is embedded, and the 30 nearest passages are fetched.
2. **Search by words.** The same question runs as a full-text query, and the 30 best matches are fetched.
3. **Merge.** The two lists are combined with reciprocal rank fusion: each passage scores one divided by 60 plus its rank, summed over the lists it appears in.
4. **Re-rank.** A cross-encoder reads the question against each of the top 20 and re-orders them.
5. **Answer.** The top six go to the answerer. It returns sentences, each with a quote and a passage id, or it returns that the passages do not answer the question.
6. **Verify the quotes.** Code checks that each quote appears in the passage it names. A sentence whose quote is not found is removed.
7. **Reply.** The answer is shown with its quotes, and each quote links to the document and section.

## The table that holds the index

```
create table chunks (
  id            bigserial primary key,
  document_id   bigint references documents(id),
  section_path  text,
  body          text,
  embedding     vector(1024),
  tsv           tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(section_path, '')), 'A') ||
                  to_tsvector('english', body)
                ) stored
);
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks using gin (tsv);
```

## What the answerer returns

```
{
  "answerable": true,
  "sentences": [
    { "text": "Sick leave beyond three days needs a doctor's note.",
      "quote": "a medical certificate is required for absences of more than three days",
      "chunk_id": 4812 }
  ]
}
```

## Decisions, and what I turned down

- **One database.** Vectors and text search both live in PostgreSQL. There is one thing to run, back up and keep consistent.
- **Search both ways.** Meaning finds a paraphrase. Exact words find a part number, an error code or a name, which vectors often miss.
- **Merge by rank, not by score.** The two searches score on different scales. Ranks can be combined without tuning.
- **Quotes, checked in code.** A model can be asked to cite and still invent. Whether a quote is in a passage is a string comparison, so that part is not left to a model.
- **Refusal is a first-class answer.** A system that always answers will sometimes answer from nothing.
- **Scores gate changes.** A new passage size or a new prompt has to prove itself on the question set before it merges.
- **I turned down a separate vector database.** It would be another system to run, for a document set of this size.

## When things go wrong

| What happens                  | What the system does                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Nothing relevant is found     | Answers that the documents do not cover it                                                       |
| A quote is not in its passage | Drops that sentence. If none are left, it refuses                                                |
| A document fails to parse     | Lists it as not indexed                                                                          |
| A document changes            | Its passages are replaced, tracked by a hash of the content                                      |
| The text is not in English    | The word search uses a plain configuration, and the search by meaning carries more of the weight |
