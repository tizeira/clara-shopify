# 📘 FASE 2: Implementación Clara Frontend

## 🎯 Objetivo

Integrar el sistema de personalización de Clara con datos del cliente de Shopify, permitiendo que el avatar reconozca al cliente, mencione su historial de compras, y ofrezca recomendaciones personalizadas.

---

## 📋 Resumen de Cambios

La Fase 2 modifica **4 archivos clave** del frontend para que Clara pueda:

1. ✅ Detectar parámetros de URL con credenciales de Shopify
2. ✅ Obtener datos del cliente desde el API de Fase 1
3. ✅ Pasar esos datos al sistema de avatar a través de Context
4. ✅ Personalizar el `knowledgeBase` de HeyGen con la información del cliente

---

## 🔧 Archivos Modificados

### 1. `app/page.tsx` - Detección de URL y Fetch de Datos

**Cambios realizados:**

```typescript
// Importaciones agregadas
import { ClaraCustomerData } from "@/lib/shopify-client"

// Estados nuevos
const [customerData, setCustomerData] = useState<ClaraCustomerData | null>(null)
const [customerDataLoading, setCustomerDataLoading] = useState(false)

// En useEffect: Detección de URL params
const params = new URLSearchParams(window.location.search)
const shopifyToken = params.get('shopify_token')
const customerId = params.get('customer_id')

// Si existen, llamar a API
if (shopifyToken && customerId) {
  fetch('/api/shopify-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopify_token: shopifyToken,
      customer_id: customerId
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setCustomerData(data.customer)
      }
    })
}

// Pasar customerData como prop a HelpAssistantWidget
<HelpAssistantWidget
  customerData={customerData}
  customerDataLoading={customerDataLoading}
/>
```

**Función:**
- Detecta si la URL contiene `shopify_token` y `customer_id`
- Llama al endpoint `/api/shopify-customer` (creado en Fase 1)
- Almacena los datos del cliente en el estado
- Pasa los datos al widget principal

---

### 2. `components/help-assistant-widget.tsx` - Recibir y Pasar Datos

**Cambios realizados:**

```typescript
// Importación agregada
import { ClaraCustomerData } from "@/lib/shopify-client"

// Interfaz de props
interface HelpAssistantWidgetProps {
  customerData?: ClaraCustomerData | null;
  customerDataLoading?: boolean;
}

// Recibir props y pasar al Provider
export default function HelpAssistantWidgetMobile({
  customerData,
  customerDataLoading
}: HelpAssistantWidgetProps) {
  return (
    <StreamingAvatarProvider
      basePath={process.env.NEXT_PUBLIC_BASE_API_URL}
      customerData={customerData}  // ← Pasar al Provider
    >
      <ClaraWidgetMobile />
    </StreamingAvatarProvider>
  );
}
```

**Función:**
- Recibe `customerData` desde `page.tsx`
- Actúa como intermediario pasándolo al Context Provider

---

### 3. `hooks/avatar/context.tsx` - Agregar Customer Data al Context

**Cambios realizados:**

```typescript
// Importación agregada
import { ClaraCustomerData } from "@/lib/shopify-client";

// Agregado al tipo del Context
type StreamingAvatarContextProps = {
  // ... otros campos existentes
  customerData: ClaraCustomerData | null;
  setCustomerData: (customerData: ClaraCustomerData | null) => void;
};

// Custom hook para customer data
const useCustomerDataState = (initialCustomerData?: ClaraCustomerData | null) => {
  const [customerData, setCustomerData] = useState<ClaraCustomerData | null>(
    initialCustomerData || null
  );
  return { customerData, setCustomerData };
};

// Provider actualizado para recibir customerData
export const StreamingAvatarProvider = ({
  children,
  basePath,
  customerData: initialCustomerData,  // ← Nueva prop
}: {
  children: React.ReactNode;
  basePath?: string;
  customerData?: ClaraCustomerData | null;  // ← Nueva prop
}) => {
  // ... otros hooks
  const customerDataState = useCustomerDataState(initialCustomerData);

  return (
    <StreamingAvatarContext.Provider
      value={{
        // ... otros valores
        ...customerDataState,  // ← Agregar al value
      }}
    >
      {children}
    </StreamingAvatarContext.Provider>
  );
};
```

**Función:**
- Agrega `customerData` al Context global del avatar
- Cualquier componente puede acceder a los datos del cliente
- Permite que `useStreamingAvatarSession` use los datos para personalizar

---

### 4. `hooks/avatar/useStreamingAvatarSession.ts` - Personalizar Knowledge Base

**Cambios realizados:**

```typescript
// Importación agregada
import { generateKnowledgeBaseContext } from "@/lib/shopify-client";

// Obtener customerData del context
export const useStreamingAvatarSession = () => {
  const {
    // ... otros valores
    customerData,  // ← Nuevo
  } = useStreamingAvatarContext();

  // En la función start(), antes de createStartAvatar:
  const finalConfig = { ...config };
  if (customerData) {
    const customContext = generateKnowledgeBaseContext(customerData);
    finalConfig.knowledgeBase = customContext;
    console.log('✅ Using personalized knowledge base for:',
                customerData.firstName, customerData.lastName);
  } else {
    console.log('ℹ️  No customer data - using default knowledge base');
  }

  await avatarRef.current.createStartAvatar(finalConfig);
};
```

**Función:**
- Obtiene `customerData` del Context
- Si existe, genera contexto personalizado con `generateKnowledgeBaseContext()`
- **Sobrescribe** `config.knowledgeBase` con el contexto del cliente
- Clara ahora conoce: nombre, email, historial de compras, productos previos
- Si no hay datos, usa el knowledge base por defecto

---

## 🔄 Flujo Completo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario abre URL con parámetros                             │
│     https://clara.com?shopify_token=ABC123&customer_id=7890123 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. page.tsx detecta params y llama API                         │
│     POST /api/shopify-customer                                  │
│     { shopify_token, customer_id }                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. API (Fase 1) valida HMAC y consulta Shopify                │
│     - Verifica token                                            │
│     - Consulta GraphQL a Shopify                                │
│     - Retorna datos formateados del cliente                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. page.tsx guarda datos en estado                             │
│     setCustomerData(data.customer)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. HelpAssistantWidget recibe customerData como prop           │
│     <HelpAssistantWidget customerData={customerData} />         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. StreamingAvatarProvider inicializa Context                  │
│     customerDataState = useCustomerDataState(customerData)      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. useStreamingAvatarSession obtiene customerData del Context  │
│     const { customerData } = useStreamingAvatarContext()        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. Al iniciar avatar, personaliza knowledgeBase                │
│     if (customerData) {                                         │
│       finalConfig.knowledgeBase =                               │
│         generateKnowledgeBaseContext(customerData)              │
│     }                                                            │
│     await createStartAvatar(finalConfig)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. HeyGen recibe knowledgeBase personalizado                   │
│     "Información del cliente actual:                            │
│      - Nombre: Juan Pérez                                       │
│      - Email: juan@example.com                                  │
│      - Total de compras: 3                                      │
│      Historial de compras recientes:                            │
│      1. Orden #1001 (15 de enero de 2025):                      │
│         - Producto A (x2) ..."                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 Función Clave: `generateKnowledgeBaseContext()`

Esta función (ya creada en Fase 1) convierte los datos del cliente en un texto optimizado para el avatar:

```typescript
export function generateKnowledgeBaseContext(customerData: ClaraCustomerData): string {
  return `
Información del cliente actual:
- Nombre: ${customerData.firstName} ${customerData.lastName}
- Email: ${customerData.email}
- Total de compras: ${customerData.ordersCount}

Historial de compras recientes:
  1. Orden #1001 (15 de enero de 2025):
     - Producto A (x2)
     - Producto B (x1)
  2. Orden #1002 (20 de febrero de 2025):
     - Producto C (x1)

INSTRUCCIONES PARA CLARA:
- Saluda al cliente por su nombre de forma natural y amigable
- Menciona sus compras previas cuando sea relevante
- Haz recomendaciones personalizadas basadas en su historial
- Si pregunta por productos que ya compró, reconócelo y sugiere complementos
- Si no tiene compras previas, enfócate en entender sus necesidades
`.trim();
}
```

Este texto se inyecta en el campo `knowledgeBase` de HeyGen, lo que le permite a Clara:
- ✅ Reconocer al cliente por nombre
- ✅ Saber qué productos ha comprado antes
- ✅ Hacer recomendaciones personalizadas
- ✅ Responder preguntas sobre su historial

---

## ✅ Validaciones Realizadas

### TypeScript

```bash
npm run type-check
```

**Resultado:** ✅ Sin errores

### Build de Producción

```bash
npm run build
```

**Resultado:** ✅ Compilado exitosamente

### Archivos Modificados

- [x] `app/page.tsx` - Detección de URL y fetch
- [x] `components/help-assistant-widget.tsx` - Recibir props
- [x] `hooks/avatar/context.tsx` - Context global
- [x] `hooks/avatar/useStreamingAvatarSession.ts` - Personalización

**Total:** 4 archivos modificados, 0 archivos nuevos

---

## 🧪 Próximos Pasos

Ver: `docs/TESTING_FASE_2.md` para instrucciones de testing.

---

## 📖 Referencias

- **Fase 1:** `docs/FASE_1_CONFIGURACION_PASO_A_PASO.md`
- **Testing:** `docs/TESTING_FASE_2.md`
- **Roadmap:** `docs/INTEGRATION_ROADMAP.md`
- **Architecture:** `docs/PHASE_1_ARCHITECTURE.md`

---

**Implementado:** Enero 2025
**Duración:** ~1.5 horas
**Estado:** ✅ Completado y validado
