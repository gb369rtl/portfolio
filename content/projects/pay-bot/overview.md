## What it is

A conversational agent for payment forms. A user types or speaks a request, such as paying a supplier a given amount. The agent pulls out the details, asks for what is missing, checks every field the way the form itself would, reads the result back, and leaves a completed form for a person to submit. It runs on a 4-billion-parameter model on a 6 GB graphics card, with no cloud model.

## What it covers

- Typed requests in English, Hindi, or a mix of the two
- Spoken requests in English, with spoken replies
- Any form an administrator builds, with no new code
- A rule engine that decides what is valid, while the model only proposes values
- A read-back and an explicit confirmation before anything is submitted
- Evals that drive the real API, and mutation testing of the code under them

## In numbers

- Median turn: 16.9 seconds in the first version, about 2 seconds after the rewrite
- 65 fields in the reference form
- 454 of 454 targeted mutations caught by the tests
- Last recorded eval run: 63 of 64 conversations correct, with no wrong value staged

## Where it stands

Freelance client work, in two generations. The first was a stand-alone chat service built on LangGraph. The second is built into the client's own product and verified there in Docker. The client is not named and the source is private.
