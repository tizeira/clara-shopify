# Shopify Integration Setup Guide

Esta guía te ayudará a configurar la integración de Clara con Shopify para personalizar las conversaciones con datos de los clientes.

## 📋 Requisitos Previos

- Tienda Shopify activa
- Acceso al Shopify Admin
- Clara desplegada en Vercel o servidor similar

## 🔧 Paso 1: Crear Shopify App

1. Ve a **Shopify Admin** → **Settings** → **Apps and sales channels**
2. Click en **"Develop apps"** (en la esquina superior derecha)
3. Click en **"Create an app"**
4. Nombre de la app: `Clara Integration`
5. Click **"Create app"**

## 🔐 Paso 2: Configurar Admin API Scopes

1. En la app que acabas de crear, ve a **"Configuration"**
2. Click en **"Configure Admin API scopes"**
3. Busca y habilita estos scopes:
   - ✅ `read_customers` - Para leer datos de clientes
   - ✅ `read_orders` - Para leer historial de órdenes
4. Click **"Save"**

## 🔑 Paso 3: Instalar App y Obtener Token

1. Click en la pestaña **"API credentials"**
2. Scroll down y click **"Install app"**
3. Confirma la instalación
4. Una vez instalada, verás el **"Admin API access token"**
5. Click en **"Reveal token once"** y **cópialo**
   ```
   shpat_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

⚠️ **IMPORTANTE**: Este token solo se muestra una vez. Guárdalo de forma segura.

## 🔐 Paso 4: Generar HMAC Secret

Este secreto se usa para validar tokens entre Shopify y Clara.

### En Windows (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

### En macOS/Linux:
```bash
openssl rand -hex 32
```

Guarda el resultado, lo necesitarás para `.env.local`.

## 📝 Paso 5: Configurar Variables de Entorno

### En desarrollo (.env.local):

Agrega estas líneas a tu archivo `.env.local`:

```bash
# Shopify Integration
SHOPIFY_HMAC_SECRET=tu_secret_generado_en_paso_4
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

**Ejemplo real:**
```bash
SHOPIFY_HMAC_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SHOPIFY_STORE_DOMAIN=beta-skin-tech.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### En producción (Vercel):

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega cada variable:
   - `SHOPIFY_HMAC_SECRET`
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN`
4. Scope: **Production**, **Preview**, y **Development**
5. Click **Save**
6. **Re-deploy** tu aplicación para que tome las nuevas variables

## ✅ Paso 6: Verificar Configuración

### Localmente:

1. Inicia el servidor:
   ```bash
   npm run dev
   ```

2. Prueba el health check:
   ```bash
   curl http://localhost:3000/api/shopify-customer
   ```

   Deberías ver:
   ```json
   {
     "status": "ok",
     "service": "shopify-customer-api",
     "configured": true,
     "timestamp": "2024-01-15T10:30:00.000Z",
     "version": "1.0.0"
   }
   ```

### En producción:

```bash
curl https://tu-clara.vercel.app/api/shopify-customer
```

Si `configured: false`, revisa que todas las variables estén configuradas correctamente.

## 🧪 Paso 7: Probar con Customer Real

Para probar con un customer ID real de tu tienda:

1. Ve a **Shopify Admin** → **Customers**
2. Abre cualquier cliente
3. La URL será: `https://admin.shopify.com/store/TU-TIENDA/customers/1234567890`
4. Copia el número al final (ese es el `customer_id`)

### Generar token de prueba:

```bash
# En Node.js REPL o script
node
> const crypto = require('crypto');
> const secret = 'TU_SHOPIFY_HMAC_SECRET';
> const customerId = '1234567890'; // El ID del paso anterior
> const token = crypto.createHmac('sha256', secret).update(customerId).digest('hex');
> console.log('Token:', token);
```

### Probar el endpoint:

```bash
curl -X POST http://localhost:3000/api/shopify-customer \
  -H "Content-Type: application/json" \
  -d '{
    "shopify_token": "EL_TOKEN_GENERADO",
    "customer_id": "1234567890"
  }'
```

Deberías recibir los datos del cliente:
```json
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

## 🚨 Troubleshooting

### Error: "Invalid authentication token"
- Verifica que el `SHOPIFY_HMAC_SECRET` sea el mismo en Shopify y Clara
- Asegúrate de regenerar el token con el customer_id correcto

### Error: "Customer not found"
- Verifica que el customer_id existe en tu tienda Shopify
- El customer_id debe ser numérico (sin el prefijo `gid://`)

### Error: "Failed to connect to Shopify"
- Verifica el `SHOPIFY_ADMIN_ACCESS_TOKEN`
- Verifica el `SHOPIFY_STORE_DOMAIN` (sin `https://`)
- Asegúrate de que la app tiene los scopes correctos

### configured: false en health check
- Faltan variables de entorno
- Las variables tienen nombres incorrectos
- Necesitas reiniciar el servidor después de agregar variables

## 📚 Siguientes Pasos

Una vez completada esta fase, puedes proceder a:

1. **Fase 2**: Integración en Clara frontend (app/page.tsx)
2. **Fase 3**: Templates Shopify (Liquid files)
3. **Fase 4**: Testing end-to-end

## 🔒 Seguridad

- ✅ Nunca expongas el `SHOPIFY_ADMIN_ACCESS_TOKEN` en el frontend
- ✅ El `SHOPIFY_HMAC_SECRET` solo debe estar en el servidor
- ✅ Los tokens HMAC expiran implícitamente (no son reutilizables sin context)
- ✅ Usa HTTPS en producción siempre

## 📞 Soporte

Si tienes problemas con la integración:

1. Verifica los logs del servidor: `npm run dev` y revisa la consola
2. Revisa los logs de Vercel si está en producción
3. Consulta la documentación de Shopify Admin API: https://shopify.dev/api/admin

---

Última actualización: Enero 2025
