# Changelog - Clara Shopify Integration

## [2.0.0] - 2025-12-03 (FASE 2 Complete)

### Added
- **Shopify Liquid Integration**: Bypass Basic Plan PII restrictions via URL params
- **HMAC Security**: Token validation between Liquid templates and backend
- **Data Merge Strategy**: Liquid PII + API non-PII data combined
- **Real-time Conversation Pipeline**: STT → LLM → Avatar architecture

### Changed
- Customer data flow: Liquid → URL params → Widget → API merge
- Widget URL now accepts `first_name`, `last_name`, `email`, `orders_count` params

### Security
- HMAC-SHA256 token validation prevents URL tampering
- Secret must match in Vercel env AND Shopify metafield `custom.hmac_secret`

### Files Added
- `shopify/templates/page.clara.liquid` - Shopify page template
- `shopify/templates/page.clara-hybrid.liquid` - Alternative hybrid template
- `lib/realtime-conversation/` - Complete conversation pipeline
- `config/features.ts` - Feature flags configuration

---

## [1.0.0] - 2025-11-26 (FASE 1 Complete)

### Added
- **Shopify Personalization System**: Customer data fetching and caching
- **Chilean Spanish Prompts**: Natural expressions ("cachai", "bacán")
- **Secure API Endpoint**: POST `/api/shopify-customer` with HMAC auth
- **Basic Plan Workaround**: Query without PII fields for Basic plan

### Changed
- Removed insecure GET `/api/customer-data` endpoint
- Consolidated prompt system in `lib/shopify-client.ts`
- Added `buildPersonalizedPrompt()` function

### Security
- HMAC-SHA256 token validation
- No PII stored locally
- 24-hour cache for customer data

### Discovered Limitations
- Shopify Basic Plan ($29/mo) blocks PII via Custom App API
- Solution: FASE 2 Liquid integration (bypasses limitation)

---

## Architecture Summary

### Data Flow (FASE 2)
```
Shopify Liquid → URL params (PII) → Widget → Merge with API (metafields)
```

### Production Status
| Component | Status | Notes |
|-----------|--------|-------|
| Shopify Integration | ✅ Ready | FASE 0 + FASE 2 |
| Liquid Templates | ✅ Ready | Chilean names supported |
| Conversation Pipeline | ⚠️ Partial | STT needs Spanish (Nova-3) |
| Real-time Voice | ⏳ Pending | Not integrated in widget |

### Cost Savings
- No Shopify plan upgrade needed ($600/year saved)
- Full personalization on Basic Plan via Liquid workaround
