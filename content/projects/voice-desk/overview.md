## What it is

A voice support agent. The caller speaks, the agent looks things up with tools and answers in speech, and it stops talking the moment the caller interrupts.

## The problem

Most voice bots feel slow, and they talk over people. The caller says something, waits two or three seconds, and then cannot stop the bot once it has started down the wrong path. People hang up.

## How it works, in short

Audio from the caller streams to the server. A voice detector marks where speech starts and stops. Speech-to-text runs while the caller is still talking, so the words are ready when they finish. The agent starts answering as text straight away, and each finished sentence is turned into audio and sent back at once. All through playback the server keeps listening. If the caller speaks, playback stops, the rest of the answer is thrown away, and the agent remembers only the part the caller actually heard.

## What it covers

- Audio both ways over one WebSocket
- Voice detection and end-of-turn detection
- Streaming speech-to-text, with partial text
- An agent with tools for lookups, and a hand-off to a person
- Speech sent back sentence by sentence
- Interruption that stops playback within a fraction of a second
- A read-back before acting on any number or name
- A time budget for each stage, measured and published

## At a glance

|           |                                                                |
| --------- | -------------------------------------------------------------- |
| Input     | A caller's voice                                               |
| Output    | A spoken answer, or a hand-off to a person                     |
| Stack     | Python, FastAPI, WebSockets, Silero VAD, faster-whisper, Piper |
| Judged by | Time to first audio, and time from interruption to silence     |

## Where it stands

Designed end to end. The speech parts reuse what I measured while building Pay Bot, which already takes spoken requests.
