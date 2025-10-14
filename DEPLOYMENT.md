# 🚀 Deployment Guide - Clara Shopify

Guía completa para desplegar Clara integrada con Shopify.

---

## 📋 Pre-requisitos

- [x] Cuenta de GitHub
- [x] Cuenta de Vercel (gratis en vercel.com)
- [x] Cuenta de Shopify
- [x] Node.js instalado localmente

---

## 🔧 PASO 1: Crear Nuevo Repositorio en GitHub

### 1.1: Remover conexión al repo anterior (si existe)

```bash
cd "C:\Users\Ubicacion Gamer\v0-clara"
git remote -v  # Ver remotes actuales
git remote remove origin  # Si existe
```

### 1.2: Crear nuevo repositorio

1. Ve a: https://github.com/new
2. **Repository name:** `clara-shopify`
3. **Description:** "Clara virtual assistant integrated with Shopify"
4. **Visibility:** Private (recomendado)
5. **NO** inicializar con README (ya tienes código)
6. Click **"Create repository"**

### 1.3: Conectar proyecto local al nuevo repo

```bash
# Conectar al nuevo repo (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/clara-shopify.git

# Verificar rama
git branch -M main

# Commit inicial
git add .
git commit -m "feat: initial commit - Clara with Shopify integration"

# Push
git push -u origin main
```

✅ **Verificación:** Ve a GitHub y confirma que el código subió correctamente.

---

## 🚀 PASO 2: Deploy a Vercel

### 2.1: Crear cuenta en Vercel

1. Ve a: https://vercel.com/signup
2. Conecta con tu cuenta de GitHub
3. Autoriza Vercel para acceder a tus repos

### 2.2: Crear nuevo proyecto

1. Click **"Add New..." → "Project"**
2. **Import Git Repository**
3. Busca y selecciona: `clara-shopify`
4. Click **"Import"**

### 2.3: Configurar proyecto

**Configure Project:**
- **Project Name:** `clara-shopify` (o el que prefieras)
- **Framework Preset:** Next.js (auto-detectado)
- **Root Directory:** `./`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### 2.4: Configurar Environment Variables

Click en **"Environment Variables"** y agrega las siguientes (12 variables):

#### **HeyGen API**

```bash
HEYGEN_API_KEY=tu_heygen_api_key_aqui
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Alessandra_CasualLook_public
NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID=588f6e52f25e4f228666c0c3d799860f
NEXT_PUBLIC_HEYGEN_VOICE_ID=1e080de3d73e4225a7454797a848bffe
```

#### **OpenAI (si lo usas)**

```bash
OPENAI_API_KEY=tu_openai_api_key_aqui
```

#### **Shopify Credentials**

```bash
SHOPIFY_HMAC_SECRET=tu_shopify_hmac_secret_aqui
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

#### **Authentication & Production (IMPORTANTE)**

```bash
NEXT_PUBLIC_AUTH_ENABLED=true
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://clara-shopify.vercel.app
```

⚠️ **MUY IMPORTANTE:** `NEXT_PUBLIC_AUTH_ENABLED=true` activa la contraseña de Clara.

### 2.5: Deploy

1. Click **"Deploy"**
2. Espera 3-5 minutos mientras Vercel construye la aplicación
3. Una vez completado, verás: ✅ **"Congratulations!"**

### 2.6: Obtener URL

Tu aplicación estará disponible en:
```
https://clara-shopify.vercel.app
```

O si elegiste otro nombre:
```
https://tu-nombre-proyecto.vercel.app
```

### 2.7: Verificar deployment

1. Abre la URL de Vercel
2. Deberías ver **AuthGate** (formulario de contraseña)
3. Ingresa la contraseña configurada
4. Verifica que Clara carga correctamente

✅ **Verificación:** Si ves AuthGate, el deploy fue exitoso.

---

## 🔄 PASO 3: Actualizar URL en Template Liquid

### 3.1: Editar template

Abre el archivo: `shopify/templates/page.clara.liquid`

En la línea 130, actualiza la URL:

```liquid
<!-- ANTES -->
<iframe src="https://clara-shopify.vercel.app" ...>

<!-- DESPUÉS (con tu URL real de Vercel) -->
<iframe src="https://tu-proyecto.vercel.app" ...>
```

### 3.2: Commit y push

```bash
git add shopify/templates/page.clara.liquid
git commit -m "fix: update Vercel URL in Liquid template"
git push
```

---

## 📦 PASO 4: Subir Template a Shopify

### 4.1: Acceder a Shopify Admin

1. Ve a: https://admin.shopify.com
2. Login con tu cuenta

### 4.2: Editar código del theme

1. **Online Store → Themes**
2. En tu theme activo, click **"Actions" → "Edit code"**
3. En el panel izquierdo, busca **"Templates"**
4. Click en **"Add a new template"**
5. Selecciona tipo: **"page"**
6. Nombre: `clara`
7. Click **"Create template"**

### 4.3: Pegar contenido

1. Abre el archivo local: `shopify/templates/page.clara.liquid`
2. **Copia TODO el contenido**
3. Pega en el editor de Shopify
4. Click **"Save"**

✅ **Verificación:** Deberías ver `templates/page.clara.liquid` en la lista.

---

## 📄 PASO 5: Crear Página en Shopify

### 5.1: Crear página

1. En Shopify Admin: **Online Store → Pages**
2. Click **"Add page"**

### 5.2: Configurar página

**Basic Information:**
- **Title:** `Clara - Asesora Virtual`
- **Content:** (dejar vacío, el template maneja todo)

**Page template:**
- Click en el dropdown
- Selecciona: **"page.clara"**

**Search engine listing:**
- **Page title:** "Clara - Asesora Virtual"
- **Description:** "Habla con Clara, tu asesora virtual de skincare personalizada"
- **URL handle:** `clara` (auto-generado)

**Visibility:**
- **Online Store:** ✅ Visible
- **Status:** Published

### 5.3: Guardar

Click **"Save"**

✅ **Verificación:** La página debería estar publicada.

---

## 🧪 PASO 6: Testing

### 6.1: Probar directamente en Vercel

```
URL: https://clara-shopify.vercel.app

✅ Verificar AuthGate aparece
✅ Ingresar contraseña
✅ Verificar Clara funciona
✅ Probar llamada de voz
```

### 6.2: Probar en Shopify Desktop

```
URL: https://tu-tienda.myshopify.com/pages/clara

✅ Loading screen aparece (3 segundos)
✅ Iframe carga desde Vercel
✅ AuthGate aparece dentro del iframe
✅ Ingresar contraseña
✅ Clara funciona dentro de Shopify
```

### 6.3: Probar en Mobile

```
1. Abrir URL en móvil real o DevTools responsive
2. Verificar responsive
3. Verificar AuthGate funciona
4. Verificar permisos de micrófono
5. Verificar video se adapta a pantalla
```

---

## 🔐 Gestión de Contraseña

### Verificar contraseña actual

La contraseña está configurada en el componente `AuthGate`.

### Desactivar contraseña (futuro)

**En Vercel:**
1. Ve a tu proyecto
2. **Settings → Environment Variables**
3. Busca: `NEXT_PUBLIC_AUTH_ENABLED`
4. Cambia valor a: `false`
5. **Redeploy** el proyecto

---

## 🐛 Troubleshooting

### Error: "This app cannot be embedded"

**Solución:** Verifica que `vercel.json` tenga:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" }
      ]
    }
  ]
}
```

### Error: AuthGate no aparece

**Solución:** Verifica en Vercel:
- `NEXT_PUBLIC_AUTH_ENABLED=true`
- Redeploy si fue cambiado

### Error: "Customer not found"

**Solución:** Tu plan de Shopify no permite acceso a Customer API.
- Upgrade a plan Shopify ($79/mes) o superior
- Mientras tanto, Clara funciona en modo genérico

### Iframe no carga en Shopify

**Solución:**
1. Verifica URL en `page.clara.liquid` es correcta
2. Abre DevTools → Console y busca errores
3. Verifica que Vercel deploy fue exitoso

---

## 📊 URLs Importantes

```
GitHub Repo: https://github.com/TU-USUARIO/clara-shopify
Vercel Dashboard: https://vercel.com/dashboard
Vercel App: https://clara-shopify.vercel.app
Shopify Page: https://tu-tienda.myshopify.com/pages/clara
Shopify Admin: https://admin.shopify.com
```

---

## 🔄 Actualizaciones Futuras

Para actualizar el código:

```bash
# 1. Hacer cambios en el código
# 2. Commit
git add .
git commit -m "descripción de cambios"
git push

# 3. Vercel re-deploys automáticamente
# 4. Espera ~2-3 minutos
# 5. Cambios visibles en Vercel y Shopify
```

---

## ✅ Checklist Final

- [ ] Repo creado en GitHub
- [ ] Código subido con push
- [ ] Proyecto creado en Vercel
- [ ] 12 variables de entorno configuradas
- [ ] `NEXT_PUBLIC_AUTH_ENABLED=true` ✅
- [ ] Deploy completado exitosamente
- [ ] URL de Vercel funciona
- [ ] Template subido a Shopify
- [ ] Página creada en Shopify
- [ ] Template `clara` asignado
- [ ] Testing en Vercel: OK
- [ ] Testing en Shopify: OK
- [ ] Testing mobile: OK

---

**Deployment completado:** ✅

**URL final:** `https://tu-tienda.myshopify.com/pages/clara`

---

**Última actualización:** Enero 2025
