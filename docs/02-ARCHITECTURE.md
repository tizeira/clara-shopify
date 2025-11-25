# Decisiones Arquitectónicas

**Última actualización**: 2025-11-22
**Propósito**: Documentar las decisiones técnicas clave con su justificación completa

---

## 📐 Principios de Diseño

### 1. Conversación como "Llamada Telefónica"

**Decisión**: La conversación debe sentirse como una llamada telefónica en tiempo real, no como un chat con delays.

**Implicaciones**:
- ✅ Audio streaming (no batch processing)
- ✅ Detección automática de fin de frase (~300-500ms de silencio)
- ✅ Procesamiento inmediato al terminar de hablar
- ✅ Barge-in support (interrupción natural)
- ❌ NO click-to-talk buttons
- ❌ NO esperar confirmación explícita del usuario

**Quote del usuario**:
> "la conversacion debe estar pensada como si fuera una llamada en tiempo real, con recepcion de audio y se envie cunado temrine d ehabalr el usaurio leugo de ejempl omnedio segundo"

### 2. Interface-Based Architecture (Pluggable Providers)

**Decisión**: Definir interfaces claras para STT, LLM, y Avatar para permitir implementaciones intercambiables.

**Beneficios**:
1. **Testability**: Mock providers para testing
2. **Fallback**: Fácil switch entre providers
3. **Gradual migration**: Migrar un componente a la vez
4. **Future-proof**: Nuevos providers sin refactor

**Implementación**:
```typescript
interface STTProvider {
  startListening(): Promise<void>;
  onTranscript(callback: (text: string) => void): void;
  // ... más métodos
}

// Implementaciones intercambiables:
class DeepgramStreamingSTT implements STTProvider { ... }
class WhisperSTT implements STTProvider { ... }  // Fallback
```

**Ubicación**: `lib/realtime-conversation/interfaces.ts`

---

## 🌍 Decisiones de Lenguaje y Localización

### 3. Deepgram es-419 (LAT-AM Spanish) vs es-CL (Chilean)

**Decisión**: Usar `es-419` (Latin American Spanish) en lugar de `es-CL` (Chilean Spanish).

**Por qué NO es-CL**:
- Deepgram **NO soporta** `es-CL` nativamente
- Opciones disponibles: `es` (general), `es-419` (LAT-AM), `es-ES` (Spain)

**Por qué es-419**:
- Es la opción MÁS CERCANA al español chileno
- Incluye variaciones de LAT-AM (Argentina, Chile, Colombia, etc.)
- Mejor que `es` genérico o `es-ES` (España)

**Trade-off aceptado**:
- Puede tener imperfecciones en modismos muy chilenos ("cachai", "po")
- Mitigación: Ajustar confidence threshold si es necesario
- Monitorear accuracy en testing con usuarios chilenos reales

**Configuración**:
```typescript
// config/features.ts
deepgram: {
  model: 'nova-2',
  language: 'es-419',  // LAT-AM Spanish (closest to Chilean)
  // ...
}
```

**Referencias**:
- [Deepgram Language Models](https://developers.deepgram.com/docs/models-languages-overview)
- No existe `es-CL` en la lista oficial de Deepgram

**Status**: ✅ Documentado, pendiente de testing real con usuarios chilenos

---

## 🧠 Decisiones de LLM

### 4. Claude Haiku 4.5 Streaming con AbortController

**Decisión**: Usar Claude streaming con `AbortController` para interrupciones, no esperar a respuesta completa.

**Por qué Streaming**:
- **Latency**: Primera palabra en ~200ms vs ~800ms para respuesta completa
- **UX**: Usuario ve progreso (interim text mientras genera)
- **Barge-in**: Permite interrumpir mid-generation

**Por qué AbortController**:
- Claude API no tiene método `cancel()` nativo
- `AbortController` es el patrón estándar web para cancelar fetch requests
- Compatible con streaming SSE

**Implementación**:
```typescript
class ClaudeStreamingLLM implements LLMProvider {
  private abortController: AbortController | null = null;

  async *streamResponse(userMessage: string): AsyncGenerator<string> {
    this.abortController = new AbortController();

    const stream = await anthropic.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      messages: [...this.history, { role: 'user', content: userMessage }],
      max_tokens: 150,
      stream: true,
    }, {
      signal: this.abortController.signal,  // ← Key: pasar signal
    });

    try {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted (barge-in)');
      } else {
        throw error;
      }
    }
  }

  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();  // ← Cancela el stream
      this.abortController = null;
    }
  }
}
```

**Trade-offs**:
- ✅ Interrupción inmediata (~10ms)
- ✅ No desperdicia tokens (paga solo lo generado)
- ⚠️ Stream puede terminar mid-sentence (aceptable para barge-in)

**Alternativas consideradas y rechazadas**:
1. ❌ **Esperar respuesta completa**: Latency muy alta (~800ms)
2. ❌ **Timeout-based cancellation**: No interrumpe el request HTTP
3. ❌ **Usar non-streaming API**: No permite barge-in suave

**Referencias**:
- [Claude Streaming API](https://docs.anthropic.com/en/api/messages-streaming)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

**Status**: ✅ Decisión tomada, implementación pendiente (FASE 1.4)

---

## 🎭 Decisiones de Avatar

### 5. HeyGen REPEAT Mode (TTS-only) vs TALK Mode (with LLM)

**Decisión**: Usar **REPEAT mode** exclusivamente, nunca TALK mode.

**REPEAT Mode**:
- Solo TTS (text-to-speech)
- NO usa LLM interno de HeyGen
- Recibe texto, genera audio + lip-sync

**TALK Mode** (NOT USED):
- Usa GPT-4o mini interno
- Genera respuestas automáticamente
- No podemos controlar el LLM

**Por qué REPEAT**:
- ✅ Control total sobre el LLM (usamos Claude)
- ✅ Personalización del prompt (FASE 0 integration)
- ✅ Streaming desde Claude (baja latency)
- ✅ Barge-in support (interrupt Claude, no HeyGen LLM)
- ✅ Métricas precisas de LLM latency

**Configuración**:
```typescript
// config/features.ts
heygen: {
  taskType: 'REPEAT' as const,  // ALWAYS REPEAT
  taskMode: 'SYNC' as const,    // Wait for previous speech to finish
}

// Usage:
await avatar.speak({
  text: claudeResponse,         // ← Claude generated this
  task_type: 'REPEAT',          // ← Never TALK
  task_mode: 'SYNC',
});
```

**Trade-off**:
- ⚠️ Requiere implementar custom pipeline (más complejidad)
- ✅ Pero vale la pena: control total + personalización profunda

**Alternativa rechazada**:
- ❌ **TALK mode**: Simple pero pierde personalización y control

**Referencias**:
- [HeyGen Task Types](https://docs.heygen.com/docs/streaming-avatar-sdk#speak)

**Status**: ✅ Decisión tomada, implementación pendiente (FASE 1.5)

---

## ⏱️ Decisiones de Latencia

### 6. Target de Latencia: 600-800ms (Realista) vs 500ms (Aspiracional)

**Decisión**: Target de **600-800ms** total, con componentes bien definidos.

**Breakdown del pipeline**:
```
User stops speaking (T=0ms)
  ↓
Deepgram endpointing delay: 300ms
  ↓
Deepgram processing: 50-100ms
  ↓
Network RTT (user → Deepgram → server): 50ms
  ↓
Claude first token (TTFT): 200ms
  ↓
Claude full response: +100-200ms (150 tokens @ 50-100 tokens/sec)
  ↓
Network RTT (server → HeyGen): 50ms
  ↓
HeyGen TTS processing: 100-150ms
  ↓
HeyGen audio start: 50ms
  ↓
TOTAL: 600-800ms
```

**Por qué NO 500ms**:
- Network latency solo (roundtrips): ~150ms unavoidable
- Deepgram endpointing: ~300ms (required for naturalidad)
- Claude TTFT: ~200ms (best case con Haiku)
- HeyGen TTS: ~150ms (no optimizable por nosotros)
- **Total best case**: ~600ms

**Para lograr 500ms se requeriría**:
- ❌ Deepgram, Claude, HeyGen en el MISMO VPC/region (no factible)
- ❌ Reducir endpointing a 100ms (corta palabras)
- ❌ Usar LLM más rápido que Haiku (no existe para español)

**Target realista con arquitectura actual**:
- ✅ **600ms**: Best case (todo en LAT-AM region, perfect network)
- ✅ **700ms**: Average case (expected)
- ✅ **800ms**: Acceptable case (con network jitter)
- ⚠️ **>1000ms**: Needs optimization o fallback

**Optimizaciones FASE 2** (para acercarse a 600ms):
1. Chunked HeyGen sending (enviar frases conforme se generan)
2. Pre-warm connections (eliminar cold start)
3. Response caching (FAQs comunes)
4. Connection pooling (keep-alive WebSockets)

**User experience**:
- 600ms: "Casi instantáneo" ✅
- 800ms: "Natural" ✅
- 1000ms: "Un poco lento" ⚠️
- 1500ms: "Necesita mejorar" ❌

**Quote del usuario** (después de explicar análisis):
> [User approved plan with 600-800ms target]

**Status**: ✅ Decisión aceptada, métricas en `config/features.ts`

---

## 🔄 Decisiones de State Management

### 7. State Machine con Transiciones Validadas

**Decisión**: Implementar state machine explícito con transiciones válidas definidas, no state flags booleanos.

**Por qué State Machine**:
- ✅ Previene estados inválidos (ej: `USER_SPEAKING` y `AVATAR_SPEAKING` al mismo tiempo)
- ✅ Transiciones explícitas y auditables
- ✅ Debugging más fácil (history de transiciones)
- ✅ Barge-in logic más clara

**Estados definidos**:
```typescript
enum ConversationState {
  IDLE,              // Esperando input
  USER_SPEAKING,     // Usuario hablando
  PROCESSING,        // STT → LLM processing
  AVATAR_SPEAKING,   // Avatar hablando
  INTERRUPTED,       // Barge-in detected
  ERROR,             // Error state
}
```

**Transiciones permitidas**:
```typescript
const allowedTransitions = {
  IDLE: [USER_SPEAKING, ERROR],
  USER_SPEAKING: [PROCESSING, IDLE, ERROR],
  PROCESSING: [AVATAR_SPEAKING, IDLE, ERROR],
  AVATAR_SPEAKING: [IDLE, INTERRUPTED, ERROR],  // ← Barge-in
  INTERRUPTED: [USER_SPEAKING, PROCESSING, IDLE, ERROR],
  ERROR: [IDLE],
};
```

**Barge-in flow**:
```
AVATAR_SPEAKING
  ↓ (user starts speaking)
INTERRUPTED
  ↓ (avatar stops, user continues)
USER_SPEAKING
  ↓ (user finishes)
PROCESSING
  ↓
AVATAR_SPEAKING
```

**Beneficios para debugging**:
```typescript
// Transition history
[
  { from: 'IDLE', to: 'USER_SPEAKING', timestamp: 1234567890, reason: 'speech detected' },
  { from: 'USER_SPEAKING', to: 'PROCESSING', timestamp: 1234567900, reason: 'speech ended' },
  { from: 'PROCESSING', to: 'AVATAR_SPEAKING', timestamp: 1234568000, reason: 'LLM complete' },
  { from: 'AVATAR_SPEAKING', to: 'INTERRUPTED', timestamp: 1234568200, reason: 'barge-in' },
  // ...
]
```

**Alternativa rechazada**:
- ❌ **Boolean flags**: `isUserSpeaking`, `isAvatarSpeaking`, `isProcessing`
  - Problema: Estados inconsistentes posibles (`isUserSpeaking && isAvatarSpeaking`)
  - Problema: No hay historial de transiciones

**Ubicación**: `lib/realtime-conversation/state-machine.ts`

**Status**: ✅ Implementado en FASE 1.1

---

## 🎚️ Decisiones de Feature Flags

### 8. Progressive Rollout con Feature Flags

**Decisión**: Todas las features nuevas empiezan **deshabilitadas** y se habilitan manualmente conforme se completan.

**Estructura**:
```typescript
// config/features.ts
export const CONVERSATION_FEATURES = {
  // FASE 1
  ENABLE_STREAMING_STT: process.env.NEXT_PUBLIC_ENABLE_STREAMING_STT === 'true' || false,
  ENABLE_STREAMING_LLM: process.env.NEXT_PUBLIC_ENABLE_STREAMING_LLM === 'true' || false,
  ENABLE_BARGE_IN: process.env.NEXT_PUBLIC_ENABLE_BARGE_IN === 'true' || false,

  // FASE 2
  ENABLE_CHUNKED_HEYGEN: false,
  ENABLE_RESPONSE_CACHE: false,

  // FASE 3
  ENABLE_AUTO_FALLBACK: true,  // ← Esta sí está enabled por defecto
  ENABLE_RETRY_LOGIC: true,

  // Debug
  LOG_LATENCY: process.env.NODE_ENV === 'development',
} as const;
```

**Benefits**:
1. **Safe deployment**: Feature incompleta no afecta production
2. **Easy rollback**: `ENABLE_X=false` sin code changes
3. **Gradual testing**: Habilitar en dev → staging → production
4. **A/B testing**: Habilitar para % de usuarios

**Workflow**:
```bash
# Development
NEXT_PUBLIC_ENABLE_STREAMING_STT=true npm run dev

# Staging (test en Vercel preview)
# Configure en Vercel: NEXT_PUBLIC_ENABLE_STREAMING_STT=true

# Production (cuando esté probado)
# Configure en Vercel production: NEXT_PUBLIC_ENABLE_STREAMING_STT=true
```

**Helper**:
```typescript
export function isCustomConversationEnabled(): boolean {
  return (
    CONVERSATION_FEATURES.ENABLE_STREAMING_STT ||
    CONVERSATION_FEATURES.ENABLE_STREAMING_LLM
  );
}

// Usage en component:
if (isCustomConversationEnabled()) {
  // Use custom pipeline
} else {
  // Use HeyGen built-in
}
```

**Status**: ✅ Implementado en `config/features.ts`

---

## 🛡️ Decisiones de Error Handling

### 9. Fallback Automático vs Manual

**Decisión**: Fallback **automático** después de 3 fallos consecutivos, con notificación al usuario.

**Strategy**:
```typescript
class FallbackManager {
  private failureCount = {
    deepgram: 0,
    claude: 0,
  };

  recordFailure(service: 'deepgram' | 'claude'): void {
    this.failureCount[service]++;

    if (this.failureCount[service] >= 3) {
      this.triggerFallback(service);
    }
  }

  async triggerFallback(service: string): Promise<void> {
    console.warn(`⚠️ Switching to HeyGen built-in (${service} failed 3x)`);

    // Notify user
    showNotification('Cambiando a modo de respaldo para mejor estabilidad...');

    // Switch to HeyGen TALK mode
    await this.switchToHeyGenBuiltIn();

    // Continue conversation (no interruption)
  }
}
```

**Por qué automático**:
- ✅ UX suave: usuario no percibe "app rota"
- ✅ Conversation continues sin restart
- ✅ Self-healing system

**Por qué no manual**:
- ❌ Requiere user action (mala UX)
- ❌ Conversación se interrumpe

**Threshold (3 fallos)**:
- 1 fallo: Puede ser network glitch transitorio → retry
- 2 fallos: Aún puede ser temporal → retry
- 3 fallos: Problema real → switch a fallback

**User choice confirmado**:
> Q: "Si Deepgram o Claude fallan, ¿prefieres switch automático a HeyGen built-in, o esperar/reintentar?"
> A: "Automático"

**Status**: ✅ Decisión tomada, implementación en FASE 3

---

## 📊 Decisiones de Monitoring

### 10. Latency Metrics Collection

**Decisión**: Capturar métricas detalladas de cada componente del pipeline en development.

**Métricas capturadas**:
```typescript
interface LatencyMetrics {
  // Timestamps
  userStopSpeaking: number;
  transcriptReceived: number;
  llmFirstToken: number;
  llmComplete: number;
  avatarStartSpeaking: number;

  // Derived latencies
  sttLatency: number;      // Deepgram
  llmLatency: number;      // Claude
  ttsLatency: number;      // HeyGen
  totalLatency: number;    // End-to-end
}
```

**Por qué en development**:
- ✅ Debugging: identificar bottleneck
- ✅ Optimization: medir mejoras de FASE 2
- ✅ No overhead en production (flag: `LOG_LATENCY`)

**Configuración**:
```typescript
// config/features.ts
export const CONVERSATION_FEATURES = {
  LOG_LATENCY: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_LATENCY === 'true',
  LOG_TRANSCRIPTS: process.env.NODE_ENV === 'development',
  LOG_STATE_TRANSITIONS: process.env.NODE_ENV === 'development',
} as const;
```

**Output example**:
```
🎤 STT latency: 350ms (Deepgram)
🧠 LLM latency: 280ms (Claude Haiku)
   ↳ First token: 200ms
   ↳ Generation: 80ms
🎭 TTS latency: 180ms (HeyGen)
⏱️ Total latency: 810ms
```

**Status**: ✅ Interfaces definidas, implementación en FASE 1.6

---

## 🗂️ Decisiones de Data Flow

### 11. Shopify Fetch: Before Avatar vs After Avatar Start

**Decisión**: Fetch Shopify data **BEFORE** initializing avatar, no lazy load.

**Flow**:
```
User opens widget
  ↓
Fetch Shopify customer data (if customerId available)
  ↓
Generate personalized prompt with data
  ↓
Initialize avatar with personalized knowledgeBase
  ↓
Avatar greets: "¡Hola [nombre]! Vi que tienes piel [tipo]..."
```

**Por qué before**:
- ✅ Avatar saluda correctamente desde la PRIMERA palabra
- ✅ No hay "generic greeting" seguido de "ah, te reconozco"
- ✅ UX más natural

**Por qué no after (lazy)**:
- ❌ Avatar dice: "¡Hola! ¿Cómo te llamo?" (generic)
- ❌ Luego: "Ah, eres María!" (awkward)
- ❌ Mala UX

**Cache strategy**:
- Fetch once, cache 24 hours en localStorage
- Key: `shopify_customer_${customerId}_${YYYYMMDD}`
- Reduce API calls a Shopify

**User choice confirmado**:
> Q: "¿Obtener datos de Shopify ANTES de iniciar avatar (saludo personalizado from start) o DURANTE conversación (lazy load)?"
> A: "Antes, para saludo personalizado desde el inicio"

**Status**: ✅ Implementado en FASE 0

---

## 🎤 Decisiones de Audio

### 12. Deepgram Endpointing: 300ms vs 500ms

**Decisión**: 300ms endpointing delay (tiempo de silencio para detectar fin de frase).

**Trade-offs**:

| Delay | Pro | Contra |
|-------|-----|--------|
| 100ms | Muy rápido | Corta palabras (false positive) |
| 300ms | Balance ideal | Ocasionalmente corta frases largas |
| 500ms | No corta nunca | Se siente lento |

**Por qué 300ms**:
- ✅ Balance entre naturalidad y velocidad
- ✅ Funciona bien en español (pausas naturales)
- ✅ Ajustable vía config si se necesita

**Configuración**:
```typescript
// config/features.ts
export const CONVERSATION_TIMING = {
  ENDPOINTING_DELAY_MS: 300,  // Deepgram silence detection
} as const;

// Provider config
deepgram: {
  endpointing: 300,
  // ...
}
```

**Fallback**:
- Si 300ms corta frases en testing → aumentar a 400ms
- Si se siente lento → reducir a 250ms

**Status**: ✅ Configurado, pendiente de testing real

---

## 🔀 Decisiones de Streaming Strategy

### 13. Full-Response vs Chunked Streaming (HeyGen)

**Decisión**: FASE 1 usa **full-response** (esperar a Claude completar), FASE 2 agrega **chunked sending**.

**Full-Response (FASE 1)**:
```typescript
// Wait for complete response
const chunks: string[] = [];
for await (const chunk of llm.streamResponse(userInput)) {
  chunks.push(chunk);
}

const fullResponse = chunks.join('');
await avatar.speak(fullResponse, 'REPEAT');  // Send all at once
```

**Pros**:
- ✅ Simple implementation
- ✅ HeyGen genera audio óptimo (full context)
- ✅ Mejor calidad de prosody

**Cons**:
- ⚠️ Latency más alta (espera response completa)

**Chunked Sending (FASE 2)**:
```typescript
// Send sentence-by-sentence
const sentenceBuffer: string[] = [];
for await (const chunk of llm.streamResponse(userInput)) {
  sentenceBuffer.push(chunk);

  // Detect sentence end
  if (chunk.match(/[.!?]\s*$/)) {
    const sentence = sentenceBuffer.join('');
    await avatar.speak(sentence, 'REPEAT');  // Send immediately
    sentenceBuffer = [];
  }
}
```

**Pros**:
- ✅ Latency percibida más baja
- ✅ Avatar empieza a hablar antes

**Cons**:
- ⚠️ Más complejo
- ⚠️ Posible prosody subóptima (frases aisladas)
- ⚠️ Requiere sentence boundary detection

**Decision rationale**:
- FASE 1: Full-response (MVP funcional rápido)
- FASE 2: Chunked (optimization cuando FASE 1 funcione)

**Status**: ✅ FASE 1 approach definido, FASE 2 en roadmap

---

## 📝 Resumen de Decisiones Clave

| Decisión | Choice | Rationale | Status |
|----------|--------|-----------|--------|
| Lenguaje STT | es-419 | Más cercano a chileno (es-CL no existe) | ✅ Documentado |
| LLM Interrupt | AbortController | Única forma de cancelar Claude stream | ✅ Documentado |
| Avatar Mode | REPEAT only | Control total del LLM | ✅ Documentado |
| Latency Target | 600-800ms | Realista con arquitectura actual | ✅ Documentado |
| State Management | State Machine | Previene estados inválidos | ✅ Implementado |
| Feature Flags | Disabled by default | Safe rollout | ✅ Implementado |
| Fallback | Automático (3 fallos) | UX suave | ✅ Documentado |
| Shopify Fetch | Before avatar init | Saludo personalizado | ✅ Implementado |
| Endpointing | 300ms | Balance velocidad/accuracy | ✅ Configurado |
| Streaming | Full-response (F1) | Simple, chunked en F2 | ✅ Documentado |

---

## 🔗 Referencias

- [01-PLAN.md](./01-PLAN.md) - Ver plan completo de implementación
- [04-TECHNOLOGIES.md](./04-TECHNOLOGIES.md) - Deep dive en cada tecnología
- [05-CONFIGURATION.md](./05-CONFIGURATION.md) - Configuración detallada

---

**Última actualización**: 2025-11-22
**Próxima revisión**: Después de implementar FASE 1.3 (validar decisiones con código real)
