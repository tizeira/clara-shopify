# 🧪 Testing de Producción - Clara Shopify

Guía completa de testing para Clara desplegada en Vercel e integrada en Shopify.

---

## 📋 Pre-requisitos de Testing

Antes de empezar, verifica que tengas:

- [ ] Clara desplegada en Vercel
- [ ] URL de Vercel funcionando
- [ ] Template Liquid subido a Shopify
- [ ] Página creada en Shopify
- [ ] AuthGate activado

---

## 🧪 TEST SUITE 1: Vercel Directo

### Test 1.1: Página Principal

**URL:** `https://tu-proyecto.vercel.app`

**Pasos:**
1. Abre la URL en navegador
2. Verifica que aparece AuthGate
3. Observa el diseño

**Resultado Esperado:**
- ✅ AuthGate visible
- ✅ Formulario de contraseña
- ✅ Fondo glassmorphism
- ✅ Botón "Acceder"

---

### Test 1.2: Autenticación

**Pasos:**
1. Ingresa contraseña incorrecta
2. Observa error
3. Ingresa contraseña correcta
4. Observa transición

**Resultado Esperado:**
- ✅ Error visible con contraseña incorrecta
- ✅ Transición suave después de auth
- ✅ Clara aparece después de validación

---

### Test 1.3: Funcionalidad de Clara

**Pasos:**
1. Click "Iniciar Llamada con Clara"
2. Acepta permisos de micrófono
3. Espera carga del avatar
4. Habla con Clara

**Resultado Esperado:**
- ✅ Video del avatar carga
- ✅ Saludo inicial de Clara
- ✅ Micrófono funciona
- ✅ Respuestas de Clara coherentes

---

### Test 1.4: Responsive (Vercel)

**Pasos:**
1. Abre DevTools (F12)
2. Selecciona modo responsive
3. Prueba resoluciones:
   - 375x667 (iPhone SE)
   - 414x896 (iPhone 11)
   - 768x1024 (iPad)
   - 1920x1080 (Desktop)

**Resultado Esperado:**
- ✅ AuthGate responsive
- ✅ Clara se adapta
- ✅ Botones accesibles
- ✅ Sin scrollbars horizontales

---

## 🧪 TEST SUITE 2: Shopify Integration

### Test 2.1: Página de Shopify

**URL:** `https://tu-tienda.myshopify.com/pages/clara`

**Pasos:**
1. Abre URL
2. Observa loading screen
3. Espera carga del iframe
4. Verifica elementos ocultos

**Resultado Esperado:**
- ✅ Loading screen morado aparece
- ✅ Se oculta después de 3-5 segundos
- ✅ Iframe carga desde Vercel
- ✅ Header/footer de Shopify ocultos
- ✅ Fullscreen sin scrollbars

---

### Test 2.2: AuthGate dentro de Shopify

**Pasos:**
1. Dentro del iframe, observa AuthGate
2. Ingresa contraseña
3. Verifica desbloqueo

**Resultado Esperado:**
- ✅ AuthGate aparece en iframe
- ✅ Mismo diseño que en Vercel
- ✅ Contraseña funciona igual
- ✅ Clara se desbloquea

---

### Test 2.3: Funcionalidad dentro de Shopify

**Pasos:**
1. Inicia llamada con Clara
2. Acepta permisos
3. Habla con Clara
4. Termina llamada

**Resultado Esperado:**
- ✅ Todo funciona como en Vercel directo
- ✅ Sin problemas de permisos
- ✅ Video se muestra correctamente
- ✅ Audio bidireccional funciona

---

### Test 2.4: Mobile en Shopify

**Pasos:**
1. Abre en móvil real (no simulador)
2. Ve a `/pages/clara`
3. Completa flujo completo

**Resultado Esperado:**
- ✅ Responsive
- ✅ AuthGate usable
- ✅ Permisos de micrófono funcionan
- ✅ Video se ve bien
- ✅ Botones accesibles

---

## 🧪 TEST SUITE 3: Cross-Browser

### Test 3.1: Chrome/Edge

**Navegadores:** Chrome 120+, Edge 120+

**Tests:**
- [ ] AuthGate funciona
- [ ] Clara funciona
- [ ] Micrófono funciona
- [ ] Video funciona

---

### Test 3.2: Firefox

**Navegador:** Firefox 120+

**Tests:**
- [ ] AuthGate funciona
- [ ] Clara funciona
- [ ] Micrófono funciona
- [ ] Video funciona

---

### Test 3.3: Safari (Desktop)

**Navegador:** Safari 17+

**Tests:**
- [ ] AuthGate funciona
- [ ] Clara funciona
- [ ] Permisos de micrófono
- [ ] Video funciona

⚠️ **Nota:** Safari puede pedir permisos de forma diferente.

---

### Test 3.4: Mobile Browsers

**iOS Safari:**
- [ ] AuthGate funciona
- [ ] Permisos de micrófono
- [ ] Video en fullscreen
- [ ] Audio bidireccional

**Chrome Mobile:**
- [ ] AuthGate funciona
- [ ] Permisos de micrófono
- [ ] Video funciona
- [ ] Audio bidireccional

---

## 🧪 TEST SUITE 4: Performance

### Test 4.1: Tiempo de Carga

**Objetivo:** Medir tiempo de carga

**Pasos:**
1. Abre DevTools → Network
2. Refresca página
3. Observa waterfall
4. Mide tiempos

**Métricas Esperadas:**
- ⏱️ First Contentful Paint: < 1.5s
- ⏱️ Time to Interactive: < 3s
- ⏱️ Total Load Time: < 5s

---

### Test 4.2: Tamaño de Assets

**Pasos:**
1. DevTools → Network
2. Filtra por tipo:
   - JS
   - CSS
   - Images
   - Fonts

**Límites Recomendados:**
- 📦 Total JS: < 500KB (gzipped)
- 📦 Total CSS: < 50KB (gzipped)
- 📦 Images: < 200KB total

---

### Test 4.3: Lighthouse Score

**Pasos:**
1. DevTools → Lighthouse
2. Selecciona:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
3. Run audit

**Scores Objetivo:**
- 🎯 Performance: > 80
- 🎯 Accessibility: > 90
- 🎯 Best Practices: > 90
- 🎯 SEO: N/A (página no indexable)

---

## 🧪 TEST SUITE 5: Security

### Test 5.1: HTTPS

**Verificación:**
```bash
curl -I https://tu-proyecto.vercel.app
```

**Esperado:**
- ✅ Status: 200 OK
- ✅ `Strict-Transport-Security` header presente

---

### Test 5.2: Headers de Seguridad

**Verificación DevTools:**
1. DevTools → Network
2. Click en request principal
3. Tab "Headers"

**Headers Esperados:**
```
X-Frame-Options: ALLOWALL
Content-Security-Policy: frame-ancestors *
```

⚠️ **Nota:** Estos headers permiten iframe en Shopify.

---

### Test 5.3: Variables de Entorno

**Verificación:**
1. View source de la página
2. Busca credenciales

**NO debe aparecer:**
- ❌ `SHOPIFY_ADMIN_ACCESS_TOKEN`
- ❌ `SHOPIFY_HMAC_SECRET`
- ❌ `HEYGEN_API_KEY`
- ❌ `OPENAI_API_KEY`

**SÍ puede aparecer:**
- ✅ `NEXT_PUBLIC_*` variables (son públicas)

---

## 🧪 TEST SUITE 6: Error Handling

### Test 6.1: Error de Red

**Pasos:**
1. DevTools → Network
2. Throttling: Offline
3. Intenta cargar Clara

**Esperado:**
- ✅ Mensaje de error user-friendly
- ✅ No crash de la app

---

### Test 6.2: Permisos Denegados

**Pasos:**
1. Bloquea permisos de micrófono
2. Intenta iniciar llamada

**Esperado:**
- ✅ Mensaje explicando que se necesitan permisos
- ✅ Instrucciones para habilitar

---

### Test 6.3: API Errors

**Escenarios:**
- HeyGen API down
- Token inválido
- Timeout

**Esperado:**
- ✅ Error manejado gracefully
- ✅ Mensaje al usuario
- ✅ No crash

---

## 📊 Matriz de Testing

| Test Suite | Desktop | Mobile | Status |
|-----------|---------|--------|--------|
| Vercel Directo | [ ] | [ ] | |
| Shopify Integration | [ ] | [ ] | |
| Cross-Browser | [ ] | [ ] | |
| Performance | [ ] | N/A | |
| Security | [ ] | N/A | |
| Error Handling | [ ] | [ ] | |

---

## 🐛 Troubleshooting por Síntoma

### Síntoma: Página en blanco

**Posibles causas:**
1. JavaScript error → Ver Console
2. Build error → Revisar Vercel logs
3. Variables faltantes → Verificar .env

---

### Síntoma: AuthGate no aparece

**Solución:**
```bash
# Vercel → Settings → Environment Variables
NEXT_PUBLIC_AUTH_ENABLED=true  # Debe estar en true
```

---

### Síntoma: Iframe no carga

**Solución:**
1. Verifica URL en `page.clara.liquid`
2. Verifica headers en `vercel.json`
3. Console → Busca errores de CORS

---

### Síntoma: Micrófono no funciona

**Solución:**
1. Verifica permisos del navegador
2. HTTPS requerido (Vercel lo provee)
3. Prueba en otro navegador

---

## ✅ Checklist Final de Testing

### Pre-Deployment:
- [ ] Build local sin errores
- [ ] TypeScript sin errores
- [ ] Tests unitarios pasan (si existen)

### Post-Deployment:
- [ ] Vercel URL accesible
- [ ] AuthGate funciona
- [ ] Clara funciona
- [ ] Shopify page carga
- [ ] Iframe funciona
- [ ] Mobile funciona
- [ ] Cross-browser OK

### Production Ready:
- [ ] Performance OK
- [ ] Security headers OK
- [ ] Error handling OK
- [ ] Documentación completa
- [ ] Cliente puede acceder

---

## 📝 Reportar Issues

Si encuentras un problema:

1. **Captura:**
   - Screenshot
   - Console errors
   - Network tab

2. **Documenta:**
   - URL exacta
   - Navegador/versión
   - Steps to reproduce

3. **Prioriza:**
   - 🔴 Crítico: No funciona nada
   - 🟡 Alto: Funcionalidad rota
   - 🟢 Medio: UX mejorable
   - ⚪ Bajo: Nice to have

---

## 🚀 Sign-off

**Testing completado por:** _______________

**Fecha:** _______________

**Resultado:** _______________

**Notas:**
```
(Agrega observaciones aquí)
```

---

**Última actualización:** Enero 2025
