## How it works, end to end

1. **Ingest.** The mail service receives a message through the Gmail API, Microsoft Graph or IMAP. The body and the attachments are encrypted with AES-256-GCM and put in object storage. The mail row and its event are saved in one database transaction, and a publisher moves the event to Redis Streams about once a second.
2. **Queue.** Workers read the stream as a consumer group. A message gets three attempts, then goes to a dead-letter stream. Messages a crashed worker left behind are reclaimed, and a lock stops one message being processed twice.
3. **Triage.** Fixed rules drop bulk and machine mail. No model is involved.
4. **Context assembly.** Loads the thread, works out who the sender is, and builds a bounded working set. No model here either.
5. **Vision read.** A vision model reads the images and PDFs. Results are cached by content hash, so the same drawing is never read twice.
6. **Comprehension.** One reasoning call, checked against a Zod schema. A reply that does not fit is retried.
7. **Approval matching.** The agent searches for the right record through the read-only tools, widening the search in four steps. Code then checks the match against a confidence threshold.
8. **Action planning.** Builds the proposal. Nothing is written.
9. **Verify.** A critic, part rules and part model, tries to refute the proposal. If it cannot decide, the proposal is held.
10. **Human commit.** The run pauses. A coordinator approves, and only then one handler writes the change, once, under that coordinator's name.

## The parts

- **Mail service** (NestJS): ingestion, OAuth2, encryption, the outbox
- **Pipeline workers** (NestJS): the eight phases, with one transaction and one checkpoint per phase and a time limit on each
- **Agent runtime**: an open-source agent CLI run as a sidecar with a process pool
- **Tool server** (MCP): 43 tools on 4 routes, all read-only
- **Review desk** (React 19, TanStack Query, Zustand)
- **Text and OCR worker** (Python)
- **PostgreSQL 16, Redis 7 and object storage**, behind nginx

## Decisions that mattered

- **The model never writes.** Every tool is read-only. Writes happen in ordinary code, through one handler, after approval.
- **Each phase sees only its own tools.** There is one catalog and a scope table per phase. If the catalog and the server disagree, the server refuses to start.
- **Confidence is graded in code.** 0.85 and above passes, 0.70 and above warns, anything lower blocks. A missing score blocks.
- **An unknown stays unknown.** A missing value is never filled with something a real answer could have produced.
- **Fixed phases with narrow jobs.** Each phase does one thing and has its own checks, so a failure is easy to locate.
- **Outbox plus streams.** Saving the mail and its event together removes a whole class of lost-message bugs.
- **A guard counts only after it has been seen to fail** for the right reason.

## Testing and tracing

- 2,272 Jest test files, 45 of them integration tests
- A replay harness runs a real email against a captured slice of the records it read. The slice answered 983 of 983 reads the same way as the live system.
- Every night: a model replay with repeats and confidence intervals, and a model-free check that the tools still answer the same
- Prompts are versioned in code and pinned in the image. CI fails if the deployed prompt differs.
- Every run is traced with Langfuse and OpenTelemetry. Token cost is kept in a ledger and reconciled against the traces.
- CI runs lint, tests and build on the changed projects. A second pipeline builds the images and deploys them to two environments.
