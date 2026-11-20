## Build order

| Stage | What I build                                               | It is done when                                                    |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 1     | Audio in and out over a WebSocket, with nothing in between | My own voice comes back with a measured delay                      |
| 2     | Voice detection and streaming speech-to-text               | Partial text appears while I am still speaking                     |
| 3     | Text-to-speech by the sentence                             | A typed paragraph is spoken with the first audio inside the budget |
| 4     | The agent and two tools                                    | A spoken question about an order gets a spoken answer              |
| 5     | End-of-turn detection                                      | Pauses in the middle of a sentence no longer cut me off            |
| 6     | Interruption, and history that matches what was played     | I can cut in, and the agent answers the new question correctly     |
| 7     | Timing on every stage, and the test calls                  | The table below is published                                       |

## How it is measured

A set of 20 scripted calls, recorded as audio and played into the system, so every run hears the same thing. Half include an interruption. Some have background noise.

| Number                      | How it is counted                                                              |
| --------------------------- | ------------------------------------------------------------------------------ |
| Time to first audio         | End of the caller's speech to the first audio sent, median and 95th percentile |
| Interruption to silence     | First interrupting sound to playback stopped                                   |
| Errors on numbers and names | Per call, before and after read-back                                           |
| False interruptions         | Stops triggered by noise or echo                                               |
| Calls completed             | Finished without a hand-off, and with the right answer                         |

The numbers are published with the hardware they were measured on.

## After the first version

- A second language
- Telephone audio, which is narrower and noisier than a browser microphone

## Reading behind this design

- [Turn detection and interruption handling](https://livekit.com/blog/turn-detection-and-interruption-handling): why silence alone is not enough to end a turn
