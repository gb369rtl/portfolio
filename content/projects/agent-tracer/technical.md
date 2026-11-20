## A traced run, step by step

1. **Start.** The code enters a run block with a budget, for example two dollars, 30 steps and five minutes. A root span opens for the whole run.
2. **Model call.** The decorated model function is called. Before it runs, the guard checks the totals. Then a span opens, the call is made, and on return the span records the model name, tokens in, tokens out, the time taken and the cost.
3. **Tool call.** The decorated tool runs inside its own span, with the tool name and the call id. The arguments and the result are attached after masking.
4. **State.** If the agent exposes its state, a short record of what changed is attached to the span.
5. **Total.** The cost of the call is added to the run's total. The step counter goes up.
6. **Guard.** Before the next model call the guard looks again. It also checks whether the same tool has been called with the same arguments several times in a row.
7. **At a limit.** The guard does what the budget says: raise a stop that the agent loop turns into a final answer, swap the model for a cheaper one for the rest of the run, or pause for a person.
8. **Export.** Spans leave in batches, off the main path. If the backend cannot be reached, they queue on disk.
9. **End.** The root span closes with the totals and the reason the run ended.

## How it looks in code

```
with tracer.run("support-agent", budget=Budget(usd=2.00, steps=30, on_limit="downgrade")):
    answer = agent.handle(question)

@traced_model
def call_model(messages, model): ...

@traced_tool
def lookup_order(order_id): ...
```

## What a span carries

| Span           | Fields                                                                                  |
| -------------- | --------------------------------------------------------------------------------------- |
| The run        | agent name, run id, total tokens, total cost, steps, how it ended                       |
| A model call   | operation chat, model requested, input tokens, output tokens, latency, cost             |
| A tool call    | operation execute_tool, tool name, call id, arguments and result after masking, latency |
| A guard action | which limit, the total that triggered it, the action taken                              |

The field names follow OpenTelemetry's conventions for generative AI, such as gen_ai.usage.input_tokens and gen_ai.tool.name. The parts of those conventions that cover agents are still marked as in development, so all the names live in one module that can be updated in one place.

## Where cost comes from

A versioned price table holds, per model, the price of input, output and cached tokens. Cost is tokens multiplied by price, worked out when the call returns. The table is a file in the repository, so a price change is a reviewed change.

## Decisions, and what I turned down

- **OpenTelemetry, not a private format.** Teams already run a backend for it, and the same traces can go to more than one place.
- **Cost on the span.** A slow or expensive step is visible without joining tables afterward.
- **The guard sits in the loop, not in a dashboard.** A dashboard finds a runaway run tomorrow. The guard stops it now.
- **Check before the call, not after.** The prompt size is known before a call is made, so a call that would cross the limit is never sent.
- **State before and after.** Without it, a trace shows that something happened but not what changed.
- **I turned down patching model libraries automatically.** It is convenient, and it breaks whenever a library changes. Two explicit decorators are less magic and easier to trust.

## When things go wrong

| What happens                            | What the library does                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| The backend is unreachable              | Spans queue on disk and are sent later. The agent is not slowed                |
| A model is missing from the price table | Records tokens, marks the cost unknown, and counts the step                    |
| A field holds private data              | A mask runs before export. Content can be dropped entirely, keeping only sizes |
| The guard stops a run                   | The stop is itself a span, so the trace shows why the run ended                |

## Overhead

Opening and closing a span is in-memory work. Export happens on a background thread in batches. The target is well under a millisecond added per call.
