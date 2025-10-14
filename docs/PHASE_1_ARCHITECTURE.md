# Fase 1: Arquitectura de Seguridad y API Middleware

## 📊 Resumen Ejecutivo

Esta fase establece la **infraestructura de seguridad** necesaria para la integración Shopify-Clara. Proporciona:

- Validación HMAC de tokens
- Cliente GraphQL para Shopify Admin API
- Endpoint REST seguro para obtener customer data
- Base escalable para Fases 2 y 3

## 🏗️ Estructura de Archivos Creados

```
v0-clara/
├── lib/
│   ├── shopify-security.ts      # Funciones HMAC y validación
│   └── shopify-client.ts        # Cliente GraphQL + formateo
├── app/api/shopify-customer/
│   └── route.ts                 # Endpoint POST/GET
├── docs/
│   ├── SHOPIFY_SETUP.md         # Guía de configuración
│   └── PHASE_1_ARCHITECTURE.md  # Este archivo
└── .env.example                 # Variables documentadas
```

## 🔐 Componente 1: Seguridad (lib/shopify-security.ts)

### Funciones Exportadas:

**`generateCustomerToken(customerId: string): string`**
- Genera token HMAC-SHA256 del customer ID
- Usa `SHOPIFY_HMAC_SECRET` como clave
- Mismo algoritmo que Liquid `hmac_sha256`

**`verifyCustomerToken(token: string, customerId: string): boolean`**
- Verifica que el token es válido para el customer ID
- Usa `crypto.timingSafeEqual()` para prevenir timing attacks
- Retorna `false` en cualquier error (fail-safe)

**`isValidCustomerId(customerId: string): boolean`**
- Valida formato de ID de Shopify (numérico, >5 dígitos)
- Previene inyección de valores maliciosos

### Flujo de Seguridad:

```
Shopify Liquid Template
  ↓
Genera token = hmac_sha256(customer.id, SECRET)
  ↓
Pasa token + customer_id vía URL
  ↓
Clara recibe y verifica:
  - ¿Token válido? → verifyCustomerToken()
  - ¿ID válido? → isValidCustomerId()
  ↓
Si ambos OK → Procede
Si alguno falla → 400/401 error
```

## 🔌 Componente 2: Cliente Shopify (lib/shopify-client.ts)

### Interfaces:

```typescript
ShopifyCustomer {
  id: string
  firstName, lastName, email: string
  ordersCount: number
  orders: ShopifyCustomerOrder[]
}

ClaraCustomerData {
  firstName, lastName, email: string
  ordersCount: number
  recentOrders: [{ name, date, items[] }]
}
```

### Funciones Exportadas:

**`fetchShopifyCustomer(customerId: string): Promise<ShopifyCustomer | null>`**
- Consulta Shopify Admin GraphQL API
- Obtiene datos del cliente + últimas 10 órdenes
- Cada orden incluye hasta 20 line items
- Maneja errores y retorna `null` si falla

**`formatCustomerForClara(customer: ShopifyCustomer): ClaraCustomerData`**
- Transforma datos de Shopify a formato optimizado
- Solo incluye últimas 5 órdenes (para performance)
- Formatea fechas a español mexicano
- Simplifica estructura para Clara

**`generateKnowledgeBaseContext(customerData: ClaraCustomerData): string`**
- Genera el texto para el campo `knowledgeBase` de HeyGen
- Incluye instrucciones para Clara sobre cómo usar los datos
- Formato optimizado para comprensión del avatar

### Query GraphQL:

```graphql
query getCustomer($id: ID!) {
  customer(id: $id) {
    firstName, lastName, email
    numberOfOrders
    orders(first: 10, reverse: true) {
      edges {
        node {
          name, createdAt
          totalPriceSet { shopMoney { amount, currencyCode } }
          lineItems(first: 20) {
            edges {
              node {
                title, quantity
                variant { title }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🌐 Componente 3: API Endpoint (app/api/shopify-customer/route.ts)

### POST /api/shopify-customer

**Request Body:**
```json
{
  "shopify_token": "abc123...",
  "customer_id": "1234567890"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "customer": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "ordersCount": 3,
    "recentOrders": [
      {
        "name": "#1001",
        "date": "15 de enero de 2024",
        "items": [
          { "title": "Crema Hidratante", "quantity": 2 }
        ]
      }
    ]
  }
}
```

**Errores:**
- `400` - Campos faltantes o customer_id inválido
- `401` - Token HMAC inválido
- `404` - Customer no encontrado en Shopify
- `500` - Error de Shopify API o configuración

### GET /api/shopify-customer

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "shopify-customer-api",
  "configured": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## 🔗 Integración con Fase 2 (Clara Frontend)

### Cómo Fase 2 usará esta infraestructura:

**En `app/page.tsx`:**
```typescript
// Detectar modo Shopify
const urlParams = new URLSearchParams(window.location.search);
const shopifyToken = urlParams.get('shopify_token');
const customerId = urlParams.get('customer_id');

if (shopifyToken && customerId) {
  // Llamar API creada en Fase 1
  const response = await fetch('/api/shopify-customer', {
    method: 'POST',
    body: JSON.stringify({ shopify_token, customer_id })
  });

  const { customer } = await response.json();
  // Pasar customer a Context
}
```

**En `hooks/avatar/context.tsx`:**
```typescript
// Agregar customerData al Context
<StreamingAvatarProvider customerData={customer}>
```

**En `hooks/avatar/useStreamingAvatarSession.ts`:**
```typescript
// Usar generateKnowledgeBaseContext
import { generateKnowledgeBaseContext } from '@/lib/shopify-client';

if (customerData) {
  config.knowledgeBase = generateKnowledgeBaseContext(customerData);
}
```

## 🔗 Integración con Fase 3 (Shopify Templates)

### Cómo Fase 3 usará esta infraestructura:

**En `snippets/clara-fullscreen.liquid`:**
```liquid
{% comment %} Generar token usando mismo algoritmo {% endcomment %}
{% assign customer_token = customer.id | hmac_sha256: settings.shopify_hmac_secret %}

<iframe
  src="https://clara.app?shopify_token={{ customer_token }}&customer_id={{ customer.id }}">
</iframe>
```

El token generado en Liquid será validado por `verifyCustomerToken()` de Fase 1.

## 📈 Ventajas de esta Arquitectura

### 1. Seguridad por Capas
- ✅ Token HMAC (no puede ser falsificado sin SECRET)
- ✅ Validación de formato de ID
- ✅ Verificación timing-safe
- ✅ Datos nunca expuestos en frontend

### 2. Separación de Concerns
- ✅ Seguridad → `lib/shopify-security.ts`
- ✅ Data fetching → `lib/shopify-client.ts`
- ✅ API routing → `app/api/shopify-customer/route.ts`
- ✅ Cada módulo es testeable independientemente

### 3. Error Handling Robusto
- ✅ Cada función maneja sus propios errores
- ✅ Logs detallados en development
- ✅ Mensajes seguros en production
- ✅ Status codes HTTP correctos

### 4. Escalabilidad
- ✅ Fácil agregar más endpoints Shopify
- ✅ Fácil extender customer data
- ✅ Preparado para rate limiting (futuro)
- ✅ Preparado para caching (futuro)

## 🧪 Testing de Fase 1

### Verificar que TODO funciona:

```bash
# 1. Variables configuradas
npm run dev
curl http://localhost:3000/api/shopify-customer
# configured: true

# 2. Token válido funciona
node -e "
const crypto = require('crypto');
const token = crypto.createHmac('sha256', 'SECRET').update('123456').digest('hex');
console.log(JSON.stringify({ shopify_token: token, customer_id: '123456' }));
" | curl -X POST http://localhost:3000/api/shopify-customer -d @-

# 3. Token inválido rechazado
curl -X POST http://localhost:3000/api/shopify-customer \
  -d '{"shopify_token":"fake","customer_id":"123456"}' \
  -H "Content-Type: application/json"
# Status: 401

# 4. Build sin errores
npm run build
# ✓ Compiled successfully
```

## 🚀 Próximos Pasos

Una vez validada Fase 1:

1. **Fase 2**: Modificar Clara para consumir esta API
2. **Fase 3**: Crear templates Shopify que generen tokens
3. **Fase 4**: Testing end-to-end completo

## 📊 Métricas de Fase 1

- **Archivos creados**: 5
- **Archivos modificados**: 1
- **Funciones públicas**: 6
- **Endpoints API**: 2 (POST + GET)
- **TypeScript errors**: 0
- **Build time**: ~30 segundos
- **Tiempo de implementación**: 2-2.5 horas

---

**Status**: ✅ Fase 1 Completa
**Fecha**: Enero 2025
**Versión**: 1.0.0
