## What it is

A research agent that answers a hard question with a written report in which every sentence of findings points to the passage it came from. A second agent checks each sentence against that passage before the report is released.

## The problem

Model-written research reads well and cites badly. A link is missing, or it is there but the page does not say what the sentence claims. The reader has no fast way to tell a supported sentence from an invented one, so the whole report has to be checked again by hand.

## How it works, in short

A supervisor breaks the question into sub-questions. Searchers work on them in parallel: they search, open pages and save what they read. Nothing reaches the writer except saved passages. The writer builds the report from those passages and attaches one to each claim. A checker then reads every claim next to its passage and sends the unsupported ones back. The report comes out with its sources, and with a list of what could not be confirmed.

## What it covers

- A plan the user can see and change before the search starts
- Parallel searchers, each with a budget
- Every page that was read, stored with its text and the time it was fetched
- Writing from stored passages only
- A separate checker for every claim
- A report with inline citations, where each one opens the exact passage
- A citation accuracy measured on a fixed question set

## At a glance

|           |                                                                     |
| --------- | ------------------------------------------------------------------- |
| Input     | One question                                                        |
| Output    | A cited report, plus what could not be confirmed                    |
| Stack     | Python, LangGraph, FastAPI, PostgreSQL                              |
| Judged by | The share of cited sentences that the cited passage really supports |

## Where it stands

Designed end to end. It is the second of the three I am building.
