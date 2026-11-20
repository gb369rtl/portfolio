## Build order

| Stage | What I build                                | It is done when                                    |
| ----- | ------------------------------------------- | -------------------------------------------------- |
| 1     | The two decorators and the run block        | A sample agent produces a nested trace in memory   |
| 2     | The span fields and the price table         | Each model span shows tokens and cost              |
| 3     | Export over OpenTelemetry                   | The same run appears in Langfuse                   |
| 4     | The budget guard                            | A looping agent is stopped at its limit            |
| 5     | Masking and the offline queue               | A run with the backend switched off loses no spans |
| 6     | The command-line view and the timeline page | One run can be read step by step                   |
| 7     | The measurements                            | The table below is published                       |

## How it is measured

| Test          | What counts as passing                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Overhead      | Ten thousand traced calls against the same calls untraced, reported per call                                            |
| Runaway runs  | Ten scripted failures, such as a tool loop or a context that keeps growing. Each must stop within one call of its limit |
| Cost accuracy | The ledger total against the provider's own usage figures for the same period                                           |
| Lost spans    | None, with the backend switched off and on during a run                                                                 |

## After the first version

- Writing a run out in the format Trajectory Gate replays, so a production trace can become a test case
- Budgets per customer or per day, not only per run

## Reading behind this design

- [OpenTelemetry conventions for generative AI](https://opentelemetry.io/docs/specs/semconv/gen-ai/): the span and field names
