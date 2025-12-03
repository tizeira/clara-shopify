# Tecnologías y Proveedores - Deep Dive

**Última actualización**: 2025-11-22
**Propósito**: Documentación profunda de cada tecnología usada en el stack

---

## 🎤 Deepgram - Speech-to-Text

### Overview
**Proveedor**: Deepgram Nova-2
**Función**: Transcribir audio en tiempo real (español chileno)
**Latency**: ~50-150ms (streaming)
**Website**: https://deepgram.com

### Por Qué Deepgram

| Feature | Deepgram | Whisper (Alternative) |
|---------|----------|----------------------|
| Latency | ~100ms | ~500ms+ (batch) |
| Streaming | ✅ Sí | ❌ No (batch only) |
| VAD Events | ✅ Sí | ❌ No |
| es-419 Support | ✅ Nativo | ✅ Nativo |
| Pricing | Pay-per-second | Pay-per-request |
| Endpointing | ✅ Configurable | ❌ Manual |

**Conclusión**: Deepgram es superior para conversación en tiempo real

### Configuration

```typescript
// config/features.ts
deepgram: {
  model: 'nova-2',           // Latest model (Jan 2024)
  language: 'es-419',        // Latin American Spanish
  smart_format: true,        // Auto punctuation/capitalization
  interim_results: true,     // Real-time partial transcripts
  endpointing: 300,          // 300ms silence = end of utterance
  vad_events: true,          // Voice Activity Detection for barge-in
  channels: 1,               // Mono audio
  sample_rate: 16000,        // 16kHz (standard for speech)
}
```

### Language: es-419 (LAT-AM Spanish)

**Por qué NO es-CL** (Chilean):
- Deepgram NO soporta `es-CL` como lenguaje específico
- Opciones disponibles: `es`, `es-419`, `es-ES`

**Por qué es-419**:
- Incluye variaciones de LAT-AM (Chile, Argentina, Colombia, México, etc.)
- Más cercano al español chileno que `es` genérico o `es-ES` (España)
- Accuracy esperada: 85-95% (depende de accent clarity)

**Trade-off**:
- Puede no reconocer modismos muy chilenos ("cachai", "po", "fome")
- Mitigación: Confidence threshold tuning
- Testing con usuarios reales chilenos es crítico

**Reference**: [Deepgram Languages](https://developers.deepgram.com/docs/models-languages-overview)

### Nova-2 Model

**Features**:
- Última generación (2024)
- Mejor accuracy que Nova-1
- Optimizado para conversational speech
- Soporta 30+ lenguajes

**Alternatives considered**:
- `base`: Older model, lower accuracy
- `enhanced`: Higher cost, marginally better
- **Decision**: Nova-2 (best balance price/quality)

### Endpointing (Silence Detection)

**Qué es**: Tiempo de silencio antes de considerar utterance completado

**Configuración**: `endpointing: 300` (300ms)

**Trade-offs**:

| Value | Pro | Contra |
|-------|-----|--------|
| 100ms | Ultra-fast response | Corta palabras mid-sentence |
| 300ms | **Balance ideal** | Ocasionalmente corta frases muy largas |
| 500ms | Nunca corta | Se siente lento, frustrante |
| 1000ms | Perfecto para pausas | Inaceptablemente lento |

**Tuning**:
```typescript
// Si en testing se cortan frases:
NEXT_PUBLIC_ENDPOINTING_DELAY_MS=400

// Si se siente lento:
NEXT_PUBLIC_ENDPOINTING_DELAY_MS=250
```

### VAD Events (Voice Activity Detection)

**Qué es**: Eventos que indican cuando el usuario empieza/termina de hablar

**Events**:
- `speech_started`: Usuario empezó a hablar
- `speech_final`: Usuario terminó de hablar (después de endpointing delay)

**Uso para Barge-in**:
```typescript
deepgramClient.on('speech_started', () => {
  if (stateMachine.is(ConversationState.AVATAR_SPEAKING)) {
    // User interrupted Clara!
    console.log('🛑 Barge-in detected');
    stateMachine.transition(ConversationState.INTERRUPTED);
    avatar.interrupt();
    llm.interrupt();
  }
});
```

**Configuration**: `vad_events: true`

### Interim Results (Partial Transcripts)

**Qué son**: Transcripciones parciales enviadas en tiempo real (antes de final transcript)

**Example flow**:
```
[interim] "Hola"
[interim] "Hola quiero"
[interim] "Hola quiero comprar"
[interim] "Hola quiero comprar crema"
[final]   "Hola, quiero comprar crema hidratante."
```

**Uso en UI**:
```typescript
deepgramClient.on('Results', (data) => {
  if (data.is_final) {
    // Final transcript → send to LLM
    console.log('📝 Final:', data.channel.alternatives[0].transcript);
    processUserInput(data.channel.alternatives[0].transcript);
  } else {
    // Interim → show in UI (real-time feedback)
    console.log('⏳ Interim:', data.channel.alternatives[0].transcript);
    updateUITranscript(data.channel.alternatives[0].transcript);
  }
});
```

**Configuration**: `interim_results: true`

**UX benefit**: User sees real-time feedback que está siendo escuchado

### Smart Format

**Qué es**: Auto-formatting de punctuation y capitalization

**Example**:
```
Without smart_format: "hola quiero comprar crema hidratante"
With smart_format:    "Hola, quiero comprar crema hidratante."
```

**Configuration**: `smart_format: true`

**Benefit**: Mejor input para Claude (punctuation ayuda con context)

### Implementation Example

```typescript
import { createClient } from '@deepgram/sdk';

class DeepgramStreamingSTT implements STTProvider {
  private deepgram: any;
  private connection: any;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  constructor(apiKey: string) {
    this.deepgram = createClient(apiKey);
  }

  async startListening(): Promise<void> {
    // Get microphone
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      }
    });

    // Open Deepgram connection
    this.connection = this.deepgram.listen.live({
      model: 'nova-2',
      language: 'es-419',
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      vad_events: true,
    });

    // Setup event listeners
    this.connection.on('Results', (data: any) => {
      const transcript = data.channel.alternatives[0].transcript;

      if (data.is_final && transcript.trim()) {
        this.onTranscriptCallback?.(transcript);
      } else if (transcript.trim()) {
        this.onInterimCallback?.(transcript);
      }
    });

    this.connection.on('SpeechStarted', () => {
      this.onSpeechStartCallback?.();
    });

    this.connection.on('UtteranceEnd', () => {
      this.onSpeechEndCallback?.();
    });

    this.connection.on('error', (error: any) => {
      this.onErrorCallback?.(error);
    });

    // Send audio to Deepgram
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.connection.getReadyState() === 1) {
        this.connection.send(event.data);
      }
    };

    this.mediaRecorder.start(250); // Send chunks every 250ms
  }

  async stopListening(): Promise<void> {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.connection?.finish();
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    this.connection = null;
    this.deepgram = null;
  }
}
```

### Error Handling

**Common errors**:
```typescript
connection.on('error', (error) => {
  if (error.message.includes('401')) {
    // Invalid API key
    console.error('❌ Deepgram API key invalid');
  } else if (error.message.includes('429')) {
    // Rate limit
    console.error('⚠️ Deepgram rate limit exceeded');
  } else if (error.message.includes('network')) {
    // Connection issue
    console.error('🌐 Network error, retrying...');
  }
});
```

### Pricing (as of 2024)

- **Pay-as-you-go**: $0.0043/min (Nova-2 model)
- **Monthly commitment**: Descuentos por volumen
- **Free tier**: $200 créditos iniciales

**Cost estimate para Clara**:
- Average session: 5 minutos
- Cost per session: ~$0.02
- 1000 sessions/month: ~$20

**Comparado con Whisper**:
- Whisper API: $0.006/min (cheaper)
- Pero: No streaming, latency muy alta
- **Conclusión**: Deepgram vale el 30% extra por streaming

### Links

- **Docs**: https://developers.deepgram.com/docs/streaming
- **SDK**: https://github.com/deepgram/deepgram-node-sdk
- **Languages**: https://developers.deepgram.com/docs/models-languages-overview
- **Console**: https://console.deepgram.com/
- **Pricing**: https://deepgram.com/pricing

---

## 🧠 Claude - Language Model

### Overview
**Modelo**: Claude 3.5 Haiku (claude-3-5-haiku-20241022)
**Función**: Generar respuestas conversacionales personalizadas
**Latency**: ~200ms TTFT (Time To First Token)
**Provider**: Anthropic
**Website**: https://anthropic.com

### Por Qué Claude Haiku 4.5

| Feature | Claude Haiku 4.5 | GPT-4o mini | GPT-3.5 Turbo |
|---------|------------------|-------------|---------------|
| Latency (TTFT) | ~200ms | ~300ms | ~250ms |
| Streaming | ✅ Sí | ✅ Sí | ✅ Sí |
| Spanish Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Context Window | 200K | 128K | 16K |
| Pricing | $$ | $ | $ |
| Interruption | AbortController | AbortController | AbortController |

**Por qué Haiku**:
- ✅ Latency ultra-baja (crítico para conversación)
- ✅ Excelente español (entrenado en LAT-AM data)
- ✅ Streaming smooth
- ✅ Control total (vs HeyGen built-in)

**Alternativas consideradas**:
- ❌ **GPT-4o mini**: Latency acceptable pero español ligeramente inferior
- ❌ **GPT-3.5 Turbo**: Español no tan natural, más "robótico"
- ❌ **HeyGen built-in**: Sin personalización, sin control

### Configuration

```typescript
// config/features.ts
claude: {
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 150,        // ~2-3 sentences (15-20 seconds speech)
  temperature: 0.7,       // Balance creativity/consistency
  stream: true,           // Always stream
}
```

### Max Tokens: 150 (Why?)

**Análisis**:
- 1 token ≈ 4 caracteres en español
- 150 tokens ≈ 600 caracteres
- 600 caracteres ≈ 2-3 oraciones
- 2-3 oraciones ≈ 15-20 segundos de speech

**Examples**:
```
Token count: 45 (~180 chars)
"¡Hola María! Vi que tienes piel seca. Te recomiendo nuestra crema hidratante con ácido hialurónico."

Token count: 120 (~480 chars)
"¡Hola María! Vi que tienes piel seca y te preocupan las manchas. Te recomiendo nuestra crema hidratante con ácido hialurónico y vitamina C. La vitamina C ayuda a aclarar manchas mientras el ácido hialurónico hidrata profundamente. ¿Te gustaría saber más sobre este producto?"

Token count: 200 (~800 chars) - TOO LONG
"¡Hola María! Vi que tienes piel seca y te preocupan las manchas. Te recomiendo nuestra crema hidratante con ácido hialurónico y vitamina C. La vitamina C es un antioxidante poderoso que ayuda a aclarar manchas y mejorar el tono de piel, mientras que el ácido hialurónico retiene hasta 1000 veces su peso en agua, proporcionando hidratación profunda. Esta combinación es ideal para piel seca con hiperpigmentación. ¿Te gustaría saber más detalles sobre cómo usar este producto?"
```

**Por qué 150**:
- ✅ Respuestas concisas (conversación natural)
- ✅ Latency baja (menos tokens = más rápido)
- ✅ Evita "wall of text"
- ⚠️ Si user pregunta algo complejo, puede quedar corto → tuning en FASE 2

**Tuning**:
```typescript
// Si respuestas muy cortas:
max_tokens: 200

// Si muy largas:
max_tokens: 100
```

### Temperature: 0.7

**Qué es**: Controla randomness/creativity

| Value | Behavior | Use Case |
|-------|----------|----------|
| 0.0 | Deterministic | Math, code |
| 0.3 | Muy consistente | FAQs, info formal |
| **0.7** | **Natural** | **Conversación** |
| 1.0 | Creativo | Storytelling |
| 1.5+ | Random | Experimental |

**Por qué 0.7**:
- ✅ Varía respuestas (no repetitivo)
- ✅ Mantiene consistencia (no dice tonterías)
- ✅ Conversación natural (humana)

### Streaming API

**Por qué streaming**:
- ✅ Latency percibida baja (user ve progreso)
- ✅ Permite barge-in mid-generation
- ✅ TTFT ~200ms (vs ~800ms para respuesta completa)

**Flow**:
```
User: "¿Qué crema me recomiendas?"
  ↓
T=0ms: Request sent to Claude
  ↓
T=200ms: FIRST TOKEN received → "Te"
  ↓
T=220ms: "Te recomiendo"
  ↓
T=250ms: "Te recomiendo nuestra"
  ↓
T=300ms: "Te recomiendo nuestra crema"
  ↓
... (continúa streamando)
  ↓
T=800ms: Response complete
```

**vs Non-streaming**:
```
User: "¿Qué crema me recomiendas?"
  ↓
T=0ms: Request sent
  ↓
T=800ms: FULL RESPONSE received (no feedback antes)
```

**Conclusión**: Streaming mejora UX significativamente

### Interrupt Mechanism (AbortController)

**Problema**: Claude API no tiene `cancel()` método nativo

**Solución**: `AbortController` (Web standard)

**Implementation**:
```typescript
class ClaudeStreamingLLM implements LLMProvider {
  private abortController: AbortController | null = null;

  async *streamResponse(userMessage: string): AsyncGenerator<string> {
    // Create new abort controller
    this.abortController = new AbortController();

    try {
      const stream = await this.anthropic.messages.stream({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          ...this.conversationHistory,
          { role: 'user', content: userMessage }
        ],
        stream: true,
      }, {
        // Pass abort signal
        signal: this.abortController.signal,
      });

      // Yield chunks as they arrive
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          yield chunk.delta.text;
        }
      }

      // Stream completed successfully
      this.abortController = null;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Stream was interrupted (barge-in)
        console.log('🛑 Claude stream interrupted');
      } else {
        // Real error
        throw error;
      }
    }
  }

  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();  // Cancel HTTP request
      this.abortController = null;
    }
  }
}
```

**Barge-in flow**:
```
1. Avatar speaking Claude's response
2. User starts talking (detected by Deepgram)
3. BargeInHandler calls llm.interrupt()
4. AbortController.abort() cancels stream
5. No más tokens generados
6. No se pagan tokens no generados ✅
```

### Conversation History Management

**Por qué importante**: Mantener contexto multi-turn

**Implementation**:
```typescript
class ClaudeStreamingLLM implements LLMProvider {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private systemPrompt: string;

  constructor(config: { systemPrompt: string }) {
    this.systemPrompt = config.systemPrompt;  // From FASE 0 personalization
  }

  async *streamResponse(userMessage: string): AsyncGenerator<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Stream response with full history
    const stream = await this.anthropic.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      system: this.systemPrompt,  // ← Personalized from Shopify data
      messages: this.conversationHistory,  // ← Full context
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        fullResponse += chunk.delta.text;
        yield chunk.delta.text;
      }
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
    });
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
```

**Memory management**:
- Context window: 200K tokens (muy amplio)
- Típica conversación: <5K tokens
- No necesitamos limpiar history frecuentemente
- Opción: Clear después de N turnos si sesión muy larga

### System Prompt Integration (FASE 0)

**From Shopify personalization**:
```typescript
// Example personalized system prompt
const systemPrompt = `
Eres Clara, asistente virtual de skincare.

---INFORMACIÓN DEL CLIENTE ACTUAL---
Nombre: María González
Tipo de Piel: Seca
Preocupaciones: Manchas, Arrugas

INSTRUCCIÓN: Considera su tipo de piel Seca en TODAS las recomendaciones.
Recomienda productos hidratantes, evita productos para piel grasa.

---ESTILO DE CONVERSACIÓN---
- Habla en español chileno natural (usa "cachai", "bacán", "caleta")
- Respuestas cortas (2-3 oraciones máximo)
- Amigable pero profesional
- Enfócate en solucionar su problema específico
`;

const llm = new ClaudeStreamingLLM({
  apiKey: process.env.ANTHROPIC_API_KEY,
  systemPrompt: systemPrompt,  // ← Personalized
});
```

### Error Handling

```typescript
try {
  for await (const chunk of llm.streamResponse(userInput)) {
    console.log(chunk);
  }
} catch (error: any) {
  if (error.status === 429) {
    // Rate limit
    console.error('⚠️ Claude rate limit, retrying...');
    await sleep(1000);
    // Retry
  } else if (error.status === 500) {
    // Server error
    console.error('❌ Claude server error, fallback to HeyGen');
    fallbackManager.triggerFallback('claude');
  } else if (error.name === 'AbortError') {
    // Interrupted (barge-in)
    console.log('🛑 Interrupted');
  } else {
    throw error;
  }
}
```

### Pricing (as of 2024)

**Claude 3.5 Haiku**:
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

**Cost estimate para Clara**:
- Average input: 100 tokens (user + history)
- Average output: 150 tokens
- Cost per response: $0.0007 (~$0.001)
- 1000 responses: ~$1

**Comparado con GPT-4o mini**:
- GPT-4o mini: $0.15/$0.60 per 1M (cheaper)
- Pero: Español ligeramente inferior, latency un poco más alta
- **Conclusión**: Haiku worth the premium para conversación en español

### Links

- **Docs**: https://docs.anthropic.com/en/api/messages
- **Streaming**: https://docs.anthropic.com/en/api/messages-streaming
- **SDK**: https://github.com/anthropics/anthropic-sdk-typescript
- **Console**: https://console.anthropic.com/
- **Pricing**: https://www.anthropic.com/pricing

---

## 🎭 HeyGen - Avatar & Text-to-Speech

### Overview
**SDK**: StreamingAvatar SDK v2.0.13
**Función**: Generar video avatar + TTS en español
**Latency**: ~150ms TTS processing
**Mode usado**: **REPEAT only** (no TALK)
**Website**: https://heygen.com

### Por Qué REPEAT Mode (No TALK)

**TALK mode**:
- Usa GPT-4o mini interno
- Genera respuestas automáticamente
- ❌ NO permite personalización del LLM
- ❌ NO permite custom prompts
- ❌ NO permite barge-in control

**REPEAT mode**:
- Solo TTS (text-to-speech)
- ✅ Recibe texto, genera audio + lip-sync
- ✅ Control total del LLM (usamos Claude)
- ✅ Personalización completa (FASE 0)
- ✅ Barge-in support

**Configuration**:
```typescript
// config/features.ts
heygen: {
  taskType: 'REPEAT' as const,  // ALWAYS REPEAT
  taskMode: 'SYNC' as const,    // Wait for previous to finish
}
```

**Usage**:
```typescript
// ❌ NEVER do this:
await avatar.speak({
  text: userInput,
  task_type: 'TALK',  // ← Uses HeyGen LLM
});

// ✅ ALWAYS do this:
const claudeResponse = await llm.generateResponse(userInput);
await avatar.speak({
  text: claudeResponse,  // ← Claude generated this
  task_type: 'REPEAT',   // ← Only TTS
  task_mode: 'SYNC',
});
```

### Avatar Configuration

**Mobile** (portrait):
```typescript
avatarName: 'Katya_CasualLook_public'
```

**Desktop** (landscape, ≥1024px):
```typescript
avatarName: 'Katya_Chair_Sitting_public'
```

**Voice**:
```typescript
voice: {
  voiceId: '0e69c649917e4a6da0f9a9e1fe02f498',
  rate: 1.0,        // Normal speed
  emotion: 'Friendly',
}
```

### Interrupt Mechanism

**HeyGen SDK method**: `avatar.interrupt()`

**Implementation**:
```typescript
class HeyGenAvatarProvider implements AvatarProvider {
  private isSpeakingFlag: boolean = false;

  async speak(text: string): Promise<void> {
    this.isSpeakingFlag = true;

    await this.avatar.speak({
      text,
      task_type: 'REPEAT',
      task_mode: 'SYNC',
    });

    // Speech ended naturally
    this.isSpeakingFlag = false;
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
}
```

**Barge-in flow**:
```
1. Avatar speaking
2. User starts talking
3. Deepgram fires speech_started event
4. BargeInHandler calls avatar.interrupt()
5. Avatar stops mid-sentence
6. Audio stops immediately
7. State → INTERRUPTED
```

### Event Listeners

**Important events**:
```typescript
avatar.on('stream_ready', () => {
  console.log('🎭 Avatar speech started');
  this.onSpeakStartCallback?.();
});

avatar.on('stream_disconnected', () => {
  console.log('🎭 Avatar speech ended');
  this.isSpeakingFlag = false;
  this.onSpeakEndCallback?.();
});

avatar.on('avatar_start_speaking', (e) => {
  console.log('🎤 Avatar TTS started');
});

avatar.on('avatar_stop_speaking', (e) => {
  console.log('🎤 Avatar TTS stopped');
});
```

### Session Management

**Creation**:
```typescript
const avatar = new StreamingAvatarApi({
  apiKey: process.env.HEYGEN_API_KEY!,
});

const session = await avatar.createStartAvatar({
  quality: AvatarQuality.Medium,
  avatarName: 'Katya_CasualLook_public',
  knowledgeBase: personalizedSystemPrompt,  // From FASE 0
  voice: {
    voiceId: '0e69c649917e4a6da0f9a9e1fe02f498',
  },
  language: 'es',
});
```

**Cleanup** (CRITICAL for memory leak prevention):
```typescript
async cleanup(): Promise<void> {
  // Stop any ongoing speech
  if (this.isSpeaking()) {
    await this.interrupt();
  }

  // Close session
  await this.avatar.stopAvatar();

  // Cleanup event listeners
  this.avatar.removeAllListeners();

  this.avatar = null;
}
```

### Pricing (as of 2024)

- **Session time**: $X per minute (check HeyGen dashboard)
- **Average session**: 5 minutos
- **Cost**: Variable según plan

### Links

- **Docs**: https://docs.heygen.com/docs/streaming-avatar-sdk
- **SDK**: npm `@heygen/streaming-avatar@2.0.13`
- **Console**: https://app.heygen.com/
- **Examples**: https://github.com/HeyGen-Official/StreamingAvatarSDK

---

## 🛒 Shopify - Customer Data & Personalization

### Overview
**API**: Shopify Admin GraphQL API
**Función**: Obtener datos del cliente para personalización
**Usado en**: FASE 0 (pre-avatar personalization)
**Status**: Implementado pero no testeado (plan limitation)

### Metafields Configuration

**Namespace**: `beta_skincare`

**Fields**:
```
skin_type:
  Type: Single line text
  Values: "Seca" | "Grasa" | "Mixta" | "Sensible" | "Normal"

skin_concerns:
  Type: List of single line text
  Values: ["Acné", "Manchas", "Arrugas", "Deshidratación", ...]
```

**GraphQL Query**:
```graphql
query getCustomer($id: ID!) {
  customer(id: $id) {
    id
    firstName
    lastName
    email
    numberOfOrders

    metafields(first: 10, namespace: "beta_skincare") {
      edges {
        node {
          key
          value
          type
        }
      }
    }

    orders(first: 10, reverse: true) {
      edges {
        node {
          id
          createdAt
          lineItems(first: 5) {
            edges {
              node {
                title
              }
            }
          }
        }
      }
    }
  }
}
```

### Cache Strategy

**Why cache**: Reducir API calls a Shopify (rate limits + cost)

**Duration**: 24 horas

**Implementation**:
```typescript
// localStorage key
const cacheKey = `shopify_customer_${customerId}_${YYYYMMDD}`;

// Check cache first
const cached = localStorage.getItem(cacheKey);
if (cached) {
  const data = JSON.parse(cached);
  if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
    return data.customer;  // Cache hit
  }
}

// Cache miss → fetch from API
const customer = await fetchFromShopify(customerId);
localStorage.setItem(cacheKey, JSON.stringify({
  customer,
  timestamp: Date.now(),
}));
```

### Testing Blocked

**Issue**: Current Shopify plan doesn't allow Customer API access

**Workaround**: Use mock data for now

**Mock data**:
```typescript
const mockCustomer: ShopifyCustomerData = {
  id: 'gid://shopify/Customer/123',
  firstName: 'María',
  lastName: 'González',
  email: 'maria@example.com',
  skinType: 'Seca',
  skinConcerns: ['Manchas', 'Arrugas'],
  numberOfOrders: 3,
  recentProducts: [
    { title: 'Crema Hidratante', purchasedAt: '2024-01-15' }
  ],
};
```

### Links

- **Docs**: https://shopify.dev/docs/api/admin-graphql
- **Metafields**: https://shopify.dev/docs/apps/custom-data/metafields
- **GraphiQL**: https://[your-store].myshopify.com/admin/api/graphiql.json

---

## 📊 Technology Stack Summary

| Component | Technology | Version | Purpose | Latency |
|-----------|-----------|---------|---------|---------|
| STT | Deepgram Nova-2 | Latest | Speech-to-Text | ~100ms |
| LLM | Claude Haiku 4.5 | 20241022 | Response Generation | ~200ms TTFT |
| TTS + Avatar | HeyGen StreamingAvatar | v2.0.13 | Video + Voice | ~150ms |
| Personalization | Shopify GraphQL | 2024-10 | Customer Data | N/A (pre-fetch) |
| Frontend | Next.js 14 | 14.x | Web App | - |
| State | React Context | 18.x | Global State | - |

**Total latency target**: 600-800ms (STT + LLM + TTS + network)

---

**Última actualización**: 2025-11-22
**Próxima revisión**: Después de implementar FASE 1.3-1.5 (validar con código real)
