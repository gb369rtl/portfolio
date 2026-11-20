## The problem

A caller wants to know where an order is. The bot answers after a long pause, starts reading out a policy, and cannot be stopped. The caller gives up and asks for a person, which is what the bot was meant to prevent.

## Who it is for

Support teams with simple, repeated calls: order status, booking changes, account questions.

## How someone uses it

A caller asks where their order is and gives a number. The agent repeats the number back, looks it up, and answers within about a second and a half. Half way through the answer the caller says the number was wrong. The agent stops at once and takes the new number. If the question is beyond it, it says so and passes the call to a person with a short summary.

## In scope

- One language to begin with
- Lookups through tools
- A hand-off to a person

## Left out on purpose

- Taking payments by voice
- Outbound calls

## How success is judged

- Time to first audio, and how fast it stops when interrupted
- The share of calls finished without a hand-off
- Wrong numbers acted on, which should be none

## Risks

| Risk                                | What stands in the way                                          |
| ----------------------------------- | --------------------------------------------------------------- |
| Mishearing a number or a name       | Read-back before any action                                     |
| The agent interrupting itself       | Echo cancellation, and a minimum length for an interruption     |
| Cutting the caller off mid-sentence | End-of-turn detection that reads the text, not only the silence |
| A slow answer                       | A budget for each stage, measured on every call                 |

## What already exists

Pipecat and LiveKit Agents are open frameworks for this, and there are hosted platforms. This build goes without them on purpose, so that each stage's delay is something I measured and can explain.
