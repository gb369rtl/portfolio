## What it is

A small library that traces an agent and keeps it inside a budget. Every model call and every tool call becomes a span with its tokens, time and cost. A guard adds the cost up while the run is still going, and stops the run or moves it to a cheaper model when it passes its limit.

## The problem

When an agent gives a bad answer, the question is which of its fifteen steps went wrong, and logs do not say. When an agent gets stuck in a loop, the first sign is usually the bill the next morning.

## How it works, in short

Two decorators, one for model calls and one for tools, and a block that marks where a run starts and ends. Inside that block every call opens a span. The spans use the OpenTelemetry names for generative AI, so any backend that understands those can show them. A running total of cost is kept for the run. Before each model call the guard compares that total, and the number of steps, with the limits. Past a limit, it acts.

## What it covers

- One trace per run, with a span for every model call and tool call
- Tokens in and out, latency and cost on each span
- The agent's state before and after each step
- Limits on cost, tokens, steps and time, and detection of repeated calls
- Three actions at a limit: stop, switch to a cheaper model, or ask a person
- Export to any OpenTelemetry backend, with Langfuse as the first
- Masking of private fields before anything is exported
- A command-line view and a timeline page for one run

## At a glance

|           |                                                                |
| --------- | -------------------------------------------------------------- |
| Input     | Any Python agent                                               |
| Output    | A trace per run, and a run that cannot exceed its budget       |
| Stack     | Python, OpenTelemetry, Langfuse, FastAPI                       |
| Judged by | Overhead per call, and every runaway test stopped at its limit |

## Where it stands

Designed end to end. It generalizes the tracing and the cost ledger I run for the approvals system at work.
