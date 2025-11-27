# 🛍️ Guía de Configuración Shopify

Esta guía te ayuda a obtener todas las variables necesarias para integrar la app Clara con Shopify.

---

## 📋 Variables Necesarias

```bash
# En .env.local
SHOPIFY_HMAC_SECRET=tu_secret_generado_aqui
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_tu_token_aqui
```

---

## 🔑 PASO 1: Generar SHOPIFY_HMAC_SECRET

Este secret lo generas tú (NO viene de Shopify). Es para firmar tokens de autenticación.

### Opción A: Con OpenSSL (Recomendado)
```bash
openssl rand -hex 32
```

Ejemplo de output:
```
6d0a5094b3037442558d61e6999098eff58334eb17dd0a27f2e4890374046143
```

### Opción B: Con Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ✅ Agregar a .env.local
```bash
SHOPIFY_HMAC_SECRET=6d0a5094b3037442558d61e6999098eff58334eb17dd0a27f2e4890374046143
```

⚠️ **IMPORTANTE**: Este mismo secret debe ir en:
1. `.env.local` (backend Next.js)
2. Metafield de Shopify `clara.hmac_secret` (para Liquid template)

---

## 🏪 PASO 2: Obtener SHOPIFY_STORE_DOMAIN

Este es el dominio de tu tienda Shopify.

### Cómo obtenerlo:
1. Inicia sesión en tu **Shopify Admin**: https://admin.shopify.com
2. La URL será algo como: `https://admin.shopify.com/store/tu-tienda`
3. Tu dominio es: `tu-tienda.myshopify.com`

### Ejemplo:
Si tu URL es: `https://admin.shopify.com/store/clara-skincare`

Tu dominio es: `clara-skincare.myshopify.com`

### ✅ Agregar a .env.local
```bash
SHOPIFY_STORE_DOMAIN=clara-skincare.myshopify.com
```

---

## 🔐 PASO 3: Crear App Privada y Obtener Access Token

Shopify requiere que crees una "Custom App" para acceder al Admin API.

### 3.1. Habilitar Custom Apps

1. Ve a **Shopify Admin** → **Settings** (Configuración)
2. Click en **Apps and sales channels**
3. Click en **Develop apps** (Desarrollar aplicaciones)
4. Si aparece un botón **"Allow custom app development"**, haz click y confirma

### 3.2. Crear Custom App

1. Click en **Create an app**
2. Nombre de la app: `Clara Avatar Integration`
3. Click en **Create app**

### 3.3. Configurar Scopes (Permisos)

1. En la app recién creada, ve a la pestaña **Configuration**
2. Click en **Configure** en la sección **Admin API integration**
3. Selecciona los siguientes scopes:

   **Customer scopes (requeridos):**
   - ✅ `read_customers` - Leer datos de clientes

   **Order scopes (requeridos):**
   - ✅ `read_orders` - Leer historial de pedidos

4. Click en **Save**

### 3.4. Instalar la App

1. Ve a la pestaña **API credentials**
2. Click en **Install app**
3. Confirma la instalación

### 3.5. Obtener el Admin API Access Token

1. En **API credentials**, busca la sección **Admin API access token**
2. Click en **Reveal token once** (¡Solo se muestra UNA VEZ!)
3. Copia el token (empieza con `shpat_`)

### ✅ Agregar a .env.local
```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_abc123def456...
```

⚠️ **CRÍTICO**:
- Guarda este token en un lugar seguro (nunca lo subas a Git)
- Solo se muestra UNA VEZ, si lo pierdes debes regenerarlo

---

## 👤 PASO 4: Obtener un Customer ID de Prueba

Necesitas el ID de un cliente real de tu tienda para hacer pruebas.

### Opción A: Desde Shopify Admin (Fácil)

1. Ve a **Customers** en tu Shopify Admin
2. Click en cualquier cliente
3. La URL será: `https://admin.shopify.com/store/tu-tienda/customers/123456789`
4. El número al final (`123456789`) es el **Customer ID**

### Opción B: Crear un Cliente de Prueba

1. Ve a **Customers** → **Add customer**
2. Llena los datos de prueba:
   - First name: Test
   - Last name: User
   - Email: test@ejemplo.com
3. Click en **Save**
4. Obtén el ID de la URL

### ✅ Guarda el Customer ID
```
CUSTOMER_ID_TEST=123456789
```

---

## 🧪 PASO 5: Probar la Configuración

### 5.1. Verificar variables en .env.local

Tu archivo `.env.local` debe tener:

```bash
# Shopify Integration
SHOPIFY_HMAC_SECRET=6d0a5094b3037442558d61e6999098eff58334eb17dd0a27f2e4890374046143
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_abc123def456...
```

### 5.2. Generar token HMAC para testing

```bash
node scripts/generate-shopify-token.mjs 123456789
```

Output:
```
✅ Token generado exitosamente:

📋 Customer ID: 123456789
🔑 Token HMAC: abc123def456...
```

### 5.3. Probar el endpoint con token válido

```bash
# Primero inicia el servidor
npm run dev

# En otra terminal, ejecuta el test
curl -X POST http://localhost:3000/api/shopify-customer \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"123456789","shopify_token":"abc123def456..."}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "customer": {
    "firstName": "Test",
    "lastName": "User",
    "email": "test@ejemplo.com",
    "ordersCount": 0,
    "recentOrders": []
  }
}
```

---

## 📝 PASO 6: Agregar Metafields (Para FASE 2)

Los metafields almacenan datos personalizados de clientes (tipo de piel, preocupaciones).

### 6.1. Crear Metafield Definitions

1. Ve a **Settings** → **Custom data** → **Customers**
2. Click en **Add definition**

**Metafield 1: Tipo de Piel**
- Name: `Tipo de Piel`
- Namespace and key: `beta_skincare.skin_type`
- Type: `Single line text`
- Validation: One of (Seca, Grasa, Mixta, Sensible, Normal)

**Metafield 2: Preocupaciones**
- Name: `Preocupaciones de Piel`
- Namespace and key: `beta_skincare.skin_concerns`
- Type: `List of single line text`

3. Click en **Save** para cada uno

### 6.2. Agregar Metafields a un Cliente de Prueba

1. Ve a **Customers** → selecciona tu cliente de prueba
2. Scroll hasta la sección **Metafields**
3. Agrega valores:
   - Tipo de Piel: `Mixta`
   - Preocupaciones: `Acné`, `Manchas`
4. Click en **Save**

### 6.3. Probar con metafields

Ejecuta de nuevo el test y verás los metafields en la respuesta:

```json
{
  "success": true,
  "customer": {
    "firstName": "Test",
    "lastName": "User",
    "skinType": "Mixta",
    "skinConcerns": ["Acné", "Manchas"]
  }
}
```

---

## 🔄 PASO 7: Configurar FASE 2 - Liquid Integration (Para Basic Plan)

**¿Por qué FASE 2?** Shopify Basic Plan ($29/mes) bloquea el acceso a PII (nombres, emails) vía GraphQL API. FASE 2 soluciona esto pasando datos desde Liquid templates (que SÍ tienen acceso) al widget vía URL.

### 7.1. Configurar Store Metafield para HMAC Secret

El mismo `SHOPIFY_HMAC_SECRET` debe estar en Shopify como metafield de tienda.

**Pasos:**

1. Ve a **Settings** → **Custom data** → **Metafields**
2. Click en **Store** (NO Products, NO Customers)
3. Click en **Add definition**
4. Llena los campos:
   - **Namespace:** `clara`
   - **Key:** `hmac_secret`
   - **Name:** `Clara HMAC Secret`
   - **Description:** `Secret for FASE 2 Liquid integration - must match Vercel SHOPIFY_HMAC_SECRET`
   - **Type:** `Single line text`
5. Click en **Save**
6. Ahora asigna el valor:
   - En la misma página, busca el metafield recién creado
   - Click en **Edit**
   - Pega tu `SHOPIFY_HMAC_SECRET` (el mismo de .env.local)
   - Ejemplo: `b6e2bc0ed8256bb0c1fdce4f3422d4253dca64fcc15c17964af345f62ef10981`
7. Click en **Save**

⚠️ **CRÍTICO:** Este valor DEBE ser exactamente igual al de `.env.local` y Vercel

### 7.2. Verificar Metafield en Liquid

Para confirmar que el metafield está bien configurado:

1. Ve a **Online Store** → **Themes** → **Actions** → **Edit code**
2. Abre cualquier template (ej: `templates/index.liquid`)
3. Agrega temporalmente al inicio:
   ```liquid
   <p>HMAC Secret: {{ shop.metafields.clara.hmac_secret }}</p>
   ```
4. Guarda y visita tu tienda
5. Deberías ver tu secret en la página
6. **¡IMPORTANTE!** Elimina esa línea después de verificar (no expongas el secret públicamente)

### 7.3. Instalar Template page.clara.liquid

El template Liquid extrae datos del cliente y los pasa al widget.

**Pasos:**

1. Ve a **Online Store** → **Themes** → **Actions** → **Edit code**
2. En la carpeta **Templates**, click en **Add a new template**
3. Selecciona **page** como tipo
4. Nombre: `clara` (quedará como `page.clara.liquid`)
5. Click en **Create template**
6. Pega el contenido completo de `shopify/templates/page.clara.liquid` del repositorio
7. **Importante:** Actualiza la URL del widget en línea 127:
   ```liquid
   assign widget_url = 'https://tu-vercel-url.vercel.app'
   ```
   - Desarrollo: `http://localhost:3000`
   - Producción: `https://clara-shopify.vercel.app`
8. Click en **Save**

### 7.4. Crear Página de Clara en Shopify

Ahora crea una página que use el template recién creado:

1. Ve a **Online Store** → **Pages**
2. Click en **Add page**
3. Llena los campos:
   - **Title:** `Clara - Asesora Virtual`
   - **Content:** Deja vacío o agrega texto descriptivo (no se mostrará con el template)
4. En el panel derecho, busca **Template**
5. Selecciona: `page.clara` (el template que acabas de crear)
6. Click en **Save**

### 7.5. Obtener URL de Clara

La página estará disponible en:
```
https://tu-tienda.myshopify.com/pages/clara
```

O si tienes dominio personalizado:
```
https://tu-dominio.com/pages/clara
```

### 7.6. Probar Liquid Integration

**Test con usuario logueado:**

1. Inicia sesión como cliente en tu tienda Shopify
2. Visita `/pages/clara`
3. Abre la consola del navegador (F12)
4. Busca estos logs:
   ```javascript
   📊 Data sources: {
     hasLiquidData: true,
     hasShopifyParams: true,
     firstName: 'Tu Nombre',
     ordersCount: X,
     source: 'Liquid + API'
   }

   ✅ Customer data merged successfully
   ```
5. Clara debería saludarte por tu nombre: "¡Hola [Tu Nombre]!"

**Test con usuario anónimo:**

1. Abre una ventana de incógnito
2. Visita `/pages/clara` (sin loguearte)
3. Clara debería cargar normalmente sin personalización
4. Console log:
   ```javascript
   📊 Data sources: {
     hasLiquidData: false,
     hasShopifyParams: false
   }
   ```

### 7.7. Verificar HMAC Validation

Para confirmar que la validación HMAC funciona:

**Test con URL válida (debería funcionar):**
```bash
# Genera un token válido
node scripts/test-fase2-url.mjs
# Copia una de las URLs y ábrela en el navegador
```

**Test con URL inválida (debería fallar):**
```
http://localhost:3000?customer_id=123&shopify_token=invalid_token
```

En consola deberías ver:
```
❌ Failed to load customer data from API: Invalid HMAC token
⚠️ No Liquid data and API failed. Checking localStorage...
```

### 7.8. Deployment a Producción (Vercel)

**Configurar environment variable en Vercel:**

1. Ve a Vercel Dashboard → tu proyecto
2. **Settings** → **Environment Variables**
3. Agrega: `SHOPIFY_HMAC_SECRET`
4. Valor: El mismo secret de .env.local y Shopify metafield
5. Ambiente: **Production** y **Preview**
6. Click en **Save**
7. Redeploy el proyecto

**Verificación final:**

1. Visita tu Clara en producción: `https://tu-dominio.com/pages/clara`
2. Loguéate como cliente
3. Verifica que Clara te saluda por nombre
4. Revisa console logs para confirmar data merge

---

## 🔒 Seguridad

### ✅ Buenas Prácticas:

1. **NUNCA subas .env.local a Git**
   - Ya está en `.gitignore`
   - Verifica: `git status` no debe mostrar `.env.local`

2. **Rota el Access Token si se expone**
   - Ve a la app en Shopify Admin
   - Click en **Regenerate token**

3. **Usa diferentes secrets por ambiente**
   - Desarrollo: Secret en `.env.local`
   - Producción: Secret en Vercel Environment Variables

4. **Limita los scopes al mínimo necesario**
   - Solo usa `read_customers` y `read_orders`
   - NO uses `write_*` a menos que sea necesario

---

## 🎯 Checklist de Configuración

Marca cada item cuando lo completes:

### FASE 1 - API Integration
- [ ] SHOPIFY_HMAC_SECRET generado y agregado a .env.local
- [ ] SHOPIFY_STORE_DOMAIN obtenido y agregado a .env.local
- [ ] Custom App creada en Shopify Admin
- [ ] Scopes configurados (read_customers, read_orders)
- [ ] SHOPIFY_ADMIN_ACCESS_TOKEN obtenido y agregado a .env.local
- [ ] Customer ID de prueba obtenido
- [ ] Token HMAC generado con script
- [ ] Endpoint probado con curl (retorna customer data)
- [ ] Metafield definitions creadas (skin_type, skin_concerns)
- [ ] Metafields agregados a cliente de prueba
- [ ] Test completo funciona con datos reales

### FASE 2 - Liquid Integration (Para Basic Plan)
- [ ] Store metafield `clara.hmac_secret` creado en Shopify
- [ ] Mismo HMAC secret configurado en Shopify metafield
- [ ] Template `page.clara.liquid` instalado en Shopify Theme
- [ ] URL del widget actualizada en template (línea 127)
- [ ] Página Clara creada en Shopify con template correcto
- [ ] Test con usuario logueado (verifica datos en console)
- [ ] Test con usuario anónimo (Clara genérica funciona)
- [ ] HMAC validation probada (URLs válidas e inválidas)
- [ ] SHOPIFY_HMAC_SECRET agregado a Vercel (production + preview)
- [ ] Deployment verificado en producción (Clara saluda por nombre)

---

## ❓ Troubleshooting

### Error: "Failed to connect to Shopify"

**Causa**: Credenciales incorrectas o permisos insuficientes

**Solución**:
1. Verifica que SHOPIFY_STORE_DOMAIN no incluya `https://`
2. Verifica que el token empiece con `shpat_`
3. Confirma que los scopes están configurados

### Error: "Invalid authentication token"

**Causa**: Token HMAC no coincide

**Solución**:
1. Regenera el token con: `node scripts/generate-shopify-token.mjs <customer_id>`
2. Verifica que usas el mismo SHOPIFY_HMAC_SECRET en .env.local

### Error: "Customer not found"

**Causa**: Customer ID no existe en Shopify

**Solución**:
1. Verifica el ID en Shopify Admin → Customers
2. Usa un customer ID válido de tu tienda

---

## 📚 Referencias

- [Shopify Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Custom Apps](https://shopify.dev/docs/apps/build/authentication-authorization#generate-credentials-from-the-shopify-admin)
- [Metafields](https://shopify.dev/docs/apps/build/custom-data/metafields)
- [HMAC Validation](https://shopify.dev/docs/apps/build/authentication-authorization/hmac-validation)

---

**¿Necesitas ayuda?** Revisa la sección de Troubleshooting o consulta la documentación oficial de Shopify.
