const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2024-01'; // Versión actual de Shopify Admin API

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.warn('⚠️  Shopify credentials not configured. Shopify integration will not work.');
}

/**
 * Prompt base de Clara con personalidad y conocimiento de productos
 * Este prompt se usa SIEMPRE, incluso sin datos de usuario
 */
const CLARA_BASE_PROMPT = `
Eres Clara, asistente de belleza inteligente de Beta Skin Tech, especializada en cuidado facial personalizado.

CONTEXTO DE SISTEMA:
- Tu primer mensaje (saludo inicial) es enviado automáticamente de forma hardcodeada cuando el usuario inicia la sesión
- NO repitas el saludo ni te presentes nuevamente en la conversación
- Continúa naturalmente desde tu primer mensaje, enfocándote en ayudar con skincare

IMPORTANTE PARA INTERACCIÓN POR VOZ:
- Habla de forma completamente natural y fluida, como en una conversación real entre amigas
- NUNCA uses asteriscos, guiones, números, listas, negritas ni ningún formato de texto
- Todo debe ser texto corrido que suene natural cuando se convierta en voz
- En lugar de enumerar, conecta las ideas con frases como "después", "luego", "también", "además"

CONOCIMIENTO DE PRODUCTOS BETA:

Hidratantes principales:
- Beta Bruma Hidratante ($1.860 pesos chilenos): perfecta para refrescar durante el día, contiene ácido hialurónico al 3%, ideal después del gimnasio o cuando sientas la piel tirante
- Beta CR Hidratante Universal ($5.062 pesos chilenos): nuestra crema más versátil, funciona para todo tipo de piel con un 5% de Fucogel que calma y protege

Boosters especializados:
- Beta Booster Firmeza ($2.832 pesos chilenos): si te preocupan las líneas de expresión, este tiene péptidos que ayudan con la firmeza
- Beta Booster Juventud ($2.649 pesos chilenos): con Fucogel al 5% y vitamina B5, es excelente para pieles que necesitan regeneración
- Beta Booster Sebo Regulador ($2.034 pesos chilenos): perfecto para piel grasa o con brillos, contiene niacinamida al 4% que equilibra la producción de sebo
- Beta Booster Glow ($1.854 pesos chilenos): para dar luminosidad inmediata, tiene extracto de azahar que ilumina naturalmente
- Beta Booster Manchas ($1.937 pesos chilenos): con niacinamida al 5% y vitamina C estable, es ideal para unificar el tono

FORMA DE RECOMENDAR PRODUCTOS:
Cuando menciones un producto, intégralo naturalmente en la conversación. Por ejemplo:
"Para tu piel mixta con tendencia a brillos, te vendría perfecto el Booster Sebo Regulador de Beta que tiene niacinamida, lo podés usar de noche después de limpiar bien la cara y vas a notar como se equilibra la grasitud en unos días."

PERSONALIDAD Y TONO:
- Cálida y profesional pero cercana, como una amiga que sabe del tema
- Empática con las inseguridades sobre la piel
- No prometas milagros, sé realista sobre los tiempos y resultados
- Si algo requiere consulta médica, sugiérelo amablemente

ESTRUCTURA DE CONSULTA:
1. Pregunta cómo podés ayudar (el saludo ya fue dado automáticamente)
2. Hace 2-3 preguntas sobre tipo de piel y preocupaciones principales
3. Recomienda una rutina simple con 2-3 productos Beta específicos
4. Ofrece ampliar información si lo desean
5. Cierra invitando a seguir consultando

Ejemplo de respuesta natural:
"Contame un poco sobre tu piel, qué es lo que más te preocupa o qué te gustaría mejorar y así puedo recomendarte los productos ideales para vos."

Mantén las respuestas entre 30-45 segundos cuando hables, para que sea una conversación dinámica y no un monólogo.
`.trim();

/**
 * Interfaz para items de una orden
 */
interface ShopifyOrderLineItem {
  title: string;
  quantity: number;
  variant?: {
    title: string;
  };
}

/**
 * Interfaz para orden de Shopify
 */
export interface ShopifyCustomerOrder {
  name: string;
  createdAt: string;
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
  lineItems: ShopifyOrderLineItem[];
}

/**
 * Interfaz para customer de Shopify
 */
export interface ShopifyCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ordersCount: number;
  orders: ShopifyCustomerOrder[];
}

/**
 * Interfaz para datos formateados para Clara
 */
export interface ClaraCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  ordersCount: number;
  recentOrders: Array<{
    name: string;
    date: string;
    items: Array<{
      title: string;
      quantity: number;
    }>;
  }>;
}

/**
 * Obtiene datos del cliente desde Shopify Admin API
 *
 * @param customerId - ID del cliente (sin el prefijo gid://)
 * @returns Datos del cliente o null si hay error
 */
export async function fetchShopifyCustomer(
  customerId: string
): Promise<ShopifyCustomer | null> {
  if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const query = `
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        email
        numberOfOrders
        orders(first: 10, reverse: true) {
          edges {
            node {
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    id: `gid://shopify/Customer/${customerId}`
  };

  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        },
        body: JSON.stringify({ query, variables })
      }
    );

    if (!response.ok) {
      console.error(`Shopify API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }

    const customer = data.data?.customer;

    if (!customer) {
      console.warn(`Customer ${customerId} not found in Shopify`);
      return null;
    }

    // Transformar respuesta de GraphQL a formato simplificado
    return {
      id: customer.id.replace('gid://shopify/Customer/', ''),
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      ordersCount: customer.numberOfOrders || 0,
      orders: customer.orders.edges.map((edge: any) => ({
        name: edge.node.name,
        createdAt: edge.node.createdAt,
        totalPrice: {
          amount: edge.node.totalPriceSet.shopMoney.amount,
          currencyCode: edge.node.totalPriceSet.shopMoney.currencyCode,
        },
        lineItems: edge.node.lineItems.edges.map((item: any) => ({
          title: item.node.title,
          quantity: item.node.quantity,
          variant: item.node.variant ? {
            title: item.node.variant.title
          } : undefined,
        }))
      }))
    };

  } catch (error) {
    console.error('Failed to fetch Shopify customer:', error);
    return null;
  }
}

/**
 * Formatea los datos del cliente para Clara
 * Convierte el formato de Shopify a un formato optimizado para el avatar
 *
 * @param customer - Datos del cliente de Shopify
 * @returns Datos formateados para Clara
 */
export function formatCustomerForClara(customer: ShopifyCustomer): ClaraCustomerData {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    ordersCount: customer.ordersCount,
    recentOrders: customer.orders.slice(0, 5).map(order => ({
      name: order.name,
      date: new Date(order.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      items: order.lineItems.map(item => ({
        title: item.title,
        quantity: item.quantity
      }))
    }))
  };
}

/**
 * Genera el contexto de knowledge base para el avatar
 * SIEMPRE incluye CLARA_BASE_PROMPT + personalización opcional
 *
 * @param customerData - Datos del cliente de Shopify (opcional, para futuro)
 * @param userName - Nombre capturado localmente (opcional)
 * @returns String con el prompt personalizado
 */
export function generateKnowledgeBaseContext(
  customerData: ClaraCustomerData | null,
  userName?: string
): string {
  // SIEMPRE empezar con el prompt base de Clara
  let prompt = CLARA_BASE_PROMPT;

  // Agregar personalización si existe
  if (customerData) {
    // Caso Shopify: Información completa del cliente
    const ordersText = customerData.recentOrders.length > 0
      ? customerData.recentOrders.map((order, idx) =>
          `  ${idx + 1}. Orden ${order.name} (${order.date}):\n` +
          order.items.map(item => `     - ${item.title} (x${item.quantity})`).join('\n')
        ).join('\n')
      : '  (No tiene compras previas aún)';

    prompt += `\n\n---INFORMACIÓN DEL CLIENTE ACTUAL---\n`;
    prompt += `Nombre: ${customerData.firstName} ${customerData.lastName}\n`;
    prompt += `Email: ${customerData.email}\n`;
    prompt += `Total de compras: ${customerData.ordersCount}\n\n`;
    prompt += `Historial de compras recientes:\n${ordersText}\n\n`;
    prompt += `INSTRUCCIONES ADICIONALES:\n`;
    prompt += `- Saluda al cliente por su nombre de forma natural y amigable\n`;
    prompt += `- Menciona sus compras previas cuando sea relevante para la conversación\n`;
    prompt += `- Haz recomendaciones personalizadas basadas en su historial\n`;
    prompt += `- Si pregunta por productos que ya compró, reconócelo y sugiere complementos\n`;
  } else if (userName) {
    // Caso localStorage: Solo nombre
    prompt += `\n\n---INFORMACIÓN DEL CLIENTE ACTUAL---\n`;
    prompt += `Nombre: ${userName}\n\n`;
    prompt += `INSTRUCCIÓN ADICIONAL:\n`;
    prompt += `- Usa el nombre "${userName}" naturalmente en la conversación cuando sea apropiado\n`;
    prompt += `- Mantén un tono personalizado y cercano\n`;
  }
  // Si no hay customerData ni userName, solo retorna el prompt base

  return prompt;
}
