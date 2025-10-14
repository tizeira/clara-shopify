# ✅ CHECKLIST FASE 1 - Configuración Shopify

## 📋 PARTE 1: Obtener Credenciales (15-20 min)

### Step 1: Generar SHOPIFY_HMAC_SECRET

**Windows PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

**O usa:** https://www.random.org/strings/ (64 caracteres alfanuméricos)

```
✅ SHOPIFY_HMAC_SECRET obtenido: ________________
   (Guárdalo, lo necesitarás después)
```

---

### Step 2: Identificar SHOPIFY_STORE_DOMAIN

1. Ve a tu Shopify Admin
2. Copia el dominio de la URL (sin https://)

Ejemplo:
- ❌ `https://beta-skin-tech.myshopify.com/admin`
- ✅ `beta-skin-tech.myshopify.com`

```
✅ SHOPIFY_STORE_DOMAIN identificado: ________________
```

---

### Step 3: Crear Shopify App

1. Shopify Admin → **Settings** → **Apps and sales channels**
2. Click **"Develop apps"** → **"Create an app"**
3. Nombre: `Clara Integration`
4. Click **"Create app"**

```
✅ App creada en Shopify
```

---

### Step 4: Configurar Permisos

1. En la app → **"Configuration"** → **"Configure Admin API"**
2. Buscar y marcar:
   - ☑️ `read_customers`
   - ☑️ `read_orders`
3. Click **"Save"**

```
✅ Permisos configurados (read_customers + read_orders)
```

---

### Step 5: Obtener SHOPIFY_ADMIN_ACCESS_TOKEN

1. En la app → **"API credentials"**
2. Click **"Install app"** → Confirmar
3. Click **"Reveal token once"**
4. **COPIAR INMEDIATAMENTE** (solo se muestra una vez)

El token se ve así: `shpat_a1b2c3d4e5f6...`

```
✅ SHOPIFY_ADMIN_ACCESS_TOKEN copiado: shpat________________
```

---

## 📝 PARTE 2: Configurar .env.local (2 min)

Abre el archivo `.env.local` y **AGREGA AL FINAL**:

```bash
# Shopify Integration
SHOPIFY_HMAC_SECRET=pega_aqui_el_valor_del_step_1
SHOPIFY_STORE_DOMAIN=pega_aqui_el_valor_del_step_2
SHOPIFY_ADMIN_ACCESS_TOKEN=pega_aqui_el_valor_del_step_5
```

**Ejemplo real:**
```bash
SHOPIFY_HMAC_SECRET=a3Kd9fJ2mP4nQ8rT6vW1xY5zA7bC0eF4gH2iJ6kL8mN3oP5qR7sT9uV1wX3yZ5
SHOPIFY_STORE_DOMAIN=beta-skin-tech.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```
✅ Variables agregadas a .env.local
✅ Archivo guardado
```

---

## 🧪 PARTE 3: Testing (5 min)

### Test 1: Reiniciar Servidor

```bash
# Si está corriendo, para con Ctrl+C y luego:
npm run dev
```

```
✅ Servidor reiniciado
```

---

### Test 2: Health Check Manual

**Opción A - Navegador:**
Abre: http://localhost:3000/api/shopify-customer

**Opción B - Terminal:**
```bash
curl http://localhost:3000/api/shopify-customer
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "configured": true
}
```

```
✅ Health check exitoso (configured: true)
```

---

### Test 3: Script Automatizado

```bash
node scripts/test-shopify-integration.js
```

Sigue las instrucciones del script.

```
✅ Script de testing ejecutado
✅ Todos los tests pasaron
```

---

## 🎯 PARTE 4: Test con Customer Real (Opcional, 5 min)

### Obtener Customer ID:

1. Shopify Admin → **Customers**
2. Click en cualquier cliente
3. URL: `...customers/1234567890` ← Copiar el número

```
Customer ID de prueba: ________________
```

### Generar Token:

```bash
node
```

Luego:
```javascript
const crypto = require('crypto');
const secret = 'TU_SHOPIFY_HMAC_SECRET';
const customerId = 'TU_CUSTOMER_ID';
const token = crypto.createHmac('sha256', secret).update(customerId).digest('hex');
console.log('Token:', token);
```

```
✅ Token generado
```

### Probar Endpoint:

**Postman/Insomnia:**
- POST → `http://localhost:3000/api/shopify-customer`
- Body (JSON):
```json
{
  "shopify_token": "el_token_generado",
  "customer_id": "tu_customer_id"
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "customer": {
    "firstName": "Juan",
    "ordersCount": 3,
    ...
  }
}
```

```
✅ Customer data obtenida correctamente
```

---

## ✅ RESUMEN FINAL

Marca cada item antes de avanzar a Fase 2:

### Configuración:
- [ ] `SHOPIFY_HMAC_SECRET` generado y guardado
- [ ] `SHOPIFY_STORE_DOMAIN` identificado (sin https)
- [ ] `SHOPIFY_ADMIN_ACCESS_TOKEN` obtenido (empieza con shpat_)
- [ ] Todas las variables agregadas a `.env.local`

### Shopify:
- [ ] App "Clara Integration" creada
- [ ] Permisos `read_customers` y `read_orders` configurados
- [ ] App instalada

### Testing:
- [ ] Servidor reiniciado después de agregar variables
- [ ] Health check retorna `configured: true`
- [ ] Script de testing ejecutado exitosamente
- [ ] (Opcional) Test con customer real exitoso

### Build:
- [ ] `npm run build` completa sin errores
- [ ] TypeScript sin errores

---

## 🚀 LISTO PARA FASE 2

Si todos los items están marcados:

```bash
# Última verificación:
npm run build

# Si completa sin errores → Listo!
```

**Siguiente paso:** Avanzar a Fase 2 - Integración en Clara Frontend

**Tiempo de Fase 2:** 1.5-2 horas

---

## 📞 Problemas?

Si algo falla, consulta:
- `docs/FASE_1_CONFIGURACION_PASO_A_PASO.md` - Guía detallada
- Sección Troubleshooting en la guía
- Script: `node scripts/test-shopify-integration.js`

---

**Última actualización:** Enero 2025
