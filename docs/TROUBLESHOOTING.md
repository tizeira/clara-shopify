# Troubleshooting y Problemas Conocidos

**Última actualización**: 2025-11-22
**Propósito**: Documentar issues conocidos, soluciones, y FAQs

---

## 🚧 Blockers Conocidos

### 1. Shopify Plan Limitation (BLOCKER para FASE 0 testing)

**Descripción**:
El plan actual de Shopify no permite acceso a la Customer API, lo cual bloquea el testing de la personalización implementada en FASE 0.

**Impacto**:
- ❌ No se pueden probar prompts personalizados
- ❌ No se puede verificar fetch de metafields
- ❌ No se puede validar cache de 24 horas
- ✅ Infraestructura de código está completa y lista

**Workaround**:
```typescript
// Usar mock data para testing local
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

// En shopify-fetcher.ts
if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
  return mockCustomer;
}
```

**Solución definitiva**:
1. Upgrade Shopify plan a uno que permita Customer API access
2. Configurar API credentials con scopes `read_customers`, `read_orders`
3. Probar con clientes reales

**Status**: ⚠️ Bloqueado, no crítico (FASE 1 puede continuar independientemente)

**Reportado**: 2025-11-22
**User quote**:
> "hay un inconvenitente, y es que el plan d eshopify actualmente no permite el uso de la api que accede a los datos del cleinte"

---

## ⚠️ Issues No Críticos

### 2. Dependencies No Instaladas

**Descripción**: `@deepgram/sdk` falta, necesario para FASE 1.3

**Error**:
```bash
Module not found: Can't resolve '@deepgram/sdk'
```

**Solución**:
```bash
npm install @deepgram/sdk
```

**Status**: ⏳ Pendiente de instalar (next step)

### 3. API Keys No Configuradas

**Descripción**: Deepgram API key falta en `.env.local`

**Error**:
```bash
Error: NEXT_PUBLIC_DEEPGRAM_API_KEY is undefined
```

**Solución**:
1. Crear cuenta en Deepgram: https://console.deepgram.com/
2. Create project → API Keys → Create new key
3. Copiar key a `.env.local`:
   ```bash
   NEXT_PUBLIC_DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Restart dev server: `npm run dev`

**Status**: ⏳ Pendiente de configurar

### 4. Favicon 404 (Cosmetic)

**Descripción**: Favicon.ico no se encuentra

**Error en console**:
```
GET /favicon.ico 404
```

**Impacto**: Cosmético, no afecta funcionalidad

**Solución**:
```bash
# Agregar favicon.ico a public/
# O agregar en app/layout.tsx:
export const metadata = {
  icons: {
    icon: '/path/to/favicon.ico',
  },
};
```

**Priority**: 🟢 Low (cosmetic)

### 5. Initial Response Time Calculation Bug

**Descripción**: Primera respuesta muestra latency incorrecta (~55 años)

**Error en console**:
```
⏱️ Response time: 1735200000000ms (~55 years)
```

**Causa**: Timestamp de referencia no inicializado correctamente

**Impacto**: Cosmético, solo afecta primer mensaje

**Solución**:
```typescript
// En conversation manager
private lastUserStopTime: number = 0;

onUserStopSpeaking() {
  this.lastUserStopTime = Date.now();  // ← Initialize properly
}

onAvatarStartSpeaking() {
  if (this.lastUserStopTime === 0) return;  // ← Guard
  const latency = Date.now() - this.lastUserStopTime;
  console.log(`⏱️ Total latency: ${latency}ms`);
}
```

**Priority**: 🟡 Medium (affects metrics logging)

### 6. ScriptProcessorNode Deprecation Warning

**Descripción**: Warning en console sobre ScriptProcessorNode deprecated

**Warning**:
```
[Deprecation] ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.
```

**Causa**: LiveKit SDK (usado por HeyGen) usa API deprecated

**Impacto**: Warning only, no afecta funcionalidad

**Solución**: No hay, es issue de LiveKit SDK upstream

**Workaround**: Ignorar warning (no critical)

**Priority**: 🟢 Low (external dependency)

### 7. DataChannel Errors on Session Close

**Descripción**: Errores de DataChannel cuando se cierra sesión de avatar

**Error**:
```
RTCDataChannel error: Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'
```

**Causa**: HeyGen SDK intenta enviar data después de cerrar connection

**Impacto**: Non-critical, ocurre solo al cerrar sesión

**Solución**: Cleanup mejorado

```typescript
async cleanup(): Promise<void> {
  // Stop avatar first
  if (this.avatar) {
    await this.avatar.stopAvatar();
  }

  // Wait a bit before removing listeners (let DataChannel close)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Then remove listeners
  this.avatar?.removeAllListeners();

  this.avatar = null;
}
```

**Priority**: 🟢 Low (cosmetic error)

---

## 🐛 Posibles Errores en FASE 1

### Error: Deepgram Connection Timeout

**Descripción**: WebSocket a Deepgram no conecta

**Error**:
```
Error: WebSocket connection timeout after 5000ms
```

**Causas posibles**:
1. ❌ API key inválido
2. ❌ Network firewall blocking WebSocket
3. ❌ Deepgram service down

**Debug**:
```typescript
deepgram.on('error', (error) => {
  console.error('Deepgram error:', error);

  if (error.message.includes('401')) {
    console.error('❌ Invalid API key');
  } else if (error.message.includes('timeout')) {
    console.error('⚠️ Connection timeout, check network');
  }
});
```

**Solución**:
1. Verificar API key en `.env.local`
2. Test connection: `curl https://api.deepgram.com/v1/listen`
3. Check network/firewall
4. Retry con exponential backoff

### Error: Claude Rate Limit

**Descripción**: Claude API retorna 429 (rate limit exceeded)

**Error**:
```
AnthropicError: Rate limit exceeded, retry after 60 seconds
```

**Causas**:
- Demasiadas requests en corto tiempo
- Free tier limit alcanzado

**Solución**:
```typescript
try {
  const response = await claude.messages.create({ ... });
} catch (error: any) {
  if (error.status === 429) {
    console.warn('⚠️ Claude rate limit, retrying after delay...');

    // Exponential backoff
    await sleep(RETRY_CONFIG.INITIAL_RETRY_DELAY_MS);

    // Retry
    const response = await claude.messages.create({ ... });
  }
}
```

**Prevención**:
- Implement request queueing
- Add rate limiter
- Upgrade Claude plan si necesario

### Error: HeyGen Avatar Not Speaking

**Descripción**: `avatar.speak()` no produce audio

**Síntomas**:
- No audio output
- No lip-sync
- No errors en console

**Causas posibles**:
1. ❌ `task_type: 'TALK'` en lugar de `'REPEAT'`
2. ❌ Audio context suspended (browser policy)
3. ❌ HeyGen session expired

**Debug**:
```typescript
console.log('Avatar config:', {
  task_type: config.task_type,  // Must be 'REPEAT'
  task_mode: config.task_mode,  // Should be 'SYNC'
  text: config.text,
});

avatar.on('avatar_start_speaking', () => {
  console.log('🎤 Avatar started speaking');
});

avatar.on('avatar_stop_speaking', () => {
  console.log('🎤 Avatar stopped speaking');
});
```

**Solución**:
```typescript
// 1. Verify REPEAT mode
await avatar.speak({
  text: claudeResponse,
  task_type: 'REPEAT',  // ← NOT 'TALK'
  task_mode: 'SYNC',
});

// 2. Resume audio context (if suspended)
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}

// 3. Check session status
const sessionInfo = await avatar.getSessionInfo();
console.log('Session status:', sessionInfo.status);
```

### Error: Barge-in Not Working

**Descripción**: Usuario habla pero avatar no se interrumpe

**Síntomas**:
- Deepgram detecta speech
- Pero avatar continúa hablando

**Causas posibles**:
1. ❌ `ENABLE_BARGE_IN` flag disabled
2. ❌ State machine no permite interrupt
3. ❌ Debounce muy alto
4. ❌ VAD events no habilitados en Deepgram

**Debug**:
```typescript
// Check flag
console.log('Barge-in enabled:', CONVERSATION_FEATURES.ENABLE_BARGE_IN);

// Check state
console.log('Can interrupt:', stateMachine.canInterrupt());
console.log('Current state:', stateMachine.getState());

// Listen for VAD events
deepgram.on('SpeechStarted', () => {
  console.log('🎤 Speech detected!');
  if (stateMachine.is(ConversationState.AVATAR_SPEAKING)) {
    console.log('🛑 Should interrupt now');
  }
});
```

**Solución**:
```typescript
// 1. Enable flag
NEXT_PUBLIC_ENABLE_BARGE_IN=true

// 2. Enable VAD in Deepgram config
deepgram: {
  vad_events: true,  // ← Required for barge-in
}

// 3. Reduce debounce if too slow
NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS=50

// 4. Verify interrupt() is called
async interrupt() {
  console.log('🛑 Interrupting avatar');
  await this.avatar.interrupt();
  this.llm.interrupt();
}
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

```bash
# En .env.local
NEXT_PUBLIC_LOG_LATENCY=true
NEXT_PUBLIC_LOG_TRANSCRIPTS=true
NEXT_PUBLIC_LOG_STATE_TRANSITIONS=true
```

**Output esperado**:
```
🎤 STT: User started speaking
📝 Transcript (interim): "Hola"
📝 Transcript (interim): "Hola quiero"
📝 Transcript (final): "Hola, quiero comprar crema."
🔄 State: USER_SPEAKING → PROCESSING
🧠 LLM: Generating response...
🧠 LLM: First token received (200ms)
🧠 LLM: Complete (450ms)
🔄 State: PROCESSING → AVATAR_SPEAKING
🎭 Avatar: Started speaking
⏱️ Latency breakdown:
   STT: 350ms
   LLM: 450ms
   TTS: 180ms
   Total: 980ms
🎭 Avatar: Stopped speaking
🔄 State: AVATAR_SPEAKING → IDLE
```

### Check Feature Flags

```typescript
import { getFeatureStatus, logConfiguration } from '@/config/features';

// Log all config on startup
useEffect(() => {
  logConfiguration();
  console.log('All features:', getFeatureStatus());
}, []);
```

### Monitor State Machine

```typescript
const stateMachine = new ConversationStateMachine();

// Log all transitions
stateMachine.onStateChange((transition) => {
  console.log(`🔄 ${transition.from} → ${transition.to}`, transition.reason);
});

// Get stats
console.log('Stats:', stateMachine.getStats());
// {
//   totalTransitions: 25,
//   stateCount: { IDLE: 10, USER_SPEAKING: 5, ... },
//   averageTimePerState: { IDLE: 2000, USER_SPEAKING: 1500, ... }
// }
```

### Test Providers Individually

```typescript
// Test Deepgram alone
const stt = new DeepgramStreamingSTT(apiKey);
await stt.startListening();
stt.onTranscript((text) => console.log('📝', text));

// Test Claude alone
const llm = new ClaudeStreamingLLM({ apiKey, systemPrompt });
for await (const chunk of llm.streamResponse('Hola')) {
  console.log('🧠', chunk);
}

// Test HeyGen alone
const avatar = new HeyGenAvatarProvider(avatarInstance);
await avatar.speak('Hola, soy Clara', 'REPEAT');
```

---

## 📚 FAQs

### Q: ¿Por qué Deepgram usa es-419 y no es-CL?

**A**: Deepgram NO soporta `es-CL` (Chilean Spanish) como lenguaje específico. `es-419` (Latin American Spanish) es la opción más cercana.

Ver: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#3-deepgram-es-419-lat-am-spanish-vs-es-cl-chilean)

### Q: ¿Cómo interrumpo Claude streaming?

**A**: Usa `AbortController` pattern:

```typescript
this.abortController = new AbortController();
const stream = await claude.messages.stream({ ... }, {
  signal: this.abortController.signal
});

// To interrupt:
this.abortController.abort();
```

Ver: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#4-claude-haiku-45-streaming-con-abortcontroller)

### Q: ¿Por qué REPEAT mode y no TALK mode?

**A**: TALK mode usa GPT-4o mini interno de HeyGen, lo cual impide:
- Personalización del LLM
- Custom prompts (FASE 0)
- Control de barge-in
- Métricas precisas

REPEAT mode da control total usando Claude.

Ver: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#5-heygen-repeat-mode-tts-only-vs-talk-mode-with-llm)

### Q: ¿Cuál es la latencia target realista?

**A**: **600-800ms** total, NO 500ms.

Breakdown:
- Deepgram: ~100ms
- Claude: ~200ms TTFT
- HeyGen: ~150ms
- Network: ~100-200ms
- **Total**: 600-800ms

Ver: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#6-target-de-latencia-600-800ms-realista-vs-500ms-aspiracional)

### Q: ¿Cómo habilito features gradualmente?

**A**: Usa feature flags en Vercel:

1. Development: Enable en `.env.local`
2. Staging: Enable en Vercel preview branch
3. Production: Enable manualmente en Vercel production env vars

Ver: [05-CONFIGURATION.md](./05-CONFIGURATION.md#progressive-rollout-strategy)

### Q: ¿Qué hacer si Deepgram falla?

**A**: Sistema tiene retry + fallback automático:

1. Retry 3x con exponential backoff
2. Si sigue fallando → switch a HeyGen built-in voice chat
3. Usuario ve: "Cambiando a modo de respaldo..."

Ver: [01-PLAN.md](./01-PLAN.md#fase-3-fallback-system--error-recovery)

### Q: ¿Cómo pruebo sin gastar API credits?

**A**: Implementar mock mode (FASE 2):

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Esto usará:
- Mock transcripts (no Deepgram)
- Mock LLM responses (no Claude)
- Solo HeyGen real (para avatar)

**Status**: ⏳ No implementado aún

### Q: ¿El sistema mantiene contexto multi-turn?

**A**: Sí, `ClaudeStreamingLLM` mantiene `conversationHistory`:

```typescript
conversationHistory = [
  { role: 'user', content: 'Hola' },
  { role: 'assistant', content: 'Hola, ¿cómo puedo ayudarte?' },
  { role: 'user', content: 'Quiero crema' },
  { role: 'assistant', content: 'Te recomiendo...' },
];
```

Esto se pasa a Claude en cada request para mantener contexto.

### Q: ¿Cómo limpio history si conversación muy larga?

**A**: Llamar `llm.clearHistory()`:

```typescript
// Option 1: Clear after N turns
if (conversationHistory.length > 20) {
  llm.clearHistory();
}

// Option 2: Clear on explicit user request
if (userMessage.includes('empezar de nuevo')) {
  llm.clearHistory();
  return 'Perfecto, empecemos de nuevo. ¿En qué puedo ayudarte?';
}

// Option 3: Clear on new session
onNewSession(() => {
  llm.clearHistory();
});
```

---

## 🔧 Common Fixes

### Fix: Deepgram No Audio Input

**Síntoma**: Deepgram conecta pero no recibe audio

**Causa**: Permissions o MediaRecorder issues

**Fix**:
```typescript
// Request permissions explicitly
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
  }
});

// Verify stream is active
console.log('Audio tracks:', stream.getAudioTracks().map(t => ({
  enabled: t.enabled,
  muted: t.muted,
  readyState: t.readyState,
})));
```

### Fix: Claude Timeout

**Síntoma**: Claude no responde después de 10s

**Causa**: Prompt muy largo o API issue

**Fix**:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const stream = await claude.messages.stream({ ... }, {
    signal: controller.signal
  });
  // ...
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('❌ Claude timeout, fallback');
    fallbackManager.triggerFallback('claude');
  }
} finally {
  clearTimeout(timeout);
}
```

### Fix: Memory Leak en Avatar

**Síntoma**: Memory crece después de múltiples sessions

**Causa**: Event listeners no limpiados

**Fix**:
```typescript
async cleanup(): Promise<void> {
  // Remove ALL listeners
  const events = [
    'stream_ready',
    'stream_disconnected',
    'avatar_start_speaking',
    'avatar_stop_speaking',
    // ... todos los eventos
  ];

  events.forEach(event => {
    this.avatar.removeAllListeners(event);
  });

  await this.avatar.stopAvatar();
  this.avatar = null;
}
```

---

## 📞 Support

### Internal Issues

Documentar nuevos issues en este archivo con formato:

```markdown
### Error: [Título Descriptivo]

**Descripción**: [Qué pasa]

**Error**:
```
[Error message]
```

**Causa**: [Por qué pasa]

**Solución**:
```typescript
// Code fix
```

**Priority**: 🔴 High / 🟡 Medium / 🟢 Low

**Reportado**: YYYY-MM-DD
```

### External Dependencies

- **Deepgram**: https://support.deepgram.com/
- **Anthropic**: https://support.anthropic.com/
- **HeyGen**: https://support.heygen.com/
- **Shopify**: https://help.shopify.com/

---

**Última actualización**: 2025-11-22
**Próxima revisión**: Cuando aparezcan nuevos issues en FASE 1 implementation
