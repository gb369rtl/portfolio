## How it works, end to end

1. **Upload.** The three PDFs go through the API into object storage, and a job record is created.
2. **Isolate the ink.** Pages are rendered at 300 DPI. The marked-up page is aligned to the original with feature matching, and the difference between the two leaves only what the reviewer drew.
3. **Detect.** A YOLO detector finds four kinds of markup: text notes, callout boxes, the content a markup points at, and highlights.
4. **Read.** PaddleOCR reads the text in each box. A box with new text is a comment; one without is a target.
5. **Describe.** GPT-4o turns each comment into a structured item: the action asked for, its scope, and the targets it refers to.
6. **Match pages.** Each page gets a fingerprint made from its text, its layout, a perceptual hash, an embedding and the drawing numbers found on it. Pages of the original are assigned to pages of the revision with the Hungarian algorithm.
7. **Check.** For each marked-up page, one GPT-4o call sees the comments, the marked-up image and up to three matching pages of the revision, and returns a verdict per comment with a confidence.
8. **Review.** The app shows each comment beside the revised page, and a person accepts or rejects the verdict.

## The parts

- **Review app** (React, TanStack Query)
- **API** (NestJS, Prisma, PostgreSQL), with object storage for the files
- **Vision service** (FastAPI): rendering, alignment, detection, OCR, matching and the model calls
- **Detector**: YOLO12x trained at 1,280 pixels on synthetic pages
- **Progress**: the vision service reports to the API, which streams events to the browser over SSE

## Decisions that mattered

- **Match the original to the revision, not the marked-up copy.** The reviewer's ink changes how a page looks and would throw the matching off. The marked-up page is used only for the final check.
- **Matching that knows about title blocks.** Sheets share a border and a title block, so headers and footers are left out and what all pages have in common is subtracted before comparing.
- **Synthetic training data.** Real marked-up drawings were few, so I generated pages with drawn markups and trained on those.
- **SSE for progress.** A long job only needs to send updates one way.
- **Rendering in a process pool**, so page rendering does not stall the model work.

## Training

The detector was trained on a SLURM GPU cluster in a container, on one GPU. I wrote the scripts that build the image and submit the job.

## Limits today

- The verdict is the vision model's judgment. There is no rule-based second check.
- Accuracy figures for the four-class detector were not recorded. An earlier arrow-detection experiment reached 0.955 mAP50.
- There are no automated tests.
