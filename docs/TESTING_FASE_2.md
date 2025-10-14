# 🧪 Testing Fase 2 - Integración Clara + Shopify

## 🎯 Objetivo del Testing

Verificar que Clara puede detectar y usar datos del cliente de Shopify para personalizar la experiencia del avatar.

---

## ✅ Pre-requisitos

Antes de probar Fase 2, asegúrate de que Fase 1 esté funcionando:

```bash
# 1. Verificar que el servidor está corriendo
npm run dev

# 2. Health check del API
curl http://localhost:3001/api/shopify-customer

# Esperado:
# {"status":"ok","configured":true}
```

Si Fase 1 no está configurada, lee: `docs/FASE_1_CONFIGURACION_PASO_A_PASO.md`

---

## 🧪 Test 1: Modo Genérico (Sin Customer Data)

**Objetivo:** Verificar que Clara funciona normalmente sin datos de Shopify.

### Pasos:

1. **Abrir Clara sin parámetros:**
   ```
   http://localhost:3001
   ```

2. **Verificar en consola del navegador:**
   ```
   ℹ️  No customer data - using default knowledge base
   ```

3. **Iniciar llamada con Clara**
   - Click en "Iniciar Llamada con Clara"
   - Esperar a que cargue el avatar
   - Verificar que saluda genéricamente

4. **Probar conversación:**
   - "Hola Clara, ¿cómo estás?"
   - Clara debe responder sin mencionar información personal

**Resultado Esperado:**
- ✅ Clara funciona en modo genérico
- ✅ No se carga customer data
- ✅ Avatar usa knowledge base por defecto

---

## 🧪 Test 2: Modo Personalizado (Con Customer Data)

**Objetivo:** Verificar que Clara reconoce al cliente y personaliza su saludo.

### Preparación: Generar URL de Prueba

Usa el script de Fase 1 para generar una URL:

```bash
node scripts/test-shopify-integration.js
```

O genera manualmente:

```javascript
// En Node.js o consola del navegador
const crypto = require('crypto');
const secret = 'TU_SHOPIFY_HMAC_SECRET'; // De .env.local
const customerId = 'CUSTOMER_ID_REAL';   // De Shopify Admin

const token = crypto
  .createHmac('sha256', secret)
  .update(customerId)
  .digest('hex');

console.log(`http://localhost:3001?shopify_token=${token}&customer_id=${customerId}`);
```

### Pasos:

1. **Abrir Clara con URL personalizada:**
   ```
   http://localhost:3001?shopify_token=ABC123...&customer_id=7890123
   ```

2. **Verificar en consola del navegador:**

   Deberías ver:
   ```
   ✅ Customer data loaded: Juan Pérez
   ```

   Si hay un error, verifica:
   - Token HMAC correcto
   - Customer ID existe en Shopify
   - Fase 1 configurada correctamente

3. **Iniciar llamada con Clara**
   - Click en "Iniciar Llamada con Clara"
   - Esperar a que cargue el avatar

4. **Verificar en consola:**
   ```
   ✅ Using personalized knowledge base for: Juan Pérez
   ```

5. **Escuchar saludo inicial:**

   Clara debería decir algo como:
   > "¡Hola Juan! Soy Clara, tu asesora virtual de skincare. ¿En qué puedo ayudarte hoy?"

6. **Probar conversación personalizada:**

   **Prueba A - Reconocimiento de nombre:**
   - Tú: "¿Cuál es mi nombre?"
   - Clara: "Tu nombre es Juan Pérez"

   **Prueba B - Historial de compras:**
   - Tú: "¿Qué productos he comprado antes?"
   - Clara: "Veo que has comprado [nombres de productos]. ¿Te gustaría saber más sobre alguno?"

   **Prueba C - Recomendaciones personalizadas:**
   - Tú: "¿Qué me recomiendas?"
   - Clara: "Basándome en tus compras anteriores de [producto], te recomendaría..."

**Resultado Esperado:**
- ✅ Customer data cargada correctamente
- ✅ Knowledge base personalizado aplicado
- ✅ Clara saluda al cliente por nombre
- ✅ Clara conoce el historial de compras
- ✅ Recomendaciones personalizadas

---

## 🧪 Test 3: Validación de Seguridad

**Objetivo:** Verificar que tokens inválidos son rechazados.

### Test 3.1: Token HMAC Inválido

```
http://localhost:3001?shopify_token=INVALID_TOKEN&customer_id=7890123
```

**Resultado Esperado:**
- ❌ Error en consola: "Failed to load customer data"
- ✅ Clara funciona en modo genérico (fallback)

### Test 3.2: Customer ID Inexistente

```
http://localhost:3001?shopify_token=VALID_TOKEN&customer_id=99999999999
```

**Resultado Esperado:**
- ❌ Error 404: "Customer not found"
- ✅ Clara funciona en modo genérico (fallback)

### Test 3.3: Parámetros Faltantes

```
http://localhost:3001?shopify_token=ABC123
```

**Resultado Esperado:**
- ℹ️  No intenta cargar customer data
- ✅ Clara funciona en modo genérico

---

## 🧪 Test 4: Multiple Customers

**Objetivo:** Verificar que diferentes clientes obtienen diferentes datos.

1. **Genera URLs para 2 clientes diferentes:**
   ```bash
   node scripts/test-shopify-integration.js
   # Ingresa Customer ID 1

   node scripts/test-shopify-integration.js
   # Ingresa Customer ID 2
   ```

2. **Abre cada URL en ventanas diferentes (modo incógnito)**

3. **Verifica que cada sesión tiene datos correctos:**
   - Ventana 1: Clara saluda a Cliente 1
   - Ventana 2: Clara saluda a Cliente 2

**Resultado Esperado:**
- ✅ Cada sesión es independiente
- ✅ No hay contaminación de datos entre clientes

---

## 🧪 Test 5: Network Tab Inspection

**Objetivo:** Verificar el flujo completo en DevTools.

1. **Abrir DevTools (F12) → Network tab**

2. **Abrir URL con customer data:**
   ```
   http://localhost:3001?shopify_token=...&customer_id=...
   ```

3. **Verificar requests:**

   **Request 1: Initial page load**
   ```
   GET / 200 OK
   ```

   **Request 2: Customer data fetch**
   ```
   POST /api/shopify-customer 200 OK
   Request Payload:
   {
     "shopify_token": "abc123...",
     "customer_id": "7890123"
   }

   Response:
   {
     "success": true,
     "customer": {
       "firstName": "Juan",
       "lastName": "Pérez",
       "email": "juan@example.com",
       "ordersCount": 3,
       "recentOrders": [...]
     }
   }
   ```

   **Request 3: HeyGen token**
   ```
   POST /api/get-access-token 200 OK
   ```

   **Request 4: HeyGen avatar session**
   ```
   WebSocket connection to HeyGen
   ```

**Resultado Esperado:**
- ✅ Todos los requests retornan 200
- ✅ Customer data es correcta
- ✅ No se exponen credenciales de Shopify en el cliente
- ✅ Token HMAC nunca aparece en logs del cliente

---

## 🧪 Test 6: Console Logs Validation

**Objetivo:** Verificar que los logs son correctos.

Abre: `DevTools → Console`

### Logs Esperados (Sin Customer Data):

```
ℹ️  No customer data - using default knowledge base
```

### Logs Esperados (Con Customer Data):

```
✅ Customer data loaded: Juan Pérez
✅ Using personalized knowledge base for: Juan Pérez
```

### Logs NO Esperados (Errores):

```
❌ Failed to load customer data: Invalid authentication token
❌ Failed to load customer data: Customer not found
```

Si ves errores, consulta Troubleshooting.

---

## 🐛 Troubleshooting

### Error: "Failed to load customer data"

**Causas posibles:**

1. **Token HMAC inválido**
   - Verifica que estás usando el mismo `SHOPIFY_HMAC_SECRET` en:
     - `.env.local` (servidor)
     - Script de generación de token

2. **Customer ID no existe**
   - Ve a Shopify Admin → Customers
   - Verifica que el ID existe

3. **Credenciales de Shopify incorrectas**
   - Ejecuta: `node scripts/test-shopify-integration.js`
   - Verifica Test 2 (Health Check) pase

### Error: "configured: false" en health check

**Solución:**
```bash
# 1. Verifica .env.local
cat .env.local | grep SHOPIFY

# 2. Reinicia servidor
# Ctrl+C en la terminal donde corre npm run dev
npm run dev
```

### Clara no menciona el nombre del cliente

**Causas posibles:**

1. **Customer data no se cargó**
   - Verifica en consola: `✅ Customer data loaded`

2. **Knowledge base no se personalizó**
   - Verifica en consola: `✅ Using personalized knowledge base`

3. **HeyGen no procesó el knowledgeBase**
   - Puede tomar 1-2 segundos
   - Intenta preguntar: "¿Cuál es mi nombre?"

---

## 📊 Resumen de Tests

| Test | Descripción | Estado |
|------|-------------|--------|
| Test 1 | Modo genérico (sin params) | [ ] |
| Test 2 | Modo personalizado (con params) | [ ] |
| Test 3.1 | Token inválido | [ ] |
| Test 3.2 | Customer ID inexistente | [ ] |
| Test 3.3 | Parámetros faltantes | [ ] |
| Test 4 | Multiple customers | [ ] |
| Test 5 | Network inspection | [ ] |
| Test 6 | Console logs | [ ] |

**Criterio de Aceptación:** Todos los tests deben pasar ✅

---

## 🚀 Próximos Pasos

Si todos los tests pasan:

✅ **Fase 2 completada exitosamente**

**Siguiente:** Fase 3 - Integración en Shopify Liquid

Ver: `docs/INTEGRATION_ROADMAP.md`

---

## 📖 Referencias

- **Implementación:** `docs/FASE_2_IMPLEMENTACION.md`
- **Fase 1:** `docs/FASE_1_CONFIGURACION_PASO_A_PASO.md`
- **Script de Testing:** `scripts/test-shopify-integration.js`
- **Quick Reference:** `docs/QUICK_REFERENCE.md`

---

**Última actualización:** Enero 2025
