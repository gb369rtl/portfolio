## A turn, step by step

1. **Capture.** The browser records the microphone with echo cancellation on and sends small audio frames over a WebSocket.
2. **Voice detection.** On the server, a voice detector (Silero VAD) marks each frame as speech or not.
3. **Partial transcript.** While the caller speaks, speech-to-text (faster-whisper) runs on the audio so far, a few times a second. Text that stays the same across two passes is treated as settled.
4. **End of turn.** The turn ends when there has been enough silence and the text so far reads as finished. A trailing "and" or "so" earns a longer wait.
5. **Agent.** The agent receives the turn. It may call a tool. It begins to stream its answer as text.
6. **Slow tools.** If a lookup is taking long, the agent says a short holding line, so the caller is not left in silence.
7. **Speech.** As soon as a sentence is complete, text-to-speech (Piper) turns it into audio, and the audio is streamed back in numbered chunks.
8. **Playback.** The browser plays the chunks and tells the server which ones have been played.
9. **Interruption.** If the voice detector hears the caller for long enough during playback, the server tells the browser to stop, cancels the speech and the model's remaining output, and starts a new turn.
10. **Memory.** The conversation history keeps only the sentences whose audio was played. What was cut off is forgotten.

## The time budget for one answer

| Stage                                    | Target                |
| ---------------------------------------- | --------------------- |
| Silence needed to end a turn             | 500 to 700 ms         |
| Final transcript after the end of speech | 150 to 200 ms         |
| First words from the model               | 300 to 400 ms         |
| First sentence complete                  | 200 ms                |
| First audio from text-to-speech          | 150 ms                |
| Network, both ways                       | 50 ms                 |
| **End of speech to first audio**         | **under 1.5 seconds** |
| **Interruption to silence**              | **under 300 ms**      |

For comparison: in my Pay Bot measurements the same speech stack reached first audio in 1.98 seconds on a 6 GB laptop card, and a 2026 benchmark of hosted voice platforms reported medians between 1.7 and 3.2 seconds a turn. Under 1.5 seconds is an honest target, not a promise.

## The tools the agent has

| Tool            | What it does                               |
| --------------- | ------------------------------------------ |
| lookup_order    | Order status by number                     |
| find_booking    | A booking by name and date                 |
| search_articles | Help articles for a question               |
| transfer        | Hands the call to a person, with a summary |

## What it keeps

| Table      | Fields                                               |
| ---------- | ---------------------------------------------------- |
| calls      | started, ended, how it ended                         |
| turns      | caller text, agent text, which sentences were played |
| timings    | one row per stage per turn, in milliseconds          |
| tool calls | tool, arguments, result, milliseconds                |

## Decisions, and what I turned down

- **Stream every stage.** Waiting for a whole transcript and then a whole answer makes a call feel dead.
- **Speak by the sentence.** A sentence is the smallest unit that still sounds natural, and it is easy to cancel.
- **Echo cancellation is required.** Without it the agent hears its own voice from the speaker and interrupts itself.
- **A stricter test for interruptions.** A cough should not stop the agent. Speech has to last about 200 ms before it counts, which costs a little speed and removes most false stops.
- **Remember only what was heard.** If the history kept the whole answer it meant to give, the agent would refer to things the caller never heard.
- **Read back numbers.** In my Pay Bot tests, speech got identifiers right 62% of the time and silently wrong 23%. So an order number is always repeated back before it is used.
- **Local speech models.** Cost per call stays flat and the audio does not leave the server.
- **I turned down a hosted voice framework for this build.** In production I would likely use one. Here the point is to own and measure every stage.

## When things go wrong

| What happens                                   | What the agent does                          |
| ---------------------------------------------- | -------------------------------------------- |
| The transcript is uncertain                    | Asks the caller to repeat. It does not guess |
| A tool is slow                                 | Says it is checking                          |
| A tool fails                                   | Apologizes once and offers a hand-off        |
| Background noise keeps triggering the detector | The threshold rises for that call            |
| The caller says nothing                        | One prompt, then a polite end                |
