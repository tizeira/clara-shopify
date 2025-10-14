# 🚀 QUICK REFERENCE - Fases 1 & 2

## Comandos Esenciales

```bash
# Iniciar servidor
npm run dev

# Verificar TypeScript
npm run type-check

# Build de producción
npm run build

# Test automatizado
node scripts/test-shopify-integration.js
```

## Health Check

```bash
# Navegador:
http://localhost:3000/api/shopify-customer

# Terminal:
curl http://localhost:3000/api/shopify-customer

# Esperado: {"status":"ok","configured":true}
```

## Generar Token HMAC

```javascript
node
> const crypto = require('crypto');
> const secret = 'TU_SHOPIFY_HMAC_SECRET';
> const customerId = 'CUSTOMER_ID';
> crypto.createHmac('sha256', secret).update(customerId).digest('hex');
```

## Test Customer Data

```bash
curl -X POST http://localhost:3000/api/shopify-customer \
  -H "Content-Type: application/json" \
  -d '{"shopify_token":"TOKEN","customer_id":"ID"}'
```

## Variables Requeridas

```bash
SHOPIFY_HMAC_SECRET=64_caracteres_aleatorios
SHOPIFY_STORE_DOMAIN=tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
```

## Permisos Shopify App

- ✅ read_customers
- ✅ read_orders

## Obtener Customer ID

Shopify Admin → Customers → Click cliente → Copiar número de URL:
```
https://admin.shopify.com/store/TU-TIENDA/customers/1234567890
                                                      ^^^^^^^^^^
                                                      Customer ID
```

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `configured: false` | Variables no cargadas | Reiniciar servidor |
| `401` | Token inválido | Regenerar token con mismo secret |
| `404` | Customer no existe | Verificar ID en Shopify |
| `500` | Credenciales incorrectas | Verificar STORE_DOMAIN y ACCESS_TOKEN |

## Estructura de Respuesta

```json
{
  "success": true,
  "customer": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "ordersCount": number,
    "recentOrders": [
      {
        "name": "#1001",
        "date": "15 de enero de 2025",
        "items": [
          {"title": "Producto", "quantity": 1}
        ]
      }
    ]
  }
}
```

## Archivos Clave

```
lib/
  shopify-security.ts    - Validación HMAC
  shopify-client.ts      - Cliente GraphQL

app/api/shopify-customer/
  route.ts              - Endpoint POST/GET

docs/
  FASE_1_CONFIGURACION_PASO_A_PASO.md  - Guía detallada
  CHECKLIST_FASE_1.md                  - Checklist
  QUICK_REFERENCE.md                   - Esta guía

scripts/
  test-shopify-integration.js          - Test automatizado
```

## URLs Útiles

- Shopify Admin: https://admin.shopify.com
- Apps Settings: Settings → Apps and sales channels → Develop apps
- Random String Generator: https://www.random.org/strings/

## Test Fase 2 - URL Personalizada

```bash
# Abrir Clara sin customer data (modo genérico)
http://localhost:3001

# Abrir Clara con customer data (modo personalizado)
http://localhost:3001?shopify_token=TOKEN&customer_id=ID
```

## Verificar Personalización

```javascript
// DevTools → Console (cuando abres URL con params)

// ✅ Con customer data:
✅ Customer data loaded: Juan Pérez
✅ Using personalized knowledge base for: Juan Pérez

// ℹ️  Sin customer data:
ℹ️  No customer data - using default knowledge base
```

## Archivos Modificados en Fase 2

```
app/
  page.tsx                                 - Detecta URL params y fetch data

components/
  help-assistant-widget.tsx                - Recibe customerData como prop

hooks/avatar/
  context.tsx                              - Agrega customerData al Context
  useStreamingAvatarSession.ts             - Personaliza knowledgeBase
```

## Next Steps

✅ Fase 1 completa → API Middleware
✅ Fase 2 completa → Clara Frontend
⏳ Fase 3 → Shopify Liquid Templates
📄 Ver: `docs/INTEGRATION_ROADMAP.md`

## Soporte

```bash
# Ver documentación completa
cat docs/FASE_1_CONFIGURACION_PASO_A_PASO.md  # Fase 1
cat docs/FASE_2_IMPLEMENTACION.md             # Fase 2
cat docs/TESTING_FASE_2.md                    # Testing

# Ejecutar tests Fase 1
node scripts/test-shopify-integration.js
```
