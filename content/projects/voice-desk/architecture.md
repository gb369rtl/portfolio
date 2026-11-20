## What each part does

- **Audio gateway.** One WebSocket per call. It carries audio frames in and audio chunks out, and the small control messages: stop, and played.
- **Speech to text.** The voice detector and faster-whisper. It produces partial text while the caller speaks, and decides when the turn has ended.
- **Agent.** A short loop with tools. Its answer streams out as text.
- **Text to speech.** Piper, one sentence at a time, each sentence cut into numbered chunks.
- **Barge-in detector.** Listens to the caller's audio while the agent is speaking, and raises a stop.

## What crosses each arrow

- **Caller to gateway.** Audio frames, with the echo of the agent's own voice already removed by the browser.
- **Speech to text to agent.** One finished turn, as text.
- **Agent to text to speech.** Sentences, as soon as each is complete.
- **Detector to text to speech.** A stop, which also cancels the rest of the model's answer.
