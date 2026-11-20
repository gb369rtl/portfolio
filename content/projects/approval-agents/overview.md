## What it is

A production agent system for a procurement team. Vendors answer approval requests by email, usually with shop drawings, samples or certificates attached. The system reads each message, works out which approval record it belongs to, proposes what to do with it, and puts that proposal in front of a coordinator. Nothing is written to the system of record until a person approves it.

## What it covers

- Mail from Gmail, Microsoft 365 and plain IMAP mailboxes, stored encrypted
- An eight-phase pipeline: triage, context assembly, vision read, comprehension, approval matching, action planning, verify, human commit
- 43 read-only tools over MCP that the agent uses to look things up
- A review desk where a coordinator approves, corrects, re-runs or discards each proposal
- Model providers that can be switched at run time from an admin panel, with a cost ledger
- A trace for every run and a nightly replay of real cases

## In numbers

- 8 phases, 43 tools, 22 versioned prompts
- 25 projects in one Nx workspace: 4 apps and 20 libraries
- 141 database migrations
- 2,272 test files
- 10 services in the deployment

## Where it stands

In production at Wisflux, and I am its main author. The source is private and the client is not named here.
