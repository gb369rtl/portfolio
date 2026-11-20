## How it works, end to end

1. The user types or speaks. Speech goes through faster-whisper first. Only English is accepted by voice, because spoken Hindi numbers were recognized too rarely to trust.
2. A planner picks the next fields to ask about from the form's definition. This is ordinary code.
3. One model call reads the user's answer and phrases the next question. A grammar forces its output into a schema, and a value is accepted only if it appears in the user's own words.
4. The proposed values go to the rule engine, which validates them exactly as the form page would and works out the derived fields.
5. When the form is complete, the agent reads it back. That turn uses no model at all.
6. The user confirms and presses Submit. The form then follows the product's normal approval route, as that user.

## The parts

- **Speech service** (FastAPI): faster-whisper on the GPU, Piper on the CPU
- **Conversation service** (FastAPI): the planner, the single model call, session state
- **Rule engine**: a small JSON-logic evaluator with versioned rule sets that an administrator edits and can dry-run before publishing
- **Model**: Qwen 4B, quantized, served by llama.cpp with a 4,096-token context
- **Form packages**: typed ingest of a form definition, the planner, the model turn, the speech policy, and evals generated from the form itself
- **Chat page** (React) inside the client's product: messages, a form panel with progress, history, and a live voice view

## Decisions that mattered

- **The model decides nothing.** It proposes values. Code decides what is valid, what is complete, and how many approvals an amount needs.
- **One model call per turn.** The first version made three in a row and took 16.9 seconds a turn. Reading the answer and phrasing the question in a single call brought that to about 2 seconds.
- **Out of the graph.** The first version was a 13-node LangGraph. Once the rules were the authority, a plain planner was simpler and easier to test.
- **Forms as data.** A form is read at run time against an allow-list of 81 attributes. A form the system cannot handle is refused by name, not half-supported.
- **Voice assists, it does not submit.** In my tests, speech got account-style identifiers right 62% of the time and silently wrong 23%. So a spoken value is always shown on screen and confirmed there.

## Testing and limits

- Evals drive the real API and compare the finished form field by field. No model grades another model.
- The last recorded run got 63 of 64 conversations right and staged no wrong value. It still fails my own gate, because one category sits at 88.9% against a 90% floor.
- Mutation testing uses a harness I built on Cosmic Ray: 454 of 454 targeted mutations were caught.
- Timings are from a 6 GB laptop card, and the voice figures come from synthesized speech, not real callers.
