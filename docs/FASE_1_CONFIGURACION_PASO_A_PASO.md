# 🔧 Configuración Paso a Paso - Fase 1

Esta guía te llevará por TODOS los pasos necesarios para configurar y validar la Fase 1 antes de avanzar a la Fase 2.

## ⚠️ IMPORTANTE: Variables Nuevas vs Existentes

En tu `.env.local` ya tienes estas variables (NO LAS TOQUES):
```bash
HEYGEN_API_KEY=ZTU0YWJhYzEzMzhjNGQxMmE5NDc3NGQ3YTgwY2MzZDYtMTc1ODE0NzgwMQ==
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
OPENAI_API_KEY=sk-proj-x3S6uiqPXAhmew4NsvZpL9j6VnkQ...
```

**SOLO necesitas AGREGAR estas 3 nuevas:**
```bash
SHOPIFY_HMAC_SECRET=
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_ACCESS_TOKEN=
```

---

## 📋 VARIABLE 1: SHOPIFY_HMAC_SECRET

### ¿Qué es?
Un secreto aleatorio que se usa para generar tokens seguros. Es como una contraseña privada que solo tú conoces.

### ¿Cómo lo genero?

**Opción A - Windows (PowerShell):**
```powershell
# Abre PowerShell y ejecuta:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

Te va a dar algo como:
```
a3Kd9fJ2mP4nQ8rT6vW1xY5zA7bC0eF4gH2iJ6kL8mN3oP5qR7sT9uV1wX3yZ5
```

**Opción B - macOS/Linux:**
```bash
openssl rand -hex 32
```

Te va a dar algo como:
```
3f8a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a
```

**Opción C - Online (más fácil):**
1. Ve a: https://www.random.org/strings/
2. Configura:
   - Generate: 1 string
   - Length: 64 characters
   - Character set: Alphanumeric
3. Click "Get Strings"
4. Copia el resultado

### ¿Dónde lo pongo?

Abre `.env.local` y agrega:
```bash
SHOPIFY_HMAC_SECRET=a3Kd9fJ2mP4nQ8rT6vW1xY5zA7bC0eF4gH2iJ6kL8mN3oP5qR7sT9uV1wX3yZ5
```

⚠️ **IMPORTANTE**: Guarda este valor, lo necesitarás más tarde en Shopify.

---

## 📋 VARIABLE 2: SHOPIFY_STORE_DOMAIN

### ¿Qué es?
El dominio de tu tienda Shopify (la URL de tu admin).

### ¿Cómo lo encuentro?

1. Ve a tu **Shopify Admin** (donde gestionas tu tienda)
2. La URL se ve así: `https://admin.shopify.com/store/NOMBRE-TIENDA/...`
3. O si accedes directamente: `https://NOMBRE-TIENDA.myshopify.com/admin`

### ¿Qué valor pongo?

**SOLO el dominio, sin `https://` ni `/admin`:**

```bash
# ❌ MAL (con https y admin):
SHOPIFY_STORE_DOMAIN=https://beta-skin-tech.myshopify.com/admin

# ✅ BIEN (solo el dominio):
SHOPIFY_STORE_DOMAIN=beta-skin-tech.myshopify.com
```

**Ejemplo real de Beta Skin Tech:**
```bash
SHOPIFY_STORE_DOMAIN=beta-skin-tech.myshopify.com
```

---

## 📋 VARIABLE 3: SHOPIFY_ADMIN_ACCESS_TOKEN

Esta es la más importante y requiere varios pasos.

### Paso 3.1: Crear Shopify App (5 min)

1. **Ve a Shopify Admin** → **Settings** (esquina inferior izquierda)

2. Click en **"Apps and sales channels"** (en el menú lateral)

3. Click en **"Develop apps"** (parte superior derecha)
   - Si no ves esta opción, ve a Settings → Apps and sales channels → "Develop apps for your store"

4. Click en **"Create an app"**

5. Te pedirá un nombre:
   ```
   App name: Clara Integration
   ```

6. Click **"Create app"**

### Paso 3.2: Configurar Permisos (3 min)

1. Una vez creada la app, verás 3 pestañas:
   - Overview
   - Configuration ← **Ve aquí**
   - API credentials

2. Click en **"Configuration"**

3. En "Admin API integration", click **"Configure"**

4. Busca y marca estos dos permisos:
   ```
   ☑️ read_customers - Read customers
   ☑️ read_orders - Read orders
   ```

   **¿Cómo buscarlos rápido?**
   - Usa Ctrl+F (Cmd+F en Mac)
   - Busca "read_customers"
   - Marca la casilla
   - Busca "read_orders"
   - Marca la casilla

5. Scroll hasta abajo y click **"Save"**

### Paso 3.3: Instalar App y Obtener Token (2 min)

1. Ve a la pestaña **"API credentials"**

2. Scroll down hasta ver "Access tokens"

3. Click en **"Install app"**
   - Te preguntará si estás seguro
   - Click **"Install"**

4. Una vez instalada, verás una sección:
   ```
   Admin API access token
   [Reveal token once]
   ```

5. Click en **"Reveal token once"**

6. **COPIA INMEDIATAMENTE EL TOKEN**
   - Se ve así: `shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - ⚠️ Solo se muestra UNA VEZ
   - Si no lo copias, tendrás que regenerarlo

### ¿Dónde lo pongo?

Abre `.env.local` y agrega:
```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## ✅ PASO 2: Verificar tu .env.local

Tu archivo `.env.local` completo debe verse así:

```bash
# HeyGen API Configuration (YA EXISTENTES)
HEYGEN_API_KEY=ZTU0YWJhYzEzMzhjNGQxMmE5NDc3NGQ3YTgwY2MzZDYtMTc1ODE0NzgwMQ==
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
OPENAI_API_KEY=sk-proj-x3S6uiqPXAhmew4NsvZpL9j6VnkQ...

# NUEVAS (las que acabas de agregar):
SHOPIFY_HMAC_SECRET=a3Kd9fJ2mP4nQ8rT6vW1xY5zA7bC0eF4gH2iJ6kL8mN3oP5qR7sT9uV1wX3yZ5
SHOPIFY_STORE_DOMAIN=beta-skin-tech.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Checklist de Validación:

- [ ] `SHOPIFY_HMAC_SECRET` tiene 32+ caracteres
- [ ] `SHOPIFY_STORE_DOMAIN` NO tiene `https://` ni `/admin`
- [ ] `SHOPIFY_ADMIN_ACCESS_TOKEN` empieza con `shpat_`

---

## 🧪 PASO 3: Probar que Todo Funciona

### Test 1: Verificar que el servidor lee las variables (1 min)

```bash
# 1. Reinicia el servidor (importante!)
npm run dev
```

Deberías ver en la consola:
```
  ▲ Next.js 14.2.16
  - Environments: .env.local

  ✓ Ready in 2.5s
  ○ Local:   http://localhost:3000
```

Si ves warnings como:
```
⚠️  SHOPIFY_HMAC_SECRET not configured
```
Significa que las variables NO se cargaron. Verifica que reiniciaste el servidor.

---

### Test 2: Health Check del API (1 min)

**Método A - Navegador:**
1. Abre: http://localhost:3000/api/shopify-customer
2. Deberías ver:
```json
{
  "status": "ok",
  "service": "shopify-customer-api",
  "configured": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

**Método B - Terminal:**
```bash
curl http://localhost:3000/api/shopify-customer
```

### ✅ Si ves `"configured": true` → Todo correcto!
### ❌ Si ves `"configured": false` → Falta alguna variable

---

### Test 3: Obtener un Customer ID Real de Shopify (2 min)

Necesitas el ID de un cliente real para probar:

1. Ve a **Shopify Admin** → **Customers**

2. Click en cualquier cliente (o créate uno de prueba)

3. La URL se verá así:
   ```
   https://admin.shopify.com/store/beta-skin-tech/customers/8234567890123
   ```

4. El número al final es el `customer_id`:
   ```
   8234567890123
   ```

5. **CÓPIALO** - lo usarás en el siguiente test

---

### Test 4: Generar Token HMAC de Prueba (2 min)

Ahora vamos a generar un token válido para ese customer ID:

**Método A - Node.js (recomendado):**
```bash
# Abre una nueva terminal y ejecuta:
node
```

Luego pega esto línea por línea:
```javascript
const crypto = require('crypto');
const secret = 'TU_SHOPIFY_HMAC_SECRET_AQUI'; // Copia de tu .env.local
const customerId = '8234567890123'; // El ID que copiaste de Shopify

const token = crypto.createHmac('sha256', secret).update(customerId).digest('hex');

console.log('\n=== DATOS PARA TEST ===');
console.log('Customer ID:', customerId);
console.log('Token:', token);
console.log('\n=== COPIA ESTE JSON ===');
console.log(JSON.stringify({ shopify_token: token, customer_id: customerId }, null, 2));
```

Te va a mostrar algo como:
```
=== DATOS PARA TEST ===
Customer ID: 8234567890123
Token: 3f8a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a

=== COPIA ESTE JSON ===
{
  "shopify_token": "3f8a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
  "customer_id": "8234567890123"
}
```

**COPIA EL JSON** (la parte de abajo).

---

### Test 5: Probar el Endpoint Completo (2 min)

Ahora vamos a probar que la API puede obtener datos del cliente:

**Método A - Herramienta REST (Recomendado):**

Si tienes **Postman**, **Insomnia**, o **Thunder Client** (VS Code):
1. Método: POST
2. URL: `http://localhost:3000/api/shopify-customer`
3. Headers: `Content-Type: application/json`
4. Body: Pega el JSON que copiaste arriba
5. Send

**Método B - cURL (Terminal):**
```bash
curl -X POST http://localhost:3000/api/shopify-customer \
  -H "Content-Type: application/json" \
  -d '{
    "shopify_token": "PEGA_TU_TOKEN_AQUI",
    "customer_id": "PEGA_TU_CUSTOMER_ID_AQUI"
  }'
```

**Método C - PowerShell (Windows):**
```powershell
$body = @{
    shopify_token = "PEGA_TU_TOKEN_AQUI"
    customer_id = "PEGA_TU_CUSTOMER_ID_AQUI"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/shopify-customer" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

---

### ✅ Resultado Esperado:

Si TODO está configurado correctamente, verás:

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
        "name": "#1003",
        "date": "15 de enero de 2025",
        "items": [
          {
            "title": "Crema Facial Hidratante",
            "quantity": 1
          },
          {
            "title": "Serum Anti-Edad",
            "quantity": 2
          }
        ]
      }
    ]
  }
}
```

### 🎉 Si ves esto → **FASE 1 FUNCIONANDO AL 100%**

---

## ❌ Troubleshooting: Problemas Comunes

### Error 1: `"configured": false` en health check

**Causa**: Variables no cargadas.

**Solución**:
1. Verifica que `.env.local` tiene las 3 variables nuevas
2. **Reinicia el servidor**: Ctrl+C y luego `npm run dev`
3. Prueba de nuevo

---

### Error 2: `401 - Invalid authentication token`

**Causa**: El token HMAC no coincide con el customer ID.

**Solución**:
1. Verifica que usaste el **mismo** `SHOPIFY_HMAC_SECRET` para generar el token
2. Verifica que el `customer_id` es correcto
3. Regenera el token con el script de Node.js

---

### Error 3: `404 - Customer not found`

**Causa**: El customer ID no existe en tu tienda.

**Solución**:
1. Ve a Shopify Admin → Customers
2. Verifica que el customer existe
3. Copia el ID correcto de la URL

---

### Error 4: `500 - Failed to connect to Shopify`

**Causa**: Credenciales de Shopify incorrectas.

**Solución**:
1. Verifica `SHOPIFY_STORE_DOMAIN`:
   - ❌ NO: `https://beta-skin-tech.myshopify.com/admin`
   - ✅ SÍ: `beta-skin-tech.myshopify.com`

2. Verifica `SHOPIFY_ADMIN_ACCESS_TOKEN`:
   - Debe empezar con `shpat_`
   - Si lo perdiste, regenera uno nuevo en Shopify

3. Verifica los permisos de la app:
   - Ve a Shopify Admin → Apps → Clara Integration → Configuration
   - Asegúrate que tiene: `read_customers` y `read_orders`

---

### Error 5: `read_customers permission required`

**Causa**: La app no tiene los permisos correctos.

**Solución**:
1. Shopify Admin → Settings → Apps → Clara Integration
2. Click "Configuration"
3. Marca `read_customers` y `read_orders`
4. Save
5. Puede que necesites reinstalar la app

---

## 📊 Checklist Final Antes de Fase 2

Marca cada item antes de avanzar:

### Configuración:
- [ ] `.env.local` tiene `SHOPIFY_HMAC_SECRET`
- [ ] `.env.local` tiene `SHOPIFY_STORE_DOMAIN` (sin https)
- [ ] `.env.local` tiene `SHOPIFY_ADMIN_ACCESS_TOKEN` (empieza con shpat_)

### Shopify App:
- [ ] App "Clara Integration" creada en Shopify
- [ ] Permisos `read_customers` y `read_orders` configurados
- [ ] App instalada en la tienda

### Testing:
- [ ] Health check retorna `"configured": true`
- [ ] Puedes generar tokens HMAC
- [ ] Tienes un customer ID real de prueba
- [ ] POST al endpoint retorna customer data exitosamente

### Consola:
- [ ] Servidor corre sin errores
- [ ] No hay warnings de "not configured"
- [ ] Build exitoso: `npm run build`

---

## 🎯 Siguiente Paso

### Si TODO está ✅ marcado:

```bash
# Verifica una última vez:
npm run build
# Debe completar sin errores

# Ahora estás listo para Fase 2!
```

**Fase 2** modificará 3 archivos de Clara para consumir esta API:
1. `app/page.tsx` - Detectar URL params
2. `hooks/avatar/context.tsx` - Pasar customer data
3. `hooks/avatar/useStreamingAvatarSession.ts` - Personalizar knowledgeBase

**Tiempo estimado Fase 2**: 1.5-2 horas

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:

1. **Revisa los logs del servidor** - Busca mensajes de error en la terminal
2. **Usa el health check** - `curl http://localhost:3000/api/shopify-customer`
3. **Verifica las variables** - Asegúrate que no hay espacios extras

---

**Última actualización**: Enero 2025
**Status**: ✅ Listo para validación
