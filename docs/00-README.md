# Documentación del Sistema de Conversación en Tiempo Real de Clara

**Última actualización**: 2025-11-22
**Branch actual**: `test/personalized-llm`
**Estado**: FASE 0 completa ✅, FASE 1 fundamentos completos ✅, implementación de providers pendiente

---

## 📚 Índice de Documentación

Esta documentación preserva el contexto completo del proyecto de integración de Claude Haiku 4.5 como LLM personalizado para Clara, reemplazando el sistema interno de HeyGen.

### Documentos Principales

1. **[01-PLAN.md](./01-PLAN.md)** - Plan Completo de 4 Fases
   - Objetivos por fase
   - Entregables y criterios de éxito
   - Timeline y estado actual
   - Commits y fechas

2. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - Decisiones Arquitectónicas
   - Por qué es-419 y no es-CL
   - Patrón AbortController para Claude
   - REPEAT mode vs TALK mode
   - Target de latencia (600-800ms)
   - Arquitectura de providers pluggables

3. **[03-CURRENT-STATE.md](./03-CURRENT-STATE.md)** - Estado Actual del Proyecto
   - Snapshot exacto del progreso
   - Archivos creados vs pendientes
   - Feature flags habilitados
   - Dependencies instaladas vs faltantes
   - Variables de entorno configuradas
   - Próximo paso inmediato

4. **[04-TECHNOLOGIES.md](./04-TECHNOLOGIES.md)** - Tecnologías y Proveedores
   - Deepgram Nova-2 (STT, es-419, VAD)
   - Claude Haiku 4.5 (streaming, interrupt)
   - HeyGen StreamingAvatar SDK v2.0.13
   - Shopify GraphQL (metafields)
   - Best practices y pitfalls

5. **[05-CONFIGURATION.md](./05-CONFIGURATION.md)** - Configuración y Feature Flags
   - Todas las variables de entorno
   - Feature flags y cómo usarlos
   - Configuración de providers
   - Timing settings

6. **[06-TROUBLESHOOTING.md](./06-TROUBLESHOOTING.md)** - Troubleshooting y Problemas Conocidos
   - Shopify plan limitation
   - Errores comunes
   - Soluciones aplicadas
   - FAQs

7. **[07-NEXT-STEPS.md](./07-NEXT-STEPS.md)** - Próximos Pasos Detallados
   - FASE 1.3: Deepgram provider
   - FASE 1.4: Claude provider
   - FASE 1.5: HeyGen wrapper
   - FASE 1.6: Conversation manager
   - FASE 1.7: Barge-in handler
   - FASE 1.8: Testing completo

---

## 🎯 Resumen Ejecutivo

### Objetivo Principal
Crear un sistema de conversación en tiempo real que se sienta como "una llamada telefónica" entre Clara y el usuario, utilizando:
- **Deepgram** para Speech-to-Text en español chileno (es-419)
- **Claude Haiku 4.5** para generación de respuestas personalizadas
- **HeyGen** para Text-to-Speech y avatar visual (modo REPEAT, sin LLM interno)

### Características Clave
- ✅ **Personalización vía Shopify**: Saludos personalizados con nombre, tipo de piel, concerns (FASE 0)
- ⏳ **Pipeline de voz streaming**: Audio → Deepgram → Claude → HeyGen (FASE 1)
- ⏳ **Barge-in support**: Usuario puede interrumpir a Clara mientras habla (FASE 1)
- ⏳ **Latency target**: 600-800ms total (FASE 2)
- ⏳ **Fallback automático**: Switch a HeyGen built-in si falla custom stack (FASE 3)

### Estado Actual
- **FASE 0** (Shopify Integration): ✅ Completa - infraestructura lista, testing bloqueado por plan de Shopify
- **FASE 1.1-1.2** (Foundation): ✅ Completa - interfaces, state machine, feature flags
- **FASE 1.3-1.7** (Providers): ⏳ Pendiente - Deepgram, Claude, HeyGen wrappers
- **FASE 2-4**: ❌ No iniciadas

### Próximo Paso Inmediato
Implementar `DeepgramStreamingSTT` provider (FASE 1.3) con configuración es-419 y VAD events.

---

## 🚀 Quick Start

### Para Desarrolladores Nuevos

1. **Lee el contexto**:
   ```bash
   cat docs/01-PLAN.md          # Entiende el plan completo
   cat docs/02-ARCHITECTURE.md  # Entiende las decisiones técnicas
   cat docs/03-CURRENT-STATE.md # Verifica dónde estamos
   ```

2. **Revisa el código actual**:
   ```bash
   # Interfaces y contratos
   cat lib/realtime-conversation/interfaces.ts

   # State machine
   cat lib/realtime-conversation/state-machine.ts

   # Feature flags
   cat config/features.ts

   # Personalización de Shopify
   cat lib/personalization/types.ts
   cat lib/personalization/prompt-template.ts
   ```

3. **Siguiente tarea**:
   ```bash
   cat docs/07-NEXT-STEPS.md  # Lee FASE 1.3 detalladamente
   ```

### Para Continuar el Desarrollo

Si retomas este proyecto después de un tiempo:
1. Lee `03-CURRENT-STATE.md` para ver el snapshot exacto
2. Revisa `07-NEXT-STEPS.md` para el próximo paso
3. Consulta `04-TECHNOLOGIES.md` si necesitas refrescar APIs
4. Usa `06-TROUBLESHOOTING.md` si encuentras errores conocidos

---

## 📦 Estructura del Proyecto

```
v0-clara/
├── lib/
│   ├── realtime-conversation/          # Sistema de conversación (FASE 1)
│   │   ├── interfaces.ts               # ✅ Interfaces de providers
│   │   ├── state-machine.ts            # ✅ State machine con barge-in
│   │   └── providers/                  # ⏳ Implementaciones pendientes
│   │       ├── stt/
│   │       │   └── deepgram-streaming.ts
│   │       ├── llm/
│   │       │   └── claude-streaming.ts
│   │       └── avatar/
│   │           └── heygen-wrapper.ts
│   ├── personalization/                # Sistema de personalización (FASE 0)
│   │   ├── types.ts                    # ✅ Interfaces
│   │   ├── shopify-fetcher.ts          # ✅ Fetch con cache 24h
│   │   └── prompt-template.ts          # ✅ Template engine
│   └── shopify-client.ts               # ✅ GraphQL client (metafields)
├── config/
│   └── features.ts                     # ✅ Feature flags y config
├── app/
│   └── api/
│       └── customer-data/
│           └── route.ts                # ✅ Endpoint de datos de cliente
└── docs/                               # 📚 Documentación completa
    ├── 00-README.md                    # ← Estás aquí
    ├── 01-PLAN.md
    ├── 02-ARCHITECTURE.md
    ├── 03-CURRENT-STATE.md
    ├── 04-TECHNOLOGIES.md
    ├── 05-CONFIGURATION.md
    ├── 06-TROUBLESHOOTING.md
    └── 07-NEXT-STEPS.md
```

---

## 🔗 Links Importantes

### Documentación de APIs
- [Deepgram Streaming API](https://developers.deepgram.com/docs/streaming)
- [Deepgram Language Models](https://developers.deepgram.com/docs/models-languages-overview)
- [Claude Messages API](https://docs.anthropic.com/en/api/messages)
- [Claude Streaming](https://docs.anthropic.com/en/api/messages-streaming)
- [HeyGen StreamingAvatar SDK](https://docs.heygen.com/docs/streaming-avatar-sdk)
- [Shopify GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Shopify Metafields](https://shopify.dev/docs/apps/custom-data/metafields)

### Repositorios Oficiales
- [@deepgram/sdk](https://github.com/deepgram/deepgram-node-sdk)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)
- [HeyGen SDK Examples](https://github.com/HeyGen-Official/StreamingAvatarSDK)

### Internal Links
- [CLAUDE.md](../CLAUDE.md) - Main project instructions
- [README.md](../README.md) - Project README

---

## ⚠️ Avisos Importantes

### Shopify Plan Limitation
La infraestructura de personalización (FASE 0) está completa pero **no puede ser probada** hasta que el plan de Shopify permita acceso a la API de clientes. Ver `06-TROUBLESHOOTING.md` para detalles.

### Feature Flags
Todas las features de FASE 1 están **deshabilitadas por defecto** en `config/features.ts`. Se habilitan manualmente conforme se completan y prueban.

### Latency Target
El target de latencia es **600-800ms**, no 500ms. Esto es realista con la arquitectura cloud actual. Ver `02-ARCHITECTURE.md` para el análisis completo.

### Español Chileno
Deepgram no soporta `es-CL` nativamente. Usamos `es-419` (LAT-AM Spanish) como aproximación más cercana. Ver `04-TECHNOLOGIES.md` para detalles.

---

## 📞 Contacto y Mantenimiento

**Branch de desarrollo**: `test/personalized-llm`
**Branch de producción**: `main` (no tocar hasta FASE 1 completa y probada)

Para reportar issues o pérdida de contexto, documentar en `06-TROUBLESHOOTING.md`.

---

**Generado**: 2025-11-22
**Commits relevantes**:
- `a8e78ff` - FASE 0: Shopify personalization system
- `75f078a` - FASE 1: Conversation system foundation
