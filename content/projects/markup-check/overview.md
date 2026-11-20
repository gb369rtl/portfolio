## What it is

A vision pipeline for engineering drawings. A reviewer marks up a PDF with clouds, arrows and notes. Later a revised PDF arrives. The pipeline finds each markup, finds the same page in the revision, and reports whether the comment was dealt with.

## What it covers

- Separating the reviewer's ink from the drawing underneath
- Detecting the markups and reading their text
- Matching pages between revisions, including pages that moved, split, merged, were added or were removed
- A vision model that judges each comment against the revised page
- A review app with live progress, where a person accepts or rejects each verdict

## In numbers

- 3 PDFs per job: the original, the marked-up copy, and the revision
- 4 kinds of markup detected
- About 5,100 synthetic training pages
- 4 possible verdicts: addressed, partly addressed, not addressed, cannot verify

## Where it stands

Built at Wisflux. The pipeline and the review app run end to end. Automated tests and resuming a stopped job are not done yet. The source is private.
