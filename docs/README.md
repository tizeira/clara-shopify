# Clara Shopify Documentation

## Quick Links

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](./CHANGELOG.md) | Version history and feature releases |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions |

## Main Documentation

For primary documentation, see:

- **[../CLAUDE.md](../CLAUDE.md)** - Architecture, commands, and development guide
- **[../SHOPIFY_SETUP.md](../SHOPIFY_SETUP.md)** - Complete Shopify integration setup
- **[../README.md](../README.md)** - Project overview

## Architecture Overview

```
Clara Widget (Next.js)
├── Shopify Integration (FASE 0 + FASE 2)
│   ├── Liquid templates → URL params (PII)
│   └── API endpoint → metafields, orders
│
└── Conversation Pipeline (FASE 1) [Partial]
    ├── STT: Deepgram Flux (English only)
    ├── LLM: Claude Haiku streaming
    └── Avatar: HeyGen REPEAT mode
```

## Status

- **Production Ready**: Shopify personalization (Liquid + API)
- **In Development**: Real-time conversation pipeline
- **Pending**: Spanish STT (Nova-3), widget integration
