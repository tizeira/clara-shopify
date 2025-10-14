# Roadmap de Integración Shopify-Clara

## 📍 Estado Actual: FASE 1 COMPLETADA ✅

### Lo que ya funciona:

- ✅ API middleware segura (`/api/shopify-customer`)
- ✅ Validación HMAC de tokens
- ✅ Cliente GraphQL para Shopify
- ✅ Formateo de datos para Clara
- ✅ Generación de contexto para knowledgeBase
- ✅ Health check endpoint
- ✅ Documentación completa
- ✅ TypeScript sin errores
- ✅ Build exitoso

### Archivos creados:

```
✓ lib/shopify-security.ts       (1.9 KB)
✓ lib/shopify-client.ts         (6.5 KB)
✓ app/api/shopify-customer/     (directorio)
  └── route.ts                  (4.1 KB)
✓ docs/SHOPIFY_SETUP.md         (5.8 KB)
✓ docs/PHASE_1_ARCHITECTURE.md  (8.3 KB)
✓ .env.example                  (actualizado)
```

---

## 🎯 FASE 2: Integración en Clara Frontend

**Objetivo**: Hacer que Clara detecte y consuma customer data de Shopify

**Tiempo estimado**: 1.5-2 horas

### 2.1 Modificar app/page.tsx (30 min)

**Qué hacer:**
1. Agregar detección de URL params (`shopify_token`, `customer_id`)
2. Llamar a `/api/shopify-customer` si params presentes
3. Pasar `customerData` al `StreamingAvatarProvider`

**Código a agregar:**
```typescript
// app/page.tsx
const [customerData, setCustomerData] = useState(null);

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const shopifyToken = urlParams.get('shopify_token');
  const customerId = urlParams.get('customer_id');

  if (shopifyToken && customerId) {
    fetch('/api/shopify-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopify_token: shopifyToken, customer_id: customerId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setCustomerData(data.customer);
      }
    })
    .catch(console.error);
  }
}, []);

// Pasar a Provider
<StreamingAvatarProvider customerData={customerData}>
```

**Validación:**
- [ ] URL sin params → funciona normal
- [ ] URL con params válidos → carga customer data
- [ ] URL con params inválidos → muestra error sin crash

---

### 2.2 Modificar hooks/avatar/context.tsx (20 min)

**Qué hacer:**
1. Agregar `customerData` al Context type
2. Agregar parámetro al Provider
3. Exportar en el Context value

**Código a agregar:**
```typescript
// hooks/avatar/context.tsx
type StreamingAvatarContextProps = {
  // ... existing fields
  customerData: any | null;
};

export const StreamingAvatarProvider = ({
  children,
  basePath,
  customerData = null,
}: {
  children: React.ReactNode;
  basePath?: string;
  customerData?: any;
}) => {
  // ... existing state

  return (
    <StreamingAvatarContext.Provider value={{
      // ... existing values
      customerData,
    }}>
      {children}
    </StreamingAvatarContext.Provider>
  );
};
```

**Validación:**
- [ ] TypeScript compila sin errores
- [ ] Context accesible desde hooks

---

### 2.3 Modificar hooks/avatar/useStreamingAvatarSession.ts (40 min)

**Qué hacer:**
1. Importar `generateKnowledgeBaseContext` de `lib/shopify-client`
2. Extraer `customerData` del Context
3. Agregar lógica para personalizar `config.knowledgeBase`

**Código a agregar:**
```typescript
// hooks/avatar/useStreamingAvatarSession.ts
import { generateKnowledgeBaseContext } from '@/lib/shopify-client';

export const useStreamingAvatarSession = () => {
  const {
    // ... existing
    customerData,
  } = useStreamingAvatarContext();

  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      // ... existing validation

      // NUEVO: Personalizar knowledgeBase si hay customer data
      if (customerData) {
        const context = generateKnowledgeBaseContext(customerData);
        config.knowledgeBase = context;
        console.log('✅ Avatar personalizado con datos del cliente:', customerData.firstName);
      }

      // ... resto del código
      await avatarRef.current.createStartAvatar(config);
    },
    [
      // ... existing dependencies
      customerData,
    ]
  );

  // ... resto
};
```

**Validación:**
- [ ] Sin customer data → avatar funciona normal
- [ ] Con customer data → avatar usa knowledgeBase personalizado
- [ ] Console.log muestra nombre del cliente

---

### 2.4 Testing Local (20 min)

**Cómo probar Fase 2:**

1. **Generar token de prueba:**
```bash
node -e "
const crypto = require('crypto');
const secret = process.env.SHOPIFY_HMAC_SECRET || 'test-secret';
const customerId = '1234567890'; // Customer ID real de Shopify
const token = crypto.createHmac('sha256', secret).update(customerId).digest('hex');
console.log('Token:', token);
console.log('URL de prueba:');
console.log('http://localhost:3000?shopify_token=' + token + '&customer_id=' + customerId);
"
```

2. **Probar en navegador:**
   - Abrir URL generada
   - Clara debe cargar normalmente
   - En consola: buscar "Avatar personalizado con datos del cliente"
   - Hablar con Clara: debe mencionar el nombre del cliente

3. **Validar knowledgeBase:**
   - Clara debe saludar por nombre
   - Si tiene compras, Clara las menciona cuando sea relevante

**Checklist Fase 2:**
- [ ] app/page.tsx modificado
- [ ] hooks/avatar/context.tsx modificado
- [ ] hooks/avatar/useStreamingAvatarSession.ts modificado
- [ ] TypeScript sin errores
- [ ] Build exitoso
- [ ] Test con URL + token funciona
- [ ] Clara personalizada con customer data

---

## 🎯 FASE 3: Templates Shopify

**Objetivo**: Crear páginas Liquid que cargan Clara en iframe

**Tiempo estimado**: 2-2.5 horas

### 3.1 Crear Template Principal (45 min)

**Archivo**: `templates/page.clara-advisor.liquid`

**Qué hace:**
- Verifica que customer está logueado
- Verifica que tiene al menos 1 compra
- Si cumple requisitos: carga Clara
- Si no: muestra mensaje de acceso denegado

**Estructura:**
```liquid
{% unless customer %}
  <script>window.location.href = '/account/login?return_to={{ page.url }}';</script>
{% endunless %}

{% if customer.orders_count == 0 %}
  {%- render 'clara-no-access' -%}
{% else %}
  {%- render 'clara-fullscreen', customer: customer -%}
{% endif %}
```

---

### 3.2 Crear Snippet Fullscreen (45 min)

**Archivo**: `snippets/clara-fullscreen.liquid`

**Qué hace:**
- Genera token HMAC del customer ID
- Carga Clara en iframe fullscreen
- Pasa token + customer_id como URL params

**Importante:**
```liquid
{% comment %}
El secret debe ser el mismo que SHOPIFY_HMAC_SECRET en Clara
Configurar en: Theme Settings → Custom Settings
{% endcomment %}
{% assign customer_token = customer.id | hmac_sha256: settings.shopify_hmac_secret %}

<iframe
  src="https://tu-clara.vercel.app?shopify_token={{ customer_token }}&customer_id={{ customer.id }}"
  allow="microphone">
</iframe>
```

---

### 3.3 Crear Snippet No Access (30 min)

**Archivo**: `snippets/clara-no-access.liquid`

**Qué hace:**
- Mensaje elegante de "acceso exclusivo"
- Botón para ir a productos
- Diseño profesional con gradientes

---

### 3.4 Setup en Shopify (30 min)

**Pasos:**

1. **Subir archivos:**
   - Shopify Admin → Online Store → Themes
   - Actions → Edit code
   - Crear archivos en carpetas correspondientes

2. **Crear página:**
   - Shopify Admin → Online Store → Pages
   - Add page → Title: "Clara - Asesora Virtual"
   - URL: `clara-advisor-secret`
   - Template: `page.clara-advisor`

3. **Configurar secret:**
   - Theme Settings → Custom Settings
   - Agregar text field: `shopify_hmac_secret`
   - Valor: El mismo de `SHOPIFY_HMAC_SECRET` en Clara

4. **Generar QR:**
   - URL: `https://tu-tienda.com/pages/clara-advisor-secret`
   - Usar QR generator
   - Imprimir para packaging

**Checklist Fase 3:**
- [ ] templates/page.clara-advisor.liquid creado
- [ ] snippets/clara-fullscreen.liquid creado
- [ ] snippets/clara-no-access.liquid creado
- [ ] Archivos subidos a Shopify
- [ ] Página creada y publicada
- [ ] Theme settings configurado
- [ ] URL accesible
- [ ] QR generado

---

## 🎯 FASE 4: Testing & Refinamiento

**Objetivo**: Validar integración end-to-end

**Tiempo estimado**: 1-1.5 horas

### 4.1 Test Cases

**Test 1: Usuario sin login**
- [ ] Abrir URL de página Clara
- [ ] Debe redirigir a login
- [ ] Después de login → vuelve a página Clara

**Test 2: Cliente sin compras**
- [ ] Login con cuenta sin compras
- [ ] Debe ver mensaje "Acceso Exclusivo"
- [ ] Botón "Ver Productos" funciona

**Test 3: Cliente con compras**
- [ ] Login con cuenta con ≥1 compra
- [ ] Clara carga en fullscreen
- [ ] Micrófono se activa
- [ ] Clara saluda por nombre
- [ ] Clara menciona productos comprados cuando relevante

**Test 4: Flujo conversacional**
- [ ] "Hola" → Clara saluda por nombre
- [ ] "¿Qué he comprado?" → Clara lista productos
- [ ] "Recomiéndame algo" → Basado en historial
- [ ] "Gracias" → Clara responde apropiadamente

**Test 5: Edge cases**
- [ ] Token manipulado → Error 401 (no crash)
- [ ] Customer ID inexistente → Error 404 (no crash)
- [ ] Sin conexión a Shopify → Error manejado

### 4.2 Optimizaciones Opcionales

Si hay tiempo extra:

**Performance:**
- [ ] Implementar cache de customer data (5 min TTL)
- [ ] Lazy load del iframe
- [ ] Preconnect a dominios externos

**UX:**
- [ ] Loading state mientras carga Clara
- [ ] Error boundary para fallos
- [ ] Retry automático en error de red

**Analytics:**
- [ ] Log de inicios de sesión Clara
- [ ] Tracking de conversaciones
- [ ] Métricas de satisfacción

---

## 📊 Resumen de Tiempo

| Fase | Tiempo | Status |
|------|--------|--------|
| Fase 1: API Middleware | 2-2.5h | ✅ COMPLETA |
| Fase 2: Clara Frontend | 1.5-2h | 🔜 Siguiente |
| Fase 3: Shopify Templates | 2-2.5h | ⏳ Pendiente |
| Fase 4: Testing | 1-1.5h | ⏳ Pendiente |
| **TOTAL** | **7-8.5h** | **1 día completo** |

---

## 🚀 Próximo Paso: Iniciar Fase 2

Para empezar Fase 2, ejecuta:

```bash
# 1. Asegúrate de que Fase 1 funciona
npm run dev
curl http://localhost:3000/api/shopify-customer
# Debe retornar: {"status":"ok","configured":true}

# 2. Empieza modificaciones en app/page.tsx
```

Sigue la guía en este documento sección "FASE 2" para los cambios específicos.

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
**Fase actual**: ✅ Fase 1 completa → 🔜 Iniciar Fase 2
