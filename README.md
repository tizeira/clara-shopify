# Clara - Asesora Virtual con Integración Shopify

Clara es una asesora virtual de skincare impulsada por HeyGen StreamingAvatar, diseñada para integrarse perfectamente en tiendas Shopify.

---

## 🎯 Características

- ✅ **Avatar interactivo con IA** - Powered by HeyGen StreamingAvatar SDK v2.0.13
- ✅ **Chat por voz en tiempo real** - Conversaciones naturales con WebRTC
- ✅ **Integración con Shopify** - API Middleware para datos de clientes
- ✅ **Personalización inteligente** - Reconoce clientes y su historial
- ✅ **Diseño glassmorphism** - Interfaz moderna y elegante
- ✅ **Responsive** - Optimizado para desktop y mobile
- ✅ **Autenticación** - AuthGate con password protection

---

## 📋 Pre-requisitos

- Node.js 18+
- Cuenta de HeyGen con API Key
- Cuenta de Shopify (opcional para personalización)
- Cuenta de Vercel (para deployment)

---

## 🚀 Inicio Rápido

### Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/TU-USUARIO/clara-shopify.git
cd clara-shopify

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

Abre http://localhost:3000

---

## 🏗️ Estructura del Proyecto

```
clara-shopify/
├── app/
│   ├── page.tsx                    # Página principal con AuthGate
│   ├── api/
│   │   ├── get-access-token/       # HeyGen token endpoint
│   │   ├── shopify-customer/       # API Middleware de Shopify
│   │   ├── voice-chat/             # Voice chat processing
│   │   └── voice-chat-avatar/      # Avatar voice integration
│   └── globals.css                 # Estilos globales + glassmorphism
│
├── components/
│   ├── help-assistant-widget.tsx   # Widget principal de Clara
│   ├── AuthGate.tsx                # Sistema de autenticación
│   └── avatar/                     # Componentes del avatar
│       ├── AvatarVideo.tsx
│       ├── MessageHistory.tsx
│       └── VoiceInterface.tsx
│
├── hooks/avatar/
│   ├── context.tsx                 # Context API para estado global
│   ├── useStreamingAvatarSession.ts  # Gestión de sesión
│   └── useVoiceChat.ts             # Funcionalidad de voz
│
├── lib/
│   ├── shopify-client.ts           # Cliente GraphQL de Shopify
│   ├── shopify-security.ts         # HMAC validation
│   └── utils.ts
│
├── shopify/
│   └── templates/
│       └── page.clara.liquid       # Template Liquid para Shopify
│
├── docs/                           # Documentación completa
│   ├── FASE_1_CONFIGURACION_PASO_A_PASO.md
│   ├── FASE_2_IMPLEMENTACION.md
│   ├── FASE_3_SHOPIFY_INTEGRATION.md
│   └── TESTING_PRODUCTION.md
│
├── scripts/
│   └── test-shopify-integration.js # Testing automatizado
│
├── vercel.json                     # Configuración de Vercel
├── DEPLOYMENT.md                   # Guía de deployment
└── .env.example                    # Template de variables
```

---

## 🔧 Configuración

### Variables de Entorno

Crea `.env.local` con las siguientes variables:

```bash
# HeyGen API
HEYGEN_API_KEY=tu_heygen_api_key
NEXT_PUBLIC_BASE_API_URL=https://api.heygen.com
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Alessandra_CasualLook_public
NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID=tu_knowledge_id
NEXT_PUBLIC_HEYGEN_VOICE_ID=tu_voice_id

# OpenAI (opcional)
OPENAI_API_KEY=tu_openai_key

# Shopify (opcional - para personalización)
SHOPIFY_HMAC_SECRET=tu_hmac_secret
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx

# Autenticación
NEXT_PUBLIC_AUTH_ENABLED=false  # true en producción
```

Ver `.env.example` para más detalles.

---

## 🚀 Deployment

### Deploy a Vercel

1. **Crear repositorio en GitHub**
2. **Conectar con Vercel**
3. **Configurar variables de entorno**
4. **Deploy**

Ver guía completa: `DEPLOYMENT.md`

### Integración en Shopify

1. **Subir template Liquid**
2. **Crear página en Shopify**
3. **Configurar contraseña**

Ver guía completa: `docs/FASE_3_SHOPIFY_INTEGRATION.md`

---

## 📖 Documentación

### Guías de Implementación

- **[Fase 1: API Middleware](docs/FASE_1_CONFIGURACION_PASO_A_PASO.md)** - Configuración de Shopify y seguridad
- **[Fase 2: Frontend](docs/FASE_2_IMPLEMENTACION.md)** - Integración de Clara con customer data
- **[Fase 3: Shopify](docs/FASE_3_SHOPIFY_INTEGRATION.md)** - Integración en tienda Shopify

### Guías de Deployment

- **[Deployment](DEPLOYMENT.md)** - Deploy completo a Vercel + Shopify
- **[Testing](docs/TESTING_PRODUCTION.md)** - Suite completa de testing

---

## 🎯 Características Técnicas

### Avatar & IA

- **HeyGen StreamingAvatar SDK** v2.0.13
- **Voz en español** - Fernanda Olea (natural)
- **Knowledge Base** - Base de conocimientos personalizable
- **WebRTC** - Streaming de video en tiempo real
- **Deepgram STT** - Speech-to-text integration

### Shopify Integration

- **Admin API** - GraphQL client
- **HMAC Security** - Token validation server-side
- **Customer Data** - Historial de compras y personalización
- **API Middleware** - Capa de seguridad y transformación

### Frontend

- **Next.js 14** - App Router
- **TypeScript** - Type-safe
- **Tailwind CSS** - Styling
- **React Context** - State management
- **Custom Hooks** - Modular architecture

---

## 🔐 Seguridad

- ✅ HMAC token validation
- ✅ Server-side API keys
- ✅ No customer data exposed to client
- ✅ HTTPS only (enforced by Vercel)
- ✅ AuthGate password protection
- ✅ CORS configured properly

---

## 🌐 URLs de Producción

```
Aplicación: https://clara-shopify.vercel.app
Shopify: https://tu-tienda.myshopify.com/pages/clara
GitHub: https://github.com/TU-USUARIO/clara-shopify
```

---

## 🧪 Testing

### Local

```bash
npm run type-check  # TypeScript validation
npm run build       # Production build
npm run dev         # Development server
```

### Shopify Integration

```bash
node scripts/test-shopify-integration.js
```

Ver guía completa: `docs/TESTING_PRODUCTION.md`

---

## 🛠️ Scripts Disponibles

```bash
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run start       # Servidor de producción
npm run lint        # Linter
npm run type-check  # Validación TypeScript
```

---

## 📊 Estado del Proyecto

```
✅ Fase 1: API Middleware          - Completada
✅ Fase 2: Clara Frontend          - Completada
✅ Fase 3: Shopify Integration     - Completada
⏳ Fase 4: Customer Personalization - Requiere Shopify plan upgrade
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License

---

## 🆘 Soporte

Para problemas o preguntas:

1. **Revisa la documentación** en `/docs`
2. **Consulta troubleshooting** en `DEPLOYMENT.md`
3. **Ejecuta tests** con `node scripts/test-shopify-integration.js`
4. **Abre un issue** en GitHub

---

## 🙏 Agradecimientos

- **HeyGen** - StreamingAvatar SDK
- **Shopify** - E-commerce platform
- **Vercel** - Hosting & deployment
- **Next.js** - React framework

---

**Built with ❤️ for Beta Skin Tech**

**Última actualización:** Enero 2025
