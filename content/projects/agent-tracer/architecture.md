## What each part does

- **Tracing wrapper.** The two decorators and the run block. It opens and closes spans and keeps the run's totals.
- **Budget guard.** Holds the limits and the action to take. It is asked before every model call.
- **Exporter.** Sends spans in batches over OpenTelemetry, and queues them on disk when the backend is away.
- **Trace backend.** Langfuse to begin with. Anything that accepts OpenTelemetry works.
- **Replay and timeline.** A command-line view and a small page that show one run step by step.

## What crosses each arrow

- **Wrapper to guard.** The cost and step count so far, and the size of the call about to be made.
- **Guard to run.** Carry on, stop, or switch model.
- **Wrapper to exporter.** Finished spans, already masked.
