# Configuración y Feature Flags

**Última actualización**: 2025-11-22
**Propósito**: Guía completa de configuración del sistema

---

## 🔑 Variables de Entorno

### HeyGen (Required)

```bash
# API Key
HEYGEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API Base URL
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com

# Avatar IDs
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Katya_CasualLook_public          # Mobile (portrait)
NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID=Katya_Chair_Sitting_public  # Desktop (landscape)

# Voice ID
NEXT_PUBLIC_HEYGEN_VOICE_ID=0e69c649917e4a6da0f9a9e1fe02f498

# Knowledge Base ID (Clara's skincare knowledge)
NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID=251ae2b8b812448d9d03efbc354c9b98
```

**Dónde obtener**:
- API Key: https://app.heygen.com/settings/api
- Avatar IDs: https://app.heygen.com/avatars
- Voice ID: https://app.heygen.com/voices
- Knowledge ID: https://app.heygen.com/knowledge-base

### Deepgram (Required para FASE 1.3)

```bash
# API Key
NEXT_PUBLIC_DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Dónde obtener**:
- https://console.deepgram.com/
- Create project → API Keys → Create new key

**Scopes requeridos**:
- `usage:read`
- `member:read`

### Anthropic Claude (Required para FASE 1.4)

```bash
# API Key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Dónde obtener**:
- https://console.anthropic.com/
- Account Settings → API Keys → Create Key

**Important**: Esta key es **server-side only**, no usar `NEXT_PUBLIC_` prefix

### Shopify (Optional - para FASE 0)

```bash
# Store Domain
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com

# Admin Access Token
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# HMAC Secret (for webhook validation)
SHOPIFY_HMAC_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Dónde obtener**:
- Admin Access Token: Shopify Admin → Apps → Develop apps → Create app → API credentials
- HMAC Secret: Generate with `openssl rand -hex 32`

**Scopes requeridos**:
- `read_customers`
- `read_orders`

**Status actual**: ⚠️ No configurado (plan limitation)

### OpenAI (Legacy - ya no es critical)

```bash
# API Key
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Status**: Usado en features legacy, no critical para FASE 1

### Auth (Optional)

```bash
# Enable password protection
NEXT_PUBLIC_AUTH_ENABLED=false

# Password (si AUTH_ENABLED=true)
NEXT_PUBLIC_ACCESS_PASSWORD=your_password_here
```

---

## 🎚️ Feature Flags

**Ubicación**: `config/features.ts`

### CONVERSATION_FEATURES

#### FASE 1 Features

```typescript
// Enable Deepgram streaming STT (vs Whisper batch)
ENABLE_STREAMING_STT: process.env.NEXT_PUBLIC_ENABLE_STREAMING_STT === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 1.3 implementada y testeada
**Env var**: `NEXT_PUBLIC_ENABLE_STREAMING_STT=true`

---

```typescript
// Enable Claude streaming responses (vs simple API calls)
ENABLE_STREAMING_LLM: process.env.NEXT_PUBLIC_ENABLE_STREAMING_LLM === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 1.4 implementada y testeada
**Env var**: `NEXT_PUBLIC_ENABLE_STREAMING_LLM=true`

---

```typescript
// Enable barge-in (user can interrupt Clara)
ENABLE_BARGE_IN: process.env.NEXT_PUBLIC_ENABLE_BARGE_IN === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 1.7 implementada y testeada
**Env var**: `NEXT_PUBLIC_ENABLE_BARGE_IN=true`

---

```typescript
// Show interim transcripts in UI (real-time feedback)
ENABLE_INTERIM_TRANSCRIPTS: process.env.NEXT_PUBLIC_ENABLE_INTERIM_TRANSCRIPTS === 'true' || true
```

**Default**: `true` (safe, UI-only feature)
**Env var**: `NEXT_PUBLIC_ENABLE_INTERIM_TRANSCRIPTS=false` (to disable)

---

#### FASE 2 Features (Optimization)

```typescript
// Enable chunked sending to HeyGen (sentence-by-sentence)
ENABLE_CHUNKED_HEYGEN: process.env.NEXT_PUBLIC_ENABLE_CHUNKED_HEYGEN === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 2 implementada
**Purpose**: Reduce latency percibida enviando frases a HeyGen conforme se generan

---

```typescript
// Enable response caching for common queries
ENABLE_RESPONSE_CACHE: process.env.NEXT_PUBLIC_ENABLE_RESPONSE_CACHE === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 2 implementada
**Purpose**: Cache FAQs comunes para latency ultra-baja

---

```typescript
// Enable connection pre-warming
ENABLE_CONNECTION_POOL: process.env.NEXT_PUBLIC_ENABLE_CONNECTION_POOL === 'true' || false
```

**Default**: `false`
**Habilitar cuando**: FASE 2 implementada
**Purpose**: Pre-warm connections a Deepgram/Claude para eliminar cold start

---

#### FASE 3 Features (Fallback & Recovery)

```typescript
// Enable automatic fallback to HeyGen built-in on failure
ENABLE_AUTO_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_AUTO_FALLBACK === 'true' || true
```

**Default**: `true` (safety feature)
**Purpose**: Auto-switch a HeyGen built-in si Deepgram/Claude fallan 3x

---

```typescript
// Enable retry logic with exponential backoff
ENABLE_RETRY_LOGIC: process.env.NEXT_PUBLIC_ENABLE_RETRY_LOGIC === 'true' || true
```

**Default**: `true` (safety feature)
**Purpose**: Retry con exponential backoff en errores transitorios

---

#### Debugging & Monitoring

```typescript
// Log latency metrics to console
LOG_LATENCY: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_LATENCY === 'true'
```

**Default**: `true` en development, `false` en production
**Override**: `NEXT_PUBLIC_LOG_LATENCY=true` (force enable en production)

---

```typescript
// Log all transcripts to console
LOG_TRANSCRIPTS: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_TRANSCRIPTS === 'true'
```

**Default**: `true` en development, `false` en production
**Override**: `NEXT_PUBLIC_LOG_TRANSCRIPTS=true`

---

```typescript
// Log state transitions
LOG_STATE_TRANSITIONS: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_STATE_TRANSITIONS === 'true'
```

**Default**: `true` en development, `false` en production
**Override**: `NEXT_PUBLIC_LOG_STATE_TRANSITIONS=true`

---

```typescript
// Send analytics events
ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' || false
```

**Default**: `false`
**Purpose**: Enviar eventos a analytics platform (future)

---

### CONVERSATION_TIMING

```typescript
export const CONVERSATION_TIMING = {
  // Deepgram endpointing delay (silence detection)
  ENDPOINTING_DELAY_MS: parseInt(process.env.NEXT_PUBLIC_ENDPOINTING_DELAY_MS || '300', 10),

  // Barge-in detection debounce
  BARGE_IN_DEBOUNCE_MS: parseInt(process.env.NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS || '100', 10),

  // Maximum wait for LLM response
  LLM_TIMEOUT_MS: parseInt(process.env.NEXT_PUBLIC_LLM_TIMEOUT_MS || '10000', 10),

  // Maximum wait for STT response
  STT_TIMEOUT_MS: parseInt(process.env.NEXT_PUBLIC_STT_TIMEOUT_MS || '5000', 10),

  // Cache duration for responses (24 hours)
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,

  // Connection keep-alive interval
  KEEP_ALIVE_INTERVAL_MS: 30000,
} as const;
```

#### Endpointing Delay (300ms)

**Qué es**: Tiempo de silencio antes de considerar que el usuario terminó de hablar

**Default**: 300ms
**Env var**: `NEXT_PUBLIC_ENDPOINTING_DELAY_MS=300`

**Tuning**:
- Si corta palabras: aumentar a `400`
- Si se siente lento: reducir a `250`
- Range recomendado: 200-500ms

#### Barge-in Debounce (100ms)

**Qué es**: Debounce para evitar false positives en detección de interrupción

**Default**: 100ms
**Env var**: `NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS=100`

**Tuning**:
- Si hay false positives (detecta barge-in cuando no hay): aumentar a `200`
- Si es muy lento detectar: reducir a `50`

#### LLM Timeout (10 segundos)

**Qué es**: Tiempo máximo de espera para respuesta de Claude

**Default**: 10000ms (10s)
**Env var**: `NEXT_PUBLIC_LLM_TIMEOUT_MS=10000`

**Notes**: 10s es generoso, Claude Haiku típicamente responde en ~1s

#### STT Timeout (5 segundos)

**Qué es**: Tiempo máximo de espera para transcript de Deepgram

**Default**: 5000ms (5s)
**Env var**: `NEXT_PUBLIC_STT_TIMEOUT_MS=5000`

**Notes**: 5s es generoso, Deepgram típicamente responde en ~100-500ms

---

### PROVIDER_CONFIG

#### Deepgram Configuration

```typescript
deepgram: {
  model: 'nova-2',
  language: 'es-419',              // Latin American Spanish (closest to Chilean)
  smart_format: true,
  interim_results: CONVERSATION_FEATURES.ENABLE_INTERIM_TRANSCRIPTS,
  endpointing: CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
  vad_events: CONVERSATION_FEATURES.ENABLE_BARGE_IN,
}
```

**No son env vars** - hardcoded en config

**Para modificar**: Editar `config/features.ts` directamente

#### Claude Configuration

```typescript
claude: {
  model: 'claude-3-5-haiku-20241022',  // Claude Haiku 4.5
  max_tokens: 150,                      // ~2-3 sentences (15-20 seconds of speech)
  temperature: 0.7,
  stream: CONVERSATION_FEATURES.ENABLE_STREAMING_LLM,
}
```

**No son env vars** - hardcoded en config

**Para modificar**: Editar `config/features.ts` directamente

**Tuning `max_tokens`**:
- Si respuestas muy cortas: aumentar a `200`
- Si respuestas muy largas: reducir a `100`

**Tuning `temperature`**:
- Más consistente: `0.5`
- Más creativo: `0.9`
- Default: `0.7` (balance)

#### HeyGen Configuration

```typescript
heygen: {
  taskType: 'REPEAT' as const,  // Always REPEAT mode (no internal LLM)
  taskMode: 'SYNC' as const,    // Wait for previous speech to finish
}
```

**⚠️ CRITICAL**: `taskType` MUST be `'REPEAT'` always (no TALK mode)

**`taskMode`**:
- `SYNC`: Wait for previous speech to finish before starting new one
- `ASYNC`: Can overlap speeches (not recommended for conversation)

---

### RETRY_CONFIG

```typescript
export const RETRY_CONFIG = {
  // Maximum retry attempts
  MAX_RETRIES: 3,

  // Initial retry delay (ms)
  INITIAL_RETRY_DELAY_MS: 1000,

  // Retry delay multiplier (exponential backoff)
  RETRY_BACKOFF_MULTIPLIER: 2,

  // Maximum retry delay (ms)
  MAX_RETRY_DELAY_MS: 10000,
} as const;
```

**Retry sequence**:
```
Attempt 1: Fail → Wait 1000ms → Retry
Attempt 2: Fail → Wait 2000ms → Retry  (1000 * 2^1)
Attempt 3: Fail → Wait 4000ms → Retry  (1000 * 2^2)
Attempt 4: Fail → Trigger fallback
```

**No son env vars** - hardcoded en config

---

### FALLBACK_CONFIG

```typescript
export const FALLBACK_CONFIG = {
  // Number of consecutive failures before triggering fallback
  FAILURE_THRESHOLD: 3,

  // Services that can trigger fallback
  fallbackTriggers: {
    deepgram: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
    claude: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
  },
} as const;
```

**Threshold**: 3 failures consecutivos → switch a HeyGen built-in

**No son env vars** - hardcoded en config

---

## 📋 Configuration Checklist

### Desarrollo Local

```bash
# .env.local

# HeyGen (required)
HEYGEN_API_KEY=sk-xxx
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Katya_CasualLook_public
NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID=Katya_Chair_Sitting_public
NEXT_PUBLIC_HEYGEN_VOICE_ID=0e69c649917e4a6da0f9a9e1fe02f498
NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID=251ae2b8b812448d9d03efbc354c9b98

# Deepgram (FASE 1.3)
NEXT_PUBLIC_DEEPGRAM_API_KEY=xxx

# Claude (FASE 1.4)
ANTHROPIC_API_KEY=sk-ant-xxx

# Feature flags (habilitar conforme implementes)
NEXT_PUBLIC_ENABLE_STREAMING_STT=false
NEXT_PUBLIC_ENABLE_STREAMING_LLM=false
NEXT_PUBLIC_ENABLE_BARGE_IN=false

# Debug (enabled by default en development)
# NEXT_PUBLIC_LOG_LATENCY=true
# NEXT_PUBLIC_LOG_TRANSCRIPTS=true
```

### Vercel Production

**Environment Variables → Production**:
- Todas las de arriba
- Feature flags empiezan en `false`
- Habilitar manualmente después de testing en preview

**Workflow**:
1. Deploy a preview branch → test con flags enabled
2. Si funciona → enable flag en production
3. Redeploy production

---

## 🧪 Testing Configurations

### Mock Mode (sin API calls)

```bash
# Usar mock data en lugar de APIs reales
NEXT_PUBLIC_USE_MOCK_DATA=true

# Útil para:
# - Testing UI sin gastar credits
# - Desarrollo sin API keys
# - Demo sin backend
```

**Status**: No implementado aún, agregar en FASE 2 si necesario

### Development vs Production

**Development** (`.env.local`):
```bash
NODE_ENV=development

# Logging enabled by default
# Feature flags pueden estar enabled para testing
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true
NEXT_PUBLIC_ENABLE_BARGE_IN=true
```

**Production** (Vercel):
```bash
NODE_ENV=production

# Logging disabled by default
# Feature flags empiezan disabled, habilitar gradualmente
NEXT_PUBLIC_ENABLE_STREAMING_STT=false  # ← Enable manually after testing
NEXT_PUBLIC_ENABLE_STREAMING_LLM=false
NEXT_PUBLIC_ENABLE_BARGE_IN=false
```

---

## 🔄 Progressive Rollout Strategy

### Phase 1: Development

```bash
# Local .env.local
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true
NEXT_PUBLIC_ENABLE_BARGE_IN=true
```

**Test**: Funciona localmente ✅

### Phase 2: Staging (Vercel Preview)

```bash
# Vercel → test/personalized-llm branch → Environment Variables
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true
NEXT_PUBLIC_ENABLE_BARGE_IN=true
```

**Test**: Funciona en Vercel preview ✅

### Phase 3: Production Rollout

**Step 1**: Enable STT only
```bash
# Vercel → Production → Environment Variables
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=false
NEXT_PUBLIC_ENABLE_BARGE_IN=false
```

**Test**: Deepgram funciona en production ✅

**Step 2**: Enable LLM
```bash
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true  # ← Enabled
NEXT_PUBLIC_ENABLE_BARGE_IN=false
```

**Test**: Full pipeline funciona ✅

**Step 3**: Enable Barge-in
```bash
NEXT_PUBLIC_ENABLE_STREAMING_STT=true
NEXT_PUBLIC_ENABLE_STREAMING_LLM=true
NEXT_PUBLIC_ENABLE_BARGE_IN=true  # ← Enabled
```

**Test**: Todo funciona ✅

### Rollback

Si algo falla:
```bash
# Instant rollback sin code changes
NEXT_PUBLIC_ENABLE_STREAMING_STT=false
NEXT_PUBLIC_ENABLE_STREAMING_LLM=false
NEXT_PUBLIC_ENABLE_BARGE_IN=false
```

Redeploy → Back to HeyGen built-in

---

## 🔗 Helper Functions

### isCustomConversationEnabled()

```typescript
export function isCustomConversationEnabled(): boolean {
  return (
    CONVERSATION_FEATURES.ENABLE_STREAMING_STT ||
    CONVERSATION_FEATURES.ENABLE_STREAMING_LLM
  );
}
```

**Usage**:
```typescript
if (isCustomConversationEnabled()) {
  // Use custom pipeline (Deepgram + Claude + HeyGen REPEAT)
  const conversationManager = new ConversationManager({ ... });
  await conversationManager.start();
} else {
  // Use HeyGen built-in (TALK mode)
  await avatar.speak({
    text: userInput,
    task_type: 'TALK',
  });
}
```

### getFeatureStatus()

```typescript
export function getFeatureStatus(): Record<string, boolean | number> {
  return {
    ...CONVERSATION_FEATURES,
    ...CONVERSATION_TIMING,
  };
}
```

**Usage**:
```typescript
console.log('Feature status:', getFeatureStatus());

// Output:
// {
//   ENABLE_STREAMING_STT: false,
//   ENABLE_STREAMING_LLM: false,
//   ENABLE_BARGE_IN: false,
//   ENDPOINTING_DELAY_MS: 300,
//   ...
// }
```

### logConfiguration()

```typescript
export function logConfiguration(): void {
  if (!CONVERSATION_FEATURES.LOG_LATENCY) return;

  console.log('🎛️ Conversation System Configuration:');
  console.log('Features:', {
    streaming_stt: CONVERSATION_FEATURES.ENABLE_STREAMING_STT,
    streaming_llm: CONVERSATION_FEATURES.ENABLE_STREAMING_LLM,
    barge_in: CONVERSATION_FEATURES.ENABLE_BARGE_IN,
    auto_fallback: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
  });
  console.log('Timing:', {
    endpointing_ms: CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
    barge_in_debounce_ms: CONVERSATION_TIMING.BARGE_IN_DEBOUNCE_MS,
  });
  console.log('Providers:', {
    stt: PROVIDER_CONFIG.deepgram.model,
    llm: PROVIDER_CONFIG.claude.model,
    avatar: PROVIDER_CONFIG.heygen.taskType,
  });
}
```

**Usage**:
```typescript
// On app startup
useEffect(() => {
  logConfiguration();
}, []);
```

---

## 📝 Configuration Summary

| Category | Config Location | Override via Env Var | Default |
|----------|----------------|----------------------|---------|
| Feature Flags | `config/features.ts` | ✅ Yes | Disabled |
| Timing | `config/features.ts` | ✅ Yes | 300ms endpointing |
| Provider Config | `config/features.ts` | ❌ No | Hardcoded |
| Retry/Fallback | `config/features.ts` | ❌ No | Hardcoded |
| API Keys | `.env.local` | - | Required |

---

**Última actualización**: 2025-11-22
**Próxima revisión**: Después de implementar FASE 1.3 (agregar Deepgram-specific configs)
