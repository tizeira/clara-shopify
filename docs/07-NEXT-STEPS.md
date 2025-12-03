# Próximos Pasos Detallados

**Última actualización**: 2025-11-22
**Propósito**: Guía paso a paso para completar FASE 1

---

## 🎯 Estado Actual

**Completado**:
- ✅ FASE 0: Shopify Integration (código completo, testing bloqueado)
- ✅ FASE 1.1-1.2: Foundation (interfaces, state machine, feature flags)

**Próximo paso inmediato**:
- ⏳ **FASE 1.3: Implementar Deepgram Streaming STT**

---

## 📝 FASE 1.3: Deepgram Streaming STT

### Objetivo
Implementar provider de Speech-to-Text usando Deepgram con streaming en tiempo real, configurado para español LAT-AM (es-419).

### Duración Estimada
2-3 horas

### Prerequisites

1. **Obtener Deepgram API Key**:
   ```
   1. Ir a https://console.deepgram.com/
   2. Sign up / Log in
   3. Create new project
   4. API Keys → Create new key
   5. Copiar key (empieza con caracteres alfanuméricos)
   ```

2. **Instalar dependency**:
   ```bash
   npm install @deepgram/sdk
   ```

3. **Configurar env var**:
   ```bash
   # .env.local
   NEXT_PUBLIC_DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Paso 1: Crear archivo del provider

**Archivo**: `lib/realtime-conversation/providers/stt/deepgram-streaming.ts`

**Estructura inicial**:
```typescript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { STTProvider } from '../../interfaces';
import { PROVIDER_CONFIG, CONVERSATION_TIMING } from '@/config/features';

export class DeepgramStreamingSTT implements STTProvider {
  private deepgram: any;
  private connection: any;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  // Callbacks
  private onTranscriptCallback?: (text: string) => void;
  private onInterimCallback?: (text: string) => void;
  private onSpeechStartCallback?: () => void;
  private onSpeechEndCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(apiKey: string) {
    this.deepgram = createClient(apiKey);
  }

  async startListening(): Promise<void> {
    // TODO: Implement
  }

  async stopListening(): Promise<void> {
    // TODO: Implement
  }

  onTranscript(callback: (text: string) => void): void {
    this.onTranscriptCallback = callback;
  }

  onInterim(callback: (text: string) => void): void {
    this.onInterimCallback = callback;
  }

  onSpeechStart(callback: () => void): void {
    this.onSpeechStartCallback = callback;
  }

  onSpeechEnd(callback: () => void): void {
    this.onSpeechEndCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  isListening(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    this.deepgram = null;
    this.connection = null;
  }
}
```

### Paso 2: Implementar startListening()

```typescript
async startListening(): Promise<void> {
  try {
    // 1. Get microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    console.log('🎤 Microphone access granted');

    // 2. Open Deepgram WebSocket connection
    this.connection = this.deepgram.listen.live({
      model: PROVIDER_CONFIG.deepgram.model,              // 'nova-2'
      language: PROVIDER_CONFIG.deepgram.language,        // 'es-419'
      smart_format: PROVIDER_CONFIG.deepgram.smart_format,
      interim_results: PROVIDER_CONFIG.deepgram.interim_results,
      endpointing: CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
      vad_events: PROVIDER_CONFIG.deepgram.vad_events,
      channels: 1,
      sample_rate: 16000,
    });

    console.log('🌐 Deepgram connection opened');

    // 3. Setup event listeners
    this.setupEventListeners();

    // 4. Start sending audio
    this.startAudioStream();

  } catch (error: any) {
    console.error('❌ Failed to start listening:', error);
    this.onErrorCallback?.(error);
    throw error;
  }
}
```

### Paso 3: Setup Event Listeners

```typescript
private setupEventListeners(): void {
  // Transcript events
  this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;

    if (!transcript || transcript.trim() === '') return;

    if (data.is_final) {
      // Final transcript → send to LLM
      console.log('📝 Final transcript:', transcript);
      this.onTranscriptCallback?.(transcript);
    } else {
      // Interim transcript → show in UI
      console.log('⏳ Interim transcript:', transcript);
      this.onInterimCallback?.(transcript);
    }
  });

  // VAD (Voice Activity Detection) events
  this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    console.log('🎤 Speech started detected');
    this.onSpeechStartCallback?.();
  });

  this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    console.log('🎤 Speech ended detected');
    this.onSpeechEndCallback?.();
  });

  // Error handling
  this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
    console.error('❌ Deepgram error:', error);
    this.onErrorCallback?.(new Error(error.message || 'Deepgram error'));
  });

  // Connection events
  this.connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('✅ Deepgram connection established');
  });

  this.connection.on(LiveTranscriptionEvents.Close, () => {
    console.log('🔌 Deepgram connection closed');
  });
}
```

### Paso 4: Start Audio Stream

```typescript
private startAudioStream(): void {
  // Create MediaRecorder to capture audio
  this.mediaRecorder = new MediaRecorder(this.stream!, {
    mimeType: 'audio/webm',
  });

  // Send audio chunks to Deepgram
  this.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0 && this.connection.getReadyState() === 1) {
      this.connection.send(event.data);
    }
  };

  // Start recording (send chunks every 250ms)
  this.mediaRecorder.start(250);
  console.log('🎙️ Audio streaming started');
}
```

### Paso 5: Implementar stopListening()

```typescript
async stopListening(): Promise<void> {
  console.log('🛑 Stopping listening...');

  // Stop media recorder
  if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
    this.mediaRecorder.stop();
    this.mediaRecorder = null;
  }

  // Stop media stream
  if (this.stream) {
    this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  // Close Deepgram connection
  if (this.connection) {
    this.connection.finish();
    this.connection = null;
  }

  console.log('✅ Stopped listening');
}
```

### Paso 6: Testing Manual

```typescript
// Test file: test-deepgram.ts (create en root)
import { DeepgramStreamingSTT } from './lib/realtime-conversation/providers/stt/deepgram-streaming';

async function testDeepgram() {
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!;
  const stt = new DeepgramStreamingSTT(apiKey);

  // Setup callbacks
  stt.onInterim((text) => {
    console.log('⏳ Interim:', text);
  });

  stt.onTranscript((text) => {
    console.log('✅ Final:', text);
  });

  stt.onSpeechStart(() => {
    console.log('🎤 User started speaking');
  });

  stt.onSpeechEnd(() => {
    console.log('🎤 User stopped speaking');
  });

  stt.onError((error) => {
    console.error('❌ Error:', error);
  });

  // Start listening
  await stt.startListening();
  console.log('Listening... Speak now!');

  // Stop after 30 seconds
  setTimeout(async () => {
    await stt.stopListening();
    await stt.cleanup();
    console.log('Test complete');
  }, 30000);
}

testDeepgram();
```

### Paso 7: Habilitar Feature Flag

```bash
# .env.local
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
```

### Checklist FASE 1.3

- [ ] Deepgram API key obtenida
- [ ] `@deepgram/sdk` instalado
- [ ] Archivo `deepgram-streaming.ts` creado
- [ ] `startListening()` implementado
- [ ] Event listeners configurados
- [ ] `stopListening()` implementado
- [ ] Testing manual exitoso
- [ ] Interim transcripts aparecen en console
- [ ] Final transcripts correctos
- [ ] VAD events funcionan
- [ ] Feature flag habilitado
- [ ] No memory leaks (verificar con múltiples start/stop)

---

## 📝 FASE 1.4: Claude Haiku Streaming LLM

### Objetivo
Implementar provider de LLM usando Claude Haiku 4.5 con streaming y soporte para interrupciones vía AbortController.

### Duración Estimada
2 horas

### Prerequisites

1. **Verificar Anthropic API Key**:
   ```bash
   # Check if already configured
   echo $ANTHROPIC_API_KEY

   # If not, get from https://console.anthropic.com/
   # Add to .env.local (NO usar NEXT_PUBLIC_ prefix)
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Verificar @anthropic-ai/sdk**:
   ```bash
   # Check if installed
   npm list @anthropic-ai/sdk

   # If not installed
   npm install @anthropic-ai/sdk
   ```

### Paso 1: Crear archivo del provider

**Archivo**: `lib/realtime-conversation/providers/llm/claude-streaming.ts`

**Estructura completa**:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../../interfaces';
import { PROVIDER_CONFIG } from '@/config/features';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeStreamingLLM implements LLMProvider {
  private anthropic: Anthropic;
  private conversationHistory: Message[] = [];
  private systemPrompt: string;
  private abortController: AbortController | null = null;
  private isGeneratingFlag: boolean = false;

  constructor(config: {
    apiKey: string;
    systemPrompt: string;
  }) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
    this.systemPrompt = config.systemPrompt;
  }

  async generateResponse(userMessage: string): Promise<string> {
    // Non-streaming version (fallback)
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const response = await this.anthropic.messages.create({
      model: PROVIDER_CONFIG.claude.model,
      max_tokens: PROVIDER_CONFIG.claude.max_tokens,
      temperature: PROVIDER_CONFIG.claude.temperature,
      system: this.systemPrompt,
      messages: this.conversationHistory,
    });

    const assistantMessage = response.content[0].text;

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  }

  async *streamResponse(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.isGeneratingFlag = true;
    this.abortController = new AbortController();

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let fullResponse = '';

    try {
      const stream = await this.anthropic.messages.stream({
        model: PROVIDER_CONFIG.claude.model,
        max_tokens: PROVIDER_CONFIG.claude.max_tokens,
        temperature: PROVIDER_CONFIG.claude.temperature,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      }, {
        // Pass abort signal
        signal: this.abortController.signal,
      });

      // Yield chunks as they arrive
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          yield text;
        }
      }

      // Stream completed successfully
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Claude stream interrupted (barge-in)');
        // Don't add partial response to history
      } else {
        console.error('❌ Claude error:', error);
        throw error;
      }
    } finally {
      this.isGeneratingFlag = false;
      this.abortController = null;
    }
  }

  interrupt(): void {
    if (this.abortController) {
      console.log('🛑 Interrupting Claude generation');
      this.abortController.abort();
      this.abortController = null;
      this.isGeneratingFlag = false;
    }
  }

  addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
  }

  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  isGenerating(): boolean {
    return this.isGeneratingFlag;
  }
}
```

### Paso 2: Testing Manual

```typescript
// test-claude.ts
import { ClaudeStreamingLLM } from './lib/realtime-conversation/providers/llm/claude-streaming';

async function testClaude() {
  const llm = new ClaudeStreamingLLM({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    systemPrompt: 'Eres Clara, asistente de skincare. Responde en español chileno.',
  });

  console.log('Testing streaming...');

  // Test streaming
  for await (const chunk of llm.streamResponse('Hola, ¿qué crema me recomiendas?')) {
    process.stdout.write(chunk);
  }

  console.log('\n\nHistory:', llm.getHistory());

  // Test interrupt
  console.log('\nTesting interrupt...');
  const gen = llm.streamResponse('Cuéntame sobre tu empresa');

  setTimeout(() => {
    console.log('\n🛑 Interrupting...');
    llm.interrupt();
  }, 500);

  for await (const chunk of gen) {
    process.stdout.write(chunk);
  }

  console.log('\n✅ Test complete');
}

testClaude();
```

### Paso 3: Habilitar Feature Flag

```bash
# .env.local
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true
```

### Checklist FASE 1.4

- [ ] Anthropic API key verificada
- [ ] `@anthropic-ai/sdk` instalado
- [ ] Archivo `claude-streaming.ts` creado
- [ ] `streamResponse()` funciona
- [ ] AbortController interrupt funciona
- [ ] Conversation history se mantiene
- [ ] Testing manual exitoso
- [ ] Feature flag habilitado

---

## 📝 FASE 1.5: HeyGen Avatar Wrapper

### Objetivo
Crear wrapper sobre HeyGen StreamingAvatarApi que implemente AvatarProvider interface, forzando REPEAT mode.

### Duración Estimada
1-2 horas

### Paso 1: Crear archivo del provider

**Archivo**: `lib/realtime-conversation/providers/avatar/heygen-wrapper.ts`

**Estructura**:
```typescript
import { StreamingAvatarApi } from '@heygen/streaming-avatar';
import { AvatarProvider } from '../../interfaces';
import { PROVIDER_CONFIG } from '@/config/features';

export class HeyGenAvatarProvider implements AvatarProvider {
  private avatar: StreamingAvatarApi;
  private isSpeakingFlag: boolean = false;

  // Callbacks
  private onSpeakStartCallback?: () => void;
  private onSpeakEndCallback?: () => void;

  constructor(avatar: StreamingAvatarApi) {
    this.avatar = avatar;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.avatar.on('stream_ready', () => {
      console.log('🎭 Avatar speech started');
      this.isSpeakingFlag = true;
      this.onSpeakStartCallback?.();
    });

    this.avatar.on('stream_disconnected', () => {
      console.log('🎭 Avatar speech ended');
      this.isSpeakingFlag = false;
      this.onSpeakEndCallback?.();
    });

    this.avatar.on('avatar_start_speaking', () => {
      console.log('🎤 Avatar TTS started');
    });

    this.avatar.on('avatar_stop_speaking', () => {
      console.log('🎤 Avatar TTS stopped');
    });
  }

  async speak(text: string, mode: 'TALK' | 'REPEAT'): Promise<void> {
    // CRITICAL: Force REPEAT mode
    if (mode !== 'REPEAT') {
      console.warn('⚠️ Forcing REPEAT mode (TALK mode not allowed)');
    }

    await this.avatar.speak({
      text,
      task_type: PROVIDER_CONFIG.heygen.taskType,  // Always 'REPEAT'
      task_mode: PROVIDER_CONFIG.heygen.taskMode,  // 'SYNC'
    });
  }

  async interrupt(): Promise<void> {
    if (this.isSpeakingFlag) {
      console.log('🛑 Interrupting avatar speech');
      await this.avatar.interrupt();
      this.isSpeakingFlag = false;
    }
  }

  isSpeaking(): boolean {
    return this.isSpeakingFlag;
  }

  onSpeakStart(callback: () => void): void {
    this.onSpeakStartCallback = callback;
  }

  onSpeakEnd(callback: () => void): void {
    this.onSpeakEndCallback = callback;
  }

  getStream(): MediaStream | null {
    // HeyGen SDK doesn't expose stream directly
    // Return null, video rendering handled by SDK
    return null;
  }
}
```

### Checklist FASE 1.5

- [ ] Archivo `heygen-wrapper.ts` creado
- [ ] REPEAT mode forced
- [ ] Event listeners configurados
- [ ] `interrupt()` funciona
- [ ] Testing con avatar real exitoso

---

## 📝 FASE 1.6: Conversation Manager (Orchestrator)

### Objetivo
Orquestar el flujo completo: STT → LLM → Avatar, integrando state machine y emitiendo eventos.

### Duración Estimada
3-4 horas

### Archivo

`lib/realtime-conversation/conversation-manager.ts`

### Estructura (esquema, implementar completamente)

```typescript
import { ConversationStateMachine, ConversationState } from './state-machine';
import { STTProvider, LLMProvider, AvatarProvider, ConversationConfig, LatencyMetrics } from './interfaces';
import { CONVERSATION_FEATURES } from '@/config/features';

export class ConversationManager {
  private stateMachine: ConversationStateMachine;
  private sttProvider: STTProvider;
  private llmProvider: LLMProvider;
  private avatarProvider: AvatarProvider;
  private config: ConversationConfig;

  // Latency tracking
  private latencyMetrics: Partial<LatencyMetrics> = {};

  constructor(config: ConversationConfig) {
    this.config = config;
    this.stateMachine = new ConversationStateMachine();
    this.sttProvider = config.sttProvider;
    this.llmProvider = config.llmProvider;
    this.avatarProvider = config.avatarProvider;
  }

  async start(): Promise<void> {
    console.log('🚀 Starting conversation manager');

    this.setupSTTListeners();
    this.setupAvatarListeners();

    await this.sttProvider.startListening();

    this.stateMachine.transition(ConversationState.IDLE, 'ready');
  }

  private setupSTTListeners(): void {
    // User starts speaking
    this.sttProvider.onSpeechStart(() => {
      if (this.stateMachine.canAcceptUserInput()) {
        this.stateMachine.transition(ConversationState.USER_SPEAKING, 'speech detected');
      }
    });

    // Final transcript received
    this.sttProvider.onTranscript(async (text) => {
      this.latencyMetrics.transcriptReceived = Date.now();

      this.stateMachine.transition(ConversationState.PROCESSING, 'transcript received');

      await this.processUserInput(text);
    });

    // Interim transcripts (optional UI update)
    if (CONVERSATION_FEATURES.ENABLE_INTERIM_TRANSCRIPTS) {
      this.sttProvider.onInterim((text) => {
        // Emit event for UI update
        console.log('⏳ Interim:', text);
      });
    }
  }

  private async processUserInput(userInput: string): Promise<void> {
    try {
      // Stream LLM response
      const chunks: string[] = [];
      this.latencyMetrics.llmFirstToken = 0;

      for await (const chunk of this.llmProvider.streamResponse(userInput)) {
        if (this.latencyMetrics.llmFirstToken === 0) {
          this.latencyMetrics.llmFirstToken = Date.now();
        }
        chunks.push(chunk);
      }

      this.latencyMetrics.llmComplete = Date.now();

      const fullResponse = chunks.join('');

      // Send to avatar
      this.stateMachine.transition(ConversationState.AVATAR_SPEAKING, 'LLM complete');

      await this.avatarProvider.speak(fullResponse, 'REPEAT');

    } catch (error) {
      console.error('❌ Error processing input:', error);
      this.stateMachine.transition(ConversationState.ERROR, 'processing error');
    }
  }

  private setupAvatarListeners(): void {
    this.avatarProvider.onSpeakEnd(() => {
      this.stateMachine.transition(ConversationState.IDLE, 'avatar finished');

      // Log latency metrics
      this.logLatencyMetrics();
    });
  }

  private logLatencyMetrics(): void {
    if (!CONVERSATION_FEATURES.LOG_LATENCY) return;

    // Calculate derived metrics
    // TODO: Implement calculation
    console.log('⏱️ Latency metrics:', this.latencyMetrics);
  }

  async stop(): Promise<void> {
    await this.sttProvider.stopListening();
    await this.sttProvider.cleanup();
  }
}
```

### Checklist FASE 1.6

- [ ] Archivo `conversation-manager.ts` creado
- [ ] Pipeline completo funciona: audio → transcript → LLM → avatar
- [ ] State machine integrado
- [ ] Latency metrics calculados
- [ ] Testing end-to-end exitoso

---

## 📝 FASE 1.7: Barge-in Handler

### Objetivo
Detectar cuando usuario habla mientras avatar está hablando, e interrumpir avatar + LLM.

### Duración Estimada
2 horas

### Archivo

`lib/realtime-conversation/barge-in-handler.ts`

### Estructura (esquema)

```typescript
import { ConversationStateMachine, ConversationState } from './state-machine';
import { STTProvider, LLMProvider, AvatarProvider } from './interfaces';
import { CONVERSATION_TIMING, CONVERSATION_FEATURES } from '@/config/features';

export class BargeInHandler {
  private stateMachine: ConversationStateMachine;
  private sttProvider: STTProvider;
  private llmProvider: LLMProvider;
  private avatarProvider: AvatarProvider;
  private debounceTimer: NodeJS.Timeout | null = null;
  private enabled: boolean = false;

  constructor(
    stateMachine: ConversationStateMachine,
    providers: {
      stt: STTProvider;
      llm: LLMProvider;
      avatar: AvatarProvider;
    }
  ) {
    this.stateMachine = stateMachine;
    this.sttProvider = providers.stt;
    this.llmProvider = providers.llm;
    this.avatarProvider = providers.avatar;
  }

  enable(): void {
    if (!CONVERSATION_FEATURES.ENABLE_BARGE_IN) {
      console.warn('⚠️ Barge-in disabled via feature flag');
      return;
    }

    this.enabled = true;

    this.sttProvider.onSpeechStart(() => {
      if (!this.enabled) return;

      if (this.stateMachine.canInterrupt()) {
        // Debounce to avoid false positives
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(async () => {
          console.log('🛑 Barge-in detected!');

          // Transition state
          this.stateMachine.transition(ConversationState.INTERRUPTED, 'user interrupted');

          // Interrupt avatar
          await this.avatarProvider.interrupt();

          // Interrupt LLM
          this.llmProvider.interrupt();

          // Transition to USER_SPEAKING
          this.stateMachine.transition(ConversationState.USER_SPEAKING, 'continuing after interrupt');

        }, CONVERSATION_TIMING.BARGE_IN_DEBOUNCE_MS);
      }
    });

    console.log('✅ Barge-in handler enabled');
  }

  disable(): void {
    this.enabled = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    console.log('🛑 Barge-in handler disabled');
  }
}
```

### Checklist FASE 1.7

- [ ] Archivo `barge-in-handler.ts` creado
- [ ] Detección de speech durante AVATAR_SPEAKING funciona
- [ ] Debounce evita false positives
- [ ] Avatar se interrumpe correctamente
- [ ] LLM se interrumpe correctamente
- [ ] State transitions son válidas
- [ ] Testing manual exitoso

---

## 📝 FASE 1.8: Testing Completo

### Objetivo
Probar todo el pipeline end-to-end con todos los componentes integrados.

### Duración Estimada
2-3 horas

### Testing Checklist

#### Pipeline Completo
- [ ] Audio input → Deepgram → transcript correcto
- [ ] Transcript → Claude → respuesta coherente
- [ ] Respuesta → HeyGen → avatar habla
- [ ] Multi-turn conversation mantiene contexto

#### Latency
- [ ] Medir cada componente:
  - [ ] STT latency < 500ms
  - [ ] LLM TTFT < 300ms
  - [ ] LLM complete < 800ms
  - [ ] TTS latency < 200ms
  - [ ] Total < 1000ms (idealmente 600-800ms)

#### Barge-in
- [ ] Usuario puede interrumpir mid-sentence
- [ ] Avatar se detiene inmediatamente
- [ ] LLM se cancela correctamente
- [ ] Estado retorna a USER_SPEAKING
- [ ] No false positives (ruido no trigger interrupt)

#### State Machine
- [ ] Todas las transiciones válidas funcionan
- [ ] Transiciones inválidas son rechazadas
- [ ] History se guarda correctamente
- [ ] getStats() retorna datos coherentes

#### Error Handling
- [ ] Deepgram disconnect → retry
- [ ] Claude timeout → fallback
- [ ] HeyGen error → recovery
- [ ] Network issues → graceful degradation

#### Memory Leaks
- [ ] Múltiples start/stop cycles (5+)
- [ ] Memory no crece indefinidamente
- [ ] Event listeners se limpian
- [ ] WebSocket connections se cierran

#### UI/UX
- [ ] Interim transcripts se muestran
- [ ] Estado visible al usuario
- [ ] Loading states apropiados
- [ ] Error messages claros

### Testing Script

```typescript
// test-integration.ts
import { ConversationManager } from './lib/realtime-conversation/conversation-manager';
import { DeepgramStreamingSTT } from './lib/realtime-conversation/providers/stt/deepgram-streaming';
import { ClaudeStreamingLLM } from './lib/realtime-conversation/providers/llm/claude-streaming';
import { HeyGenAvatarProvider } from './lib/realtime-conversation/providers/avatar/heygen-wrapper';

async function testFullPipeline() {
  // 1. Initialize providers
  const stt = new DeepgramStreamingSTT(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!);
  const llm = new ClaudeStreamingLLM({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    systemPrompt: 'Eres Clara, asistente de skincare en español chileno.',
  });
  const avatar = new HeyGenAvatarProvider(avatarInstance);

  // 2. Create conversation manager
  const manager = new ConversationManager({
    sttProvider: stt,
    llmProvider: llm,
    avatarProvider: avatar,
    enableStreaming: true,
    enableBargeIn: true,
    enableInterimTranscripts: true,
    endpointingDelayMs: 300,
    interruptDelayMs: 100,
    logLatency: true,
    logTranscripts: true,
  });

  // 3. Start conversation
  await manager.start();

  console.log('✅ Conversation started. Speak now!');

  // 4. Let it run for 2 minutes
  await new Promise(resolve => setTimeout(resolve, 120000));

  // 5. Stop
  await manager.stop();

  console.log('✅ Test complete');
}

testFullPipeline();
```

---

## 🎯 Definition of Done (FASE 1 Complete)

### Code Complete
- [x] FASE 0: Shopify personalization
- [x] FASE 1.1-1.2: Foundation
- [ ] FASE 1.3: Deepgram provider
- [ ] FASE 1.4: Claude provider
- [ ] FASE 1.5: HeyGen wrapper
- [ ] FASE 1.6: Conversation manager
- [ ] FASE 1.7: Barge-in handler

### Testing Complete
- [ ] Manual testing exitoso
- [ ] Integration testing completo
- [ ] Latency medida y < 1000ms
- [ ] Barge-in funciona correctamente
- [ ] No memory leaks

### Documentation Complete
- [x] 00-README.md
- [x] 01-PLAN.md
- [x] 02-ARCHITECTURE.md
- [x] 03-CURRENT-STATE.md
- [x] 04-TECHNOLOGIES.md
- [x] 05-CONFIGURATION.md
- [x] 06-TROUBLESHOOTING.md
- [x] 07-NEXT-STEPS.md

### Ready for FASE 2
- [ ] All feature flags working
- [ ] Código committed a git
- [ ] Vercel preview deployment successful
- [ ] Manual testing en preview URL

---

## 🔄 Workflow Recomendado

### Daily Development

1. **Empezar el día**:
   ```bash
   git status
   git log --oneline -5  # Ver últimos commits
   cat docs/03-CURRENT-STATE.md  # Ver dónde estamos
   ```

2. **Implementar tarea**:
   - Leer paso detallado en este doc
   - Implementar código
   - Testing manual

3. **Fin del día**:
   ```bash
   git add [archivos]
   git commit -m "feat(FASE 1.X): descripción"
   git push origin test/personalized-llm

   # Actualizar 03-CURRENT-STATE.md si necesario
   ```

### Testing Workflow

1. **Local testing first**:
   ```bash
   npm run dev
   # Test manualmente en browser
   ```

2. **Vercel preview testing**:
   ```bash
   git push origin test/personalized-llm
   # Wait for Vercel deployment
   # Test en preview URL
   ```

3. **Production deploy** (cuando FASE 1 completa):
   ```bash
   git checkout main
   git merge test/personalized-llm --no-ff
   git push origin main
   ```

---

**Última actualización**: 2025-11-22
**Última revisión**: 2025-11-22

¡Éxito con la implementación! 🚀
