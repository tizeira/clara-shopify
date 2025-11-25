# Deepgram Flux Migration Guide

## Overview

This project has been migrated from Deepgram Nova-2 (traditional STT) to **Deepgram Flux** (v2 API with native turn detection).

**Migration Date:** November 2025
**Branch:** `test/personalized-llm`

---

## Why Flux?

| Feature | Nova-2 (Old) | Flux (New) | Improvement |
|---------|--------------|------------|-------------|
| **Turn Detection** | Custom VAD required | Native events | -100-150 LOC |
| **Latency** | ~800-1200ms | ~600-800ms | **-25-33%** |
| **Barge-in** | Manual implementation | `StartOfTurn` event | Simpler, more reliable |
| **Configuration** | 5+ parameters | 2-3 parameters | Easier to tune |
| **Low-latency mode** | Not available | `EagerEndOfTurn` | **-100-200ms** extra |

---

## What Changed

### 1. Configuration (`config/features.ts`)

**Before (Nova-2):**
```typescript
deepgram: {
  model: 'nova-2',
  smart_format: true,
  endpointing: 300,
  vad_events: true,
}
```

**After (Flux):**
```typescript
deepgram: {
  model: 'flux-general-en',
  encoding: 'linear16',
  sampleRate: 16000,
  eotThreshold: 0.7,        // EndOfTurn confidence
  eotTimeoutMs: 6000,       // Silence timeout
  eagerEotThreshold: 0.4,   // Optional: low-latency mode
}
```

### 2. New Provider (`lib/providers/DeepgramFluxSTT.ts`)

Implements the `STTProvider` interface with:
- Native Flux turn events (`StartOfTurn`, `EndOfTurn`, `EagerEndOfTurn`, `TurnResumed`)
- Automatic barge-in detection
- Configurable confidence thresholds
- Built-in logging and debugging

### 3. Audio Configuration

New constants for optimal streaming:
```typescript
export const AUDIO_CONFIG = {
  encoding: 'linear16',
  sampleRate: 16000,      // 16kHz is optimal for voice
  channels: 1,            // Mono
  chunkSizeMs: 80,        // 80ms chunks
  chunkSizeBytes: 2560,   // Optimal chunk size
}
```

---

## Flux Presets

Choose a preset based on your use case (set via `NEXT_PUBLIC_FLUX_PRESET` env var):

### 1. **Simple Mode** (Default - Recommended for starting)
```env
NEXT_PUBLIC_FLUX_PRESET=simple
```
- Only uses `EndOfTurn` events
- No eager mode
- EOT threshold: 0.7
- Timeout: 5000ms
- **Use case:** Testing, initial deployment

### 2. **Low-Latency Mode** (Clara customer service)
```env
NEXT_PUBLIC_FLUX_PRESET=lowLatency
```
- Enables `EagerEndOfTurn` for faster responses
- EOT threshold: 0.7
- Eager threshold: 0.4
- Timeout: 6000ms
- **Use case:** High-volume customer service, quick responses needed

### 3. **High-Reliability Mode** (Medical/Legal)
```env
NEXT_PUBLIC_FLUX_PRESET=highReliability
```
- Higher confidence thresholds
- No eager mode (wait for certainty)
- EOT threshold: 0.85
- Timeout: 8000ms
- **Use case:** Medical consultations, legal advice, high accuracy required

### 4. **Complex Pipeline Mode** (RAG + Tool Calling)
```env
NEXT_PUBLIC_FLUX_PRESET=complex
```
- Balanced for complex processing
- Enables eager mode with high final threshold
- EOT threshold: 0.85
- Eager threshold: 0.4
- Timeout: 7000ms
- **Use case:** RAG systems, multi-step workflows

---

## Flux Events Explained

### Event Flow

```
User speaks → StartOfTurn
  ↓
[User speaking...] → Update (interim transcripts)
  ↓
[Silence ~400ms] → EagerEndOfTurn (medium confidence)
  ↓
User continues? → TurnResumed (cancel draft)
  OR
  ↓
[Silence confirmed] → EndOfTurn (high confidence)
```

### Event Handlers

```typescript
const stt = new DeepgramFluxSTT(config);

// Required handlers
stt.onTranscript((text) => {
  // Final transcript (EndOfTurn)
  console.log('User said:', text);
  processLLM(text);
});

stt.onSpeechStart(() => {
  // User started speaking (StartOfTurn)
  if (avatarIsSpeaking) {
    interruptAvatar(); // Barge-in!
  }
});

stt.onSpeechEnd(() => {
  // User stopped speaking (EndOfTurn)
  console.log('User finished speaking');
});

// Optional: Interim transcripts
stt.onInterim((text) => {
  // Real-time feedback (Update events)
  showInterimTranscript(text);
});

// Optional: Low-latency mode
stt.onEagerEndOfTurn((text) => {
  // Medium confidence - start preparing response
  prepareDraftResponse(text);
});

stt.onTurnResumed(() => {
  // User continued speaking - cancel draft
  cancelDraftResponse();
});
```

---

## Environment Variables

### Required

```env
# Deepgram API key
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Optional (Configuration)

```env
# Flux preset (default: 'simple')
NEXT_PUBLIC_FLUX_PRESET=lowLatency

# Feature flags
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_BARGE_IN=true
NEXT_PUBLIC_ENABLE_INTERIM_TRANSCRIPTS=true

# Debugging
NEXT_PUBLIC_LOG_FLUX_EVENTS=true  # Log all Flux turn events
NEXT_PUBLIC_LOG_TRANSCRIPTS=true  # Log transcripts
```

### Custom Thresholds (Advanced)

Override preset values if needed:

```env
# EndOfTurn confidence (0.5-0.9, default: 0.7)
NEXT_PUBLIC_EOT_THRESHOLD=0.75

# Silence timeout in ms (500-10000, default: 6000)
NEXT_PUBLIC_EOT_TIMEOUT_MS=7000

# Enable low-latency mode (0.3-0.9, omit to disable)
NEXT_PUBLIC_EAGER_EOT_THRESHOLD=0.35
```

---

## Migration Checklist

- [x] Updated `config/features.ts` with Flux configuration
- [x] Created `lib/providers/DeepgramFluxSTT.ts`
- [x] Extended `lib/realtime-conversation/interfaces.ts` with Flux events
- [x] Added `AUDIO_CONFIG` constants
- [x] Updated `package.json` with `@deepgram/sdk` v3.9.0
- [x] Created `.env.example` with Deepgram variables
- [x] Documented Flux presets and configuration
- [ ] **TODO:** Install dependencies (`npm install`)
- [ ] **TODO:** Implement conversation orchestrator using `DeepgramFluxSTT`
- [ ] **TODO:** Test basic conversation flow
- [ ] **TODO:** Test barge-in functionality
- [ ] **TODO:** Test low-latency mode (if using `lowLatency` preset)
- [ ] **TODO:** Monitor latency metrics in production

---

## Usage Example

```typescript
import { DeepgramFluxSTT } from '@/lib/providers/DeepgramFluxSTT';
import { PROVIDER_CONFIG, AUDIO_CONFIG } from '@/config/features';

// Create STT provider
const stt = new DeepgramFluxSTT({
  apiKey: process.env.DEEPGRAM_API_KEY!,
  model: PROVIDER_CONFIG.deepgram.model,
  language: PROVIDER_CONFIG.deepgram.language,
  encoding: AUDIO_CONFIG.encoding,
  sampleRate: AUDIO_CONFIG.sampleRate,
  eotThreshold: PROVIDER_CONFIG.deepgram.eotThreshold,
  eotTimeoutMs: PROVIDER_CONFIG.deepgram.eotTimeoutMs,
  eagerEotThreshold: PROVIDER_CONFIG.deepgram.eagerEotThreshold,
  logEvents: PROVIDER_CONFIG.deepgram.logEvents,
});

// Register handlers
stt.onTranscript((text) => {
  console.log('Final transcript:', text);
  // Process with LLM
});

stt.onSpeechStart(() => {
  console.log('User started speaking');
  // Handle barge-in if needed
});

stt.onInterim((text) => {
  console.log('Interim:', text);
  // Show real-time feedback
});

// Start listening
await stt.startListening();

// Send audio chunks (80ms each)
const audioChunk = getAudioChunk(); // ArrayBuffer, 2560 bytes
stt.sendAudio(audioChunk);

// Stop when done
await stt.stopListening();
await stt.cleanup();
```

---

## Troubleshooting

### Issue: High latency despite using Flux

**Check:**
1. Is `NEXT_PUBLIC_FLUX_PRESET=lowLatency` set?
2. Is `eagerEotThreshold` configured?
3. Are you sending audio in 80ms chunks?
4. Check network latency to Deepgram API

### Issue: Turn detection too aggressive (cuts off user)

**Solution:** Increase `eotThreshold` or `eotTimeoutMs`

```env
NEXT_PUBLIC_EOT_THRESHOLD=0.8  # Higher = more certainty needed
NEXT_PUBLIC_EOT_TIMEOUT_MS=7000  # Longer = more patience
```

### Issue: Turn detection too slow

**Solution:** Decrease thresholds or enable eager mode

```env
NEXT_PUBLIC_FLUX_PRESET=lowLatency
NEXT_PUBLIC_EAGER_EOT_THRESHOLD=0.35  # Lower = earlier trigger
```

### Issue: Barge-in not working

**Check:**
1. Is `NEXT_PUBLIC_ENABLE_BARGE_IN=true`?
2. Is `onSpeechStart` handler interrupting the avatar?
3. Check `StartOfTurn` events in logs with `NEXT_PUBLIC_LOG_FLUX_EVENTS=true`

---

## Performance Metrics

Expected latency improvements:

| Metric | Nova-2 | Flux (Simple) | Flux (Low-Latency) |
|--------|--------|---------------|---------------------|
| Turn detection | ~500ms | ~260ms | ~260ms |
| Total E2E latency | 800-1200ms | 600-800ms | 400-600ms |
| Barge-in response | ~300ms | ~100ms | ~100ms |

---

## Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Add your DEEPGRAM_API_KEY
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Monitor Flux events:**
   ```env
   NEXT_PUBLIC_LOG_FLUX_EVENTS=true
   ```
   Check console for turn events and tune thresholds as needed.

5. **Deploy to Vercel:**
   - Add `DEEPGRAM_API_KEY` to Vercel environment variables
   - Set `NEXT_PUBLIC_FLUX_PRESET` based on use case
   - Deploy and monitor latency

---

## References

- [Deepgram Flux Documentation](https://developers.deepgram.com/docs/flux)
- [Flux API v2 Reference](https://developers.deepgram.com/reference/listen-live)
- [Project CLAUDE.md](./CLAUDE.md) - Full architecture documentation

---

**Questions?** Open an issue or check the official Deepgram Flux guide.
