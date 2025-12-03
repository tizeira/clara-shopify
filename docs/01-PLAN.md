# Plan Completo: Sistema de Conversación en Tiempo Real

**Fecha de creación**: 2025-11-22
**Branch**: `test/personalized-llm`
**Estado global**: FASE 0 ✅ | FASE 1 (foundation ✅, providers ⏳) | FASE 2-4 ❌

---

## 🎯 Objetivo Principal

Reemplazar el sistema de conversación interno de HeyGen (GPT-4o mini) con un stack personalizado que ofrezca:

1. **Personalización profunda**: Integración con Shopify para saludos y recomendaciones personalizadas
2. **Conversación natural**: Pipeline streaming que se siente como "una llamada telefónica en tiempo real"
3. **Barge-in support**: Usuario puede interrumpir a Clara mientras habla (como en conversación humana real)
4. **Baja latencia**: Target 600-800ms total (STT + LLM + TTS)
5. **Fallback robusto**: Auto-switch a HeyGen built-in si custom stack falla

---

## 📋 4 Fases del Plan

### FASE 0: Shopify Integration & Prompt Personalization
**Duración estimada**: 1 día
**Estado**: ✅ **COMPLETA** (infraestructura lista, testing bloqueado)

#### Objetivos
- Obtener datos del cliente desde Shopify **ANTES** de iniciar avatar
- Generar prompts personalizados con nombre, tipo de piel, concerns
- Cache de 24 horas en localStorage para performance

#### Entregables
- [x] `lib/personalization/types.ts` - Interfaces TypeScript
- [x] `lib/personalization/shopify-fetcher.ts` - Cliente con cache
- [x] `lib/personalization/prompt-template.ts` - Sistema de templates
- [x] `app/api/customer-data/route.ts` - Endpoint backend
- [x] Modificado `lib/shopify-client.ts` - Query de metafields
- [x] Modificado `components/help-assistant-widget.tsx` - Integración

#### Metafields de Shopify
```graphql
namespace: "beta_skincare"
keys:
  - skin_type: "Seca" | "Grasa" | "Mixta" | "Sensible" | "Normal"
  - skin_concerns: ["Acné", "Manchas", "Arrugas", ...] (array)
```

#### Commits
- `a8e78ff` - "feat: implement FASE 0 - Shopify personalization system" (2025-11-22)

#### Testing Status
⚠️ **BLOQUEADO**: Plan actual de Shopify no permite acceso a API de clientes. Infraestructura completa, testing pendiente de upgrade de plan.

#### Próximos pasos FASE 0
1. Upgrade plan de Shopify
2. Configurar metafields en Shopify Admin:
   ```bash
   Settings → Custom Data → Customers → Add definition
   Namespace: beta_skincare
   Key: skin_type
   Type: Single line text
   ```
3. Poblar datos de prueba
4. Verificar saludo personalizado: "¡Hola [nombre]! Vi que tienes piel [tipo]..."

---

### FASE 1: Core Voice Pipeline + Barge-in
**Duración estimada**: 2 días
**Estado**: 🟡 **PARCIAL** (foundation ✅, providers ⏳)

#### Objetivos
- Implementar pipeline completo: Deepgram → Claude → HeyGen
- Soporte para barge-in (interrupción) desde FASE 1
- State machine robusto con transiciones validadas
- Feature flags para rollout progresivo

#### Sub-fases

##### FASE 1.1-1.2: Foundation (✅ COMPLETA)
**Entregables**:
- [x] `lib/realtime-conversation/interfaces.ts` - Interfaces de providers
- [x] `lib/realtime-conversation/state-machine.ts` - State machine
- [x] `config/features.ts` - Feature flags y configuración

**Commits**:
- `75f078a` - "feat(FASE 1): add conversation system foundation" (2025-11-22)

**Interfaces clave**:
```typescript
STTProvider     // startListening(), onTranscript(), onSpeechStart()
LLMProvider     // streamResponse(), interrupt(), addToHistory()
AvatarProvider  // speak(), interrupt(), onSpeakEnd()
```

**Estados**:
```
IDLE → USER_SPEAKING → PROCESSING → AVATAR_SPEAKING → IDLE
                                           ↓
                                      INTERRUPTED (barge-in)
```

##### FASE 1.3: Deepgram Streaming STT (⏳ PENDIENTE)
**Archivo**: `lib/realtime-conversation/providers/stt/deepgram-streaming.ts`

**Requirements**:
```typescript
class DeepgramStreamingSTT implements STTProvider {
  constructor(config: {
    apiKey: string;
    language: 'es-419';        // LAT-AM Spanish (closest to Chilean)
    model: 'nova-2';
    interim_results: true;
    smart_format: true;
    endpointing: 300;          // 300ms silence detection
    vad_events: true;          // Voice Activity Detection for barge-in
  });

  async startListening(): Promise<void>;
  async stopListening(): Promise<void>;

  onTranscript(callback: (text: string) => void): void;
  onInterim(callback: (text: string) => void): void;
  onSpeechStart(callback: () => void): void;  // For barge-in detection
  onSpeechEnd(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}
```

**Dependencies**:
```bash
npm install @deepgram/sdk
```

**Env vars**:
```bash
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_key_here
```

##### FASE 1.4: Claude Haiku Streaming LLM (⏳ PENDIENTE)
**Archivo**: `lib/realtime-conversation/providers/llm/claude-streaming.ts`

**Requirements**:
```typescript
class ClaudeStreamingLLM implements LLMProvider {
  private abortController: AbortController | null = null;
  private conversationHistory: Message[] = [];

  constructor(config: {
    apiKey: string;
    model: 'claude-3-5-haiku-20241022';
    max_tokens: 150;           // ~2-3 sentences (15-20 seconds speech)
    temperature: 0.7;
    system: string;            // Personalized prompt from FASE 0
  });

  async generateResponse(userMessage: string): Promise<string>;

  async *streamResponse(userMessage: string): AsyncGenerator<string> {
    this.abortController = new AbortController();

    const stream = await anthropic.messages.stream({
      model: this.config.model,
      max_tokens: this.config.max_tokens,
      messages: [...this.conversationHistory, { role: 'user', content: userMessage }],
      stream: true,
    }, {
      signal: this.abortController.signal,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield chunk.delta.text;
      }
    }
  }

  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
```

**Dependencies**:
```bash
npm install @anthropic-ai/sdk
```

**Env vars**:
```bash
ANTHROPIC_API_KEY=your_key_here
```

##### FASE 1.5: HeyGen Avatar Wrapper (⏳ PENDIENTE)
**Archivo**: `lib/realtime-conversation/providers/avatar/heygen-wrapper.ts`

**Requirements**:
```typescript
class HeyGenAvatarProvider implements AvatarProvider {
  private avatar: StreamingAvatarApi;
  private isSpeakingFlag: boolean = false;

  constructor(avatar: StreamingAvatarApi);

  async speak(text: string, mode: 'REPEAT'): Promise<void> {
    this.isSpeakingFlag = true;
    await this.avatar.speak({
      text,
      task_type: 'REPEAT',     // ALWAYS REPEAT (no internal LLM)
      task_mode: 'SYNC',
    });
  }

  async interrupt(): Promise<void> {
    if (this.isSpeakingFlag) {
      await this.avatar.interrupt();
      this.isSpeakingFlag = false;
    }
  }

  isSpeaking(): boolean {
    return this.isSpeakingFlag;
  }

  onSpeakStart(callback: () => void): void {
    this.avatar.on('stream_ready', callback);
  }

  onSpeakEnd(callback: () => void): void {
    this.avatar.on('stream_disconnected', () => {
      this.isSpeakingFlag = false;
      callback();
    });
  }
}
```

**Config**:
```typescript
// config/features.ts
heygen: {
  taskType: 'REPEAT' as const,  // No internal LLM
  taskMode: 'SYNC' as const,    // Wait for previous speech to finish
}
```

##### FASE 1.6: Conversation Manager (⏳ PENDIENTE)
**Archivo**: `lib/realtime-conversation/conversation-manager.ts`

**Requirements**:
```typescript
class ConversationManager {
  private stateMachine: ConversationStateMachine;
  private sttProvider: STTProvider;
  private llmProvider: LLMProvider;
  private avatarProvider: AvatarProvider;

  constructor(config: ConversationConfig);

  async start(): Promise<void> {
    // Setup event listeners
    this.sttProvider.onSpeechStart(() => {
      this.stateMachine.transition(ConversationState.USER_SPEAKING);
    });

    this.sttProvider.onTranscript(async (text) => {
      this.stateMachine.transition(ConversationState.PROCESSING);

      // Stream LLM response
      const chunks: string[] = [];
      for await (const chunk of this.llmProvider.streamResponse(text)) {
        chunks.push(chunk);
      }

      const fullResponse = chunks.join('');
      this.stateMachine.transition(ConversationState.AVATAR_SPEAKING);

      await this.avatarProvider.speak(fullResponse, 'REPEAT');
    });

    this.avatarProvider.onSpeakEnd(() => {
      this.stateMachine.transition(ConversationState.IDLE);
    });

    await this.sttProvider.startListening();
  }

  async stop(): Promise<void> {
    await this.sttProvider.stopListening();
    await this.sttProvider.cleanup();
  }
}
```

##### FASE 1.7: Barge-in Handler (⏳ PENDIENTE)
**Archivo**: `lib/realtime-conversation/barge-in-handler.ts`

**Requirements**:
```typescript
class BargeInHandler {
  private stateMachine: ConversationStateMachine;
  private sttProvider: STTProvider;
  private llmProvider: LLMProvider;
  private avatarProvider: AvatarProvider;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(
    stateMachine: ConversationStateMachine,
    providers: { stt: STTProvider; llm: LLMProvider; avatar: AvatarProvider },
    config: { debounceMs: number } // Default: 100ms
  );

  enable(): void {
    this.sttProvider.onSpeechStart(() => {
      if (this.stateMachine.canInterrupt()) {
        // Debounce to avoid false positives
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(async () => {
          console.log('🛑 Barge-in detected!');

          // Transition to INTERRUPTED state
          this.stateMachine.transition(ConversationState.INTERRUPTED, 'user interrupted');

          // Interrupt avatar speech
          await this.avatarProvider.interrupt();

          // Interrupt LLM generation (if still streaming)
          this.llmProvider.interrupt();

          // Transition to USER_SPEAKING
          this.stateMachine.transition(ConversationState.USER_SPEAKING);
        }, this.config.debounceMs);
      }
    });
  }

  disable(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
```

**Config**:
```typescript
// config/features.ts
CONVERSATION_TIMING: {
  BARGE_IN_DEBOUNCE_MS: 100,  // Avoid false positives
}
```

##### FASE 1.8: Testing Completo (⏳ PENDIENTE)
**Checklist**:
- [ ] Pipeline completo funciona: audio → Deepgram → Claude → HeyGen → audio
- [ ] Latencia medida: cada componente y total
- [ ] Barge-in funciona: interrumpir a Clara mid-sentence
- [ ] State machine: todas las transiciones válidas
- [ ] Manejo de errores: cada provider puede fallar gracefully
- [ ] Interim transcripts se muestran en UI
- [ ] Conversación multi-turn mantiene contexto
- [ ] Feature flags funcionan correctamente

**Métricas a capturar**:
```typescript
interface LatencyMetrics {
  userStopSpeaking: number;      // Timestamp
  transcriptReceived: number;    // Timestamp
  llmFirstToken: number;         // Timestamp
  llmComplete: number;           // Timestamp
  avatarStartSpeaking: number;   // Timestamp

  sttLatency: number;            // transcriptReceived - userStopSpeaking
  llmLatency: number;            // llmComplete - transcriptReceived
  ttsLatency: number;            // avatarStartSpeaking - llmComplete
  totalLatency: number;          // avatarStartSpeaking - userStopSpeaking
}
```

**Target**: 600-800ms total

---

### FASE 2: Latency Optimization & Monitoring
**Duración estimada**: 1 día
**Estado**: ❌ **NO INICIADA**

#### Objetivos
- Reducir latencia a 600ms o menos
- Implementar monitoring en tiempo real
- Optimizar cada componente del pipeline

#### Features
1. **Chunked HeyGen Sending**:
   - Enviar oraciones a HeyGen conforme Claude las genera
   - No esperar a respuesta completa
   - Flag: `ENABLE_CHUNKED_HEYGEN`

2. **Response Caching**:
   - Cache de respuestas frecuentes (FAQs)
   - Invalidación inteligente
   - Flag: `ENABLE_RESPONSE_CACHE`

3. **Connection Pooling**:
   - Pre-warm connections a Deepgram/Claude
   - Keep-alive websockets
   - Flag: `ENABLE_CONNECTION_POOL`

4. **Latency Monitoring**:
   - Dashboard en tiempo real
   - Alertas si latency > threshold
   - Logs estructurados para análisis

#### Entregables
- [ ] `lib/realtime-conversation/chunked-sender.ts`
- [ ] `lib/realtime-conversation/response-cache.ts`
- [ ] `lib/realtime-conversation/connection-pool.ts`
- [ ] `lib/realtime-conversation/latency-monitor.ts`
- [ ] Feature flags en `config/features.ts`

---

### FASE 3: Fallback System & Error Recovery
**Duración estimada**: 1 día
**Estado**: ❌ **NO INICIADA**

#### Objetivos
- Auto-switch a HeyGen built-in si custom stack falla
- Retry logic con exponential backoff
- Graceful degradation

#### Triggers de Fallback
1. **Deepgram failure**: 3 errores consecutivos → switch a HeyGen voice chat
2. **Claude failure**: 3 errores consecutivos → switch a HeyGen built-in LLM
3. **Timeout**: Si latency > 3 segundos → switch temporal

#### Implementation
```typescript
class FallbackManager {
  private failureCount: Record<string, number> = {
    deepgram: 0,
    claude: 0,
  };

  recordFailure(service: 'deepgram' | 'claude'): void {
    this.failureCount[service]++;

    if (this.failureCount[service] >= FALLBACK_CONFIG.FAILURE_THRESHOLD) {
      this.triggerFallback(service);
    }
  }

  async triggerFallback(service: string): Promise<void> {
    console.warn(`⚠️ Fallback triggered for ${service}`);

    // Switch to HeyGen built-in
    // Notify user: "Cambiando a modo de respaldo..."
    // Continue conversation without interruption
  }

  resetFailureCount(service: string): void {
    this.failureCount[service] = 0;
  }
}
```

#### Retry Config
```typescript
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  MAX_RETRY_DELAY_MS: 10000,
} as const;
```

#### Entregables
- [ ] `lib/realtime-conversation/fallback-manager.ts`
- [ ] `lib/realtime-conversation/retry-handler.ts`
- [ ] Feature flag: `ENABLE_AUTO_FALLBACK`
- [ ] Testing: simular fallos y verificar recovery

---

### FASE 4: Supabase Memory System (FUTURO)
**Duración estimada**: 2 días
**Estado**: ❌ **NO INICIADA** (deferred to future)

#### Objetivos
- Memoria persistente por usuario
- Prompts dinámicos desde Supabase
- A/B testing de prompts

#### Diferido porque:
1. FASE 0-3 son más críticas
2. Requiere infraestructura adicional (Supabase)
3. Puede implementarse sin bloquear otras fases

---

## 📊 Timeline Estimado

```
Semana 1:
[✅] FASE 0: Shopify Integration (1 día)
[✅] FASE 1.1-1.2: Foundation (0.5 días)
[⏳] FASE 1.3-1.7: Providers + Barge-in (1.5 días) ← AHORA ESTAMOS AQUÍ
[⏳] FASE 1.8: Testing (0.5 días)

Semana 2:
[ ] FASE 2: Optimization (1 día)
[ ] FASE 3: Fallback (1 día)
[ ] Testing end-to-end (1 día)
[ ] Deploy a production

Futuro:
[ ] FASE 4: Supabase Memory
```

---

## ✅ Criterios de Éxito

### FASE 0
- [x] Código compila sin errores
- [ ] Metafields se leen desde Shopify correctamente (blocked by plan)
- [ ] Prompt personalizado se genera con variables
- [ ] Cache funciona (24 horas)
- [ ] Avatar saluda con nombre correcto

### FASE 1
- [ ] Pipeline completo end-to-end funciona
- [ ] Latency < 1 segundo (target: 600-800ms)
- [ ] Barge-in funciona suavemente
- [ ] State machine no permite transiciones inválidas
- [ ] Transcripts interim se muestran en UI
- [ ] Conversación multi-turn mantiene contexto

### FASE 2
- [ ] Latency reducida a < 600ms
- [ ] Metrics dashboard funciona
- [ ] Chunked sending mejora percepción de latencia

### FASE 3
- [ ] Fallback automático funciona en <2s
- [ ] Retry logic maneja errores transitorios
- [ ] Usuario no percibe interrupciones

---

## 🔗 Referencias

- **Repositorio**: `test/personalized-llm` branch
- **Commits clave**:
  - `a8e78ff` - FASE 0 complete
  - `75f078a` - FASE 1 foundation
- **Docs relacionados**:
  - [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) - Decisiones técnicas
  - [04-TECHNOLOGIES.md](./04-TECHNOLOGIES.md) - Deep dive en providers
  - [07-NEXT-STEPS.md](./07-NEXT-STEPS.md) - Próximos pasos detallados

---

**Última actualización**: 2025-11-22
**Próxima revisión**: Después de completar FASE 1.3
