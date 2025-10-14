# 📘 FASE 3: Integración en Shopify

Guía completa para integrar Clara en tu tienda Shopify.

---

## 🎯 Objetivo

Integrar Clara como página dedicada en Shopify, accesible a través de `/pages/clara`, con protección mediante AuthGate.

---

## 📋 Pre-requisitos

Antes de iniciar Fase 3, verifica:

- [x] Fase 1 completada (API Middleware)
- [x] Fase 2 completada (Clara Frontend)
- [x] Deploy en Vercel exitoso
- [x] URL de Vercel funcionando
- [x] AuthGate activado (`NEXT_PUBLIC_AUTH_ENABLED=true`)

**Verificación rápida:**
```bash
# Abre en navegador:
https://tu-proyecto.vercel.app

# Deberías ver AuthGate (formulario de contraseña)
```

---

## 🛠️ Pasos de Integración

### **Paso 1: Subir Template Liquid a Shopify** (10 min)

#### 1.1: Acceder al Editor de Código

1. Ve a: **Shopify Admin** (https://admin.shopify.com)
2. Menú lateral → **Online Store**
3. Sección **Themes**
4. En tu theme activo → **Actions** → **Edit code**

#### 1.2: Crear Nuevo Template

1. Panel izquierdo → **Templates**
2. Click **"Add a new template"**
3. **Template type:** `page`
4. **Template name:** `clara`
5. Click **"Create template"**

#### 1.3: Copiar Contenido del Template

1. Abre el archivo local:
   ```
   shopify/templates/page.clara.liquid
   ```

2. **IMPORTANTE:** Antes de copiar, actualiza la URL del iframe:
   ```liquid
   <!-- Línea ~130 -->
   <iframe src="https://TU-URL-VERCEL.vercel.app" ...>
   ```
   Reemplaza `TU-URL-VERCEL` con tu URL real de Vercel.

3. **Copia TODO el contenido** del archivo

4. **Pega** en el editor de Shopify

5. Click **"Save"**

✅ **Verificación:** Deberías ver `templates/page.clara.liquid` en la lista de templates.

---

### **Paso 2: Crear Página en Shopify** (5 min)

#### 2.1: Ir a Pages

1. Shopify Admin → **Online Store** → **Pages**
2. Click **"Add page"**

#### 2.2: Configurar Página

**Sección: Content**

- **Title:** `Clara - Asesora Virtual`

- **Content:** (dejar vacío)

  ⚠️ No agregues nada aquí - el template maneja todo el contenido.

**Sección: Template (al lado derecho)**

- Click en **"Change template"**
- Selecciona: **`page.clara`**
- Se verá como: `Template: page.clara`

**Sección: Search engine listing preview**

- **Page title:** `Clara - Asesora Virtual`
- **Description:** `Habla con Clara, tu asesora virtual de skincare personalizada`
- **URL and handle:** `clara` (auto-generado)

**Sección: Visibility**

- **Online Store:** ✅ Visible
- **Status:** **Published**

#### 2.3: Guardar

Click **"Save"** (botón superior derecho)

✅ **Verificación:** La página aparece en la lista con estado "Published".

---

### **Paso 3: Testing** (15 min)

#### Test 1: Verificar Template

1. **Ve a la página:**
   ```
   https://tu-tienda.myshopify.com/pages/clara
   ```

2. **Deberías ver:**
   - Loading screen morado (3-5 segundos)
   - Luego, iframe cargando
   - Header/footer de Shopify ocultos

✅ **Esperado:** Página fullscreen con Clara cargando.

---

#### Test 2: Verificar AuthGate

1. **Dentro del iframe**, deberías ver:
   - Formulario de contraseña
   - "🔒 Acceso Restringido"
   - Campo de contraseña

2. **Ingresa la contraseña** configurada en `AuthGate`

3. **Clara debería desbloquearse**

✅ **Esperado:** Después de auth, Clara se muestra completa.

---

#### Test 3: Verificar Funcionalidad

1. **Click en "Iniciar Llamada con Clara"**

2. **Verificar:**
   - Video carga correctamente
   - Micrófono funciona
   - Clara responde
   - Interfaz responsive

✅ **Esperado:** Todo funciona como en Vercel directo.

---

#### Test 4: Mobile

1. **Abre en móvil** (o DevTools → Responsive)

2. **Verificar:**
   - Responsive design
   - AuthGate se ve bien
   - Clara ocupa fullscreen
   - No hay scrollbars
   - Permisos de micrófono funcionan

✅ **Esperado:** Experiencia mobile óptima.

---

### **Paso 4: Opcional - Agregar Link en Menú** (5 min)

Si quieres que los clientes encuentren fácilmente a Clara:

#### 4.1: Editar Menú

1. Shopify Admin → **Online Store** → **Navigation**
2. Click en **"Main menu"** (o el menú que uses)
3. Click **"Add menu item"**

#### 4.2: Configurar Link

- **Name:** `Hablar con Clara` (o el texto que prefieras)
- **Link:** Selecciona "Pages" → `Clara - Asesora Virtual`

#### 4.3: Reordenar (opcional)

Arrastra el item donde quieras que aparezca en el menú.

#### 4.4: Guardar

Click **"Save menu"**

✅ **Verificación:** El link aparece en tu tienda.

---

## 🔄 Flujo Completo de Usuario

```
1. Cliente va a: tu-tienda.myshopify.com/pages/clara
         ↓
2. Shopify carga template page.clara.liquid
         ↓
3. Template muestra loading screen morado
         ↓
4. Iframe carga desde Vercel:
   https://tu-proyecto.vercel.app
         ↓
5. Clara detecta NEXT_PUBLIC_AUTH_ENABLED=true
         ↓
6. Muestra AuthGate (formulario de contraseña)
         ↓
7. Cliente ingresa contraseña
         ↓
8. Clara se desbloquea
         ↓
9. Cliente puede hablar con Clara normalmente
```

---

## 🎨 Personalización

### Cambiar URL del Iframe

Editar `page.clara.liquid` línea ~130:

```liquid
<iframe src="https://nueva-url.vercel.app" ...>
```

### Cambiar Colores de Loading

Editar `page.clara.liquid` línea ~55:

```css
.loading-screen {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Cambia estos colores */
}
```

### Cambiar Texto de Loading

Editar `page.clara.liquid` línea ~127:

```liquid
<p class="loading-text">Cargando Clara...</p>
<p class="loading-subtext">Tu asesora virtual de skincare</p>
```

---

## 🐛 Troubleshooting

### Problema 1: "Page not found"

**Síntoma:** Error 404 al abrir `/pages/clara`

**Solución:**
1. Verifica que la página esté Published
2. Shopify Admin → Pages → Busca "Clara"
3. Si está en Draft, cambia a Published

---

### Problema 2: Iframe en blanco

**Síntoma:** Loading screen desaparece pero iframe está vacío

**Solución:**
1. Abre DevTools (F12) → Console
2. Busca errores
3. Verifica URL en el template:
   ```liquid
   <iframe src="https://TU-URL-VERCEL.vercel.app" ...>
   ```
4. Verifica que Vercel deploy sea exitoso

---

### Problema 3: AuthGate no aparece

**Síntoma:** Clara carga directamente sin pedir contraseña

**Solución:**
1. Ve a Vercel → Tu proyecto → Settings → Environment Variables
2. Verifica: `NEXT_PUBLIC_AUTH_ENABLED=true`
3. Si estaba en `false`, cámbialo a `true`
4. Redeploy el proyecto

---

### Problema 4: "This content cannot be displayed in a frame"

**Síntoma:** Error de embedding

**Solución:**
1. Verifica `vercel.json` tenga:
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
2. Commit y push
3. Vercel redeploys automáticamente

---

### Problema 5: Header/Footer de Shopify visible

**Síntoma:** Se ve el header/footer normal de la tienda

**Solución:**
Verifica en `page.clara.liquid` líneas ~110-120:

```css
.shopify-section-header,
.shopify-section-footer,
header,
footer,
nav {
  display: none !important;
}
```

Si ya está, prueba agregar:

```javascript
// En la sección <script>
document.addEventListener('DOMContentLoaded', function() {
  document.body.style.overflow = 'hidden';
});
```

---

## 📊 Checklist de Integración

### Shopify:
- [ ] Template `page.clara.liquid` subido
- [ ] URL de iframe actualizada en template
- [ ] Página "Clara" creada
- [ ] Template `page.clara` asignado
- [ ] Página publicada (Published)
- [ ] Link en menú agregado (opcional)

### Testing:
- [ ] URL `/pages/clara` carga
- [ ] Loading screen aparece
- [ ] Iframe carga desde Vercel
- [ ] AuthGate aparece
- [ ] Contraseña funciona
- [ ] Clara funciona dentro de iframe
- [ ] Responsive mobile funciona
- [ ] Permisos de micrófono funcionan

### Verificación Final:
- [ ] No hay header/footer de Shopify
- [ ] Fullscreen (sin scrollbars)
- [ ] Clara responsive
- [ ] Sin errores en Console

---

## 🚀 Próximos Pasos

### Fase 4: Activar Personalización (cuando se haga upgrade de Shopify)

Cuando tu tienda tenga plan Shopify ($79/mes) o superior:

1. **Verificar permisos** en Shopify App
   - `read_customers` activo
   - `read_orders` activo

2. **Probar customer data**
   ```bash
   node scripts/test-shopify-integration.js
   ```

3. **Generar URL de prueba:**
   ```
   https://tu-tienda.myshopify.com/pages/clara?shopify_token=TOKEN&customer_id=ID
   ```

4. **Clara personalizará:**
   - Saludo con nombre del cliente
   - Historial de compras
   - Recomendaciones personalizadas

---

## 📖 Referencias

- **Deployment:** `DEPLOYMENT.md`
- **Fase 1:** `docs/FASE_1_CONFIGURACION_PASO_A_PASO.md`
- **Fase 2:** `docs/FASE_2_IMPLEMENTACION.md`
- **Testing:** `docs/TESTING_PRODUCTION.md`

---

**Implementado:** Enero 2025
**Estado:** ✅ Listo para producción
