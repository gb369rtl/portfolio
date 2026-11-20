## The problem

An engineer is asked why one run of an agent cost forty times the usual amount. The logs show a thousand lines. There is no view that says: step 9 called the same search eleven times.

## Who it is for

Engineers who run agents in production and have to answer for what a run did and what it cost.

## How someone uses it

They add two decorators and wrap the entry point in a run block with a budget. From then on every run has a timeline they can open: each step, how long it took, what it cost, and what changed. And no single run can spend more than its limit, whatever the model decides to do.

## In scope

- Tracing, with cost on every step
- The budget guard
- Reading a run back from its trace

## Left out on purpose

- Scoring whether an answer was good
- Managing prompts

## How success is judged

- The time from a bad run to the step that caused it
- The number of runs that pass their budget, which should be none
- Overhead small enough that tracing is never switched off

## Risks

| Risk                                          | What stands in the way                                             |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Traces that hold private data                 | Masking before export, and a mode that records sizes only          |
| The guard stopping a run that was nearly done | The downgrade action, and a limit that can be set per kind of task |
| Conventions that are still changing           | Every field name is in one module                                  |

## What already exists

Langfuse, LangSmith and others collect traces well. What this adds is small and specific: the cost total lives inside the running agent, so the limit is enforced there, and the spans are plain OpenTelemetry, so they are not tied to one vendor.
