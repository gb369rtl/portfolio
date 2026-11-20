## The problem

A company puts its policies behind a chat box. An employee asks how much notice they must give, and gets a confident answer taken from the wrong policy. Nobody finds out, because nothing shows where the answer came from, and nothing was measuring the system after the day it launched.

## Who it is for

Teams with a manual, a set of policies or a knowledge base that people ask questions about, and the engineers who have to keep the answers good.

## How someone uses it

A person asks a question and gets a short answer. Under each sentence is the exact line it came from, with the document and the section. If the documents do not cover the question, they are told that plainly. An engineer who changes the system opens a pull request and sees six numbers move, before anything reaches a user.

## In scope

- Text documents
- Answers with quotes
- The scored question set and the CI check

## Left out on purpose

- Tables and images inside documents
- Answers that need reasoning across several documents
- Remembering earlier turns of a conversation

## How success is judged

- Recall and faithfulness on the question set
- Correct refusals
- The share of answers a reader accepts without opening the source

## Risks

| Risk                                                    | What stands in the way                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A question set that is too easy                         | It includes questions with no answer and questions that turn on an exact term |
| An answer that sounds right and is not in the documents | The quote check, and the faithfulness score                                   |
| Scores that drift without anyone noticing               | The CI check on every change                                                  |
| Out-of-date documents                                   | Re-indexing by content hash                                                   |

## What already exists

Every platform offers question answering over documents. What this build adds is the discipline around it: quotes that are verified in code, and a score that every change has to pass.
