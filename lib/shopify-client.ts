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
Eres Clara, asesora de skincare de Beta Skin Tech. Tu personalidad es cálida, profesional y natural como una amiga experta. Sos empática con las inseguridades sobre la piel, realista con los tiempos y resultados, y si algo requiere consulta médica lo sugerís amablemente.

PRODUCTOS BETA:

Hidratantes:
- Beta Bruma Hidratante ($1.860): refrescante con ácido hialurónico al 3%, ideal después del gimnasio o cuando la piel está tirante
- Beta CR Hidratante Universal ($5.062): la más versátil, funciona para todo tipo de piel con 5% de Fucogel que calma y protege

Boosters especializados:
- Beta Booster Firmeza ($2.832): péptidos para líneas de expresión y firmeza
- Beta Booster Juventud ($2.649): Fucogel 5% + vitamina B5 para regeneración
- Beta Booster Sebo Regulador ($2.034): niacinamida 4% para piel grasa o con brillos
- Beta Booster Glow ($1.854): extracto de azahar para luminosidad inmediata
- Beta Booster Manchas ($1.937): niacinamida 5% + vitamina C para unificar tono

GUÍA CONVERSACIONAL:
- Hablá natural y fluido, como en una conversación real. Texto corrido sin asteriscos, guiones, números ni formato.
- Respuestas breves de 15-20 segundos máximo. Conversación dinámica, no monólogo.
- Preguntá sobre tipo de piel y preocupaciones antes de recomendar productos.
- Integrá productos de forma orgánica: "Para tu piel con brillos, el Booster Sebo Regulador te va a ayudar mucho. Lo usás de noche después de limpiar y vas a notar el cambio en días."
- Si no sabés algo o necesitás más información, preguntá o sugerí consultar con especialista.
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
  // Metafields personalizados
  skinType?: 'Seca' | 'Grasa' | 'Mixta' | 'Sensible' | 'Normal';
  skinConcerns?: string[];
}

/**
 * Interfaz para datos formateados para Clara
 */
export interface ClaraCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  ordersCount: number;
  skinType?: 'Seca' | 'Grasa' | 'Mixta' | 'Sensible' | 'Normal';
  skinConcerns?: string[];
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
        metafields(first: 10, namespace: "beta_skincare") {
          edges {
            node {
              key
              value
              type
            }
          }
        }
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

    // Extract metafields
    const metafields = customer.metafields?.edges || [];
    const metafieldsMap: Record<string, any> = {};

    metafields.forEach((edge: any) => {
      const key = edge.node.key;
      const value = edge.node.value;
      const type = edge.node.type;

      // Parse based on type
      if (type === 'list.single_line_text_field') {
        metafieldsMap[key] = JSON.parse(value);
      } else {
        metafieldsMap[key] = value;
      }
    });

    // Transformar respuesta de GraphQL a formato simplificado
    return {
      id: customer.id.replace('gid://shopify/Customer/', ''),
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      ordersCount: customer.numberOfOrders || 0,
      // Metafields
      skinType: metafieldsMap['skin_type'] as any,
      skinConcerns: metafieldsMap['skin_concerns'],
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
    skinType: customer.skinType,
    skinConcerns: customer.skinConcerns,
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
    prompt += `Total de compras: ${customerData.ordersCount}\n`;

    // Skin type y concerns (metafields)
    if (customerData.skinType) {
      prompt += `Tipo de Piel: ${customerData.skinType}\n`;
      prompt += `INSTRUCCIÓN: Considera su tipo de piel ${customerData.skinType} en TODAS las recomendaciones.\n`;
    }

    if (customerData.skinConcerns && customerData.skinConcerns.length > 0) {
      prompt += `Preocupaciones: ${customerData.skinConcerns.join(', ')}\n`;
      prompt += `INSTRUCCIÓN: Enfócate en productos que aborden estas preocupaciones específicas.\n`;
    }

    prompt += `\nHistorial de compras recientes:\n${ordersText}\n\n`;
    prompt += `INSTRUCCIONES ADICIONALES:\n`;
    prompt += `- Saluda al cliente por su nombre de forma natural y amigable\n`;

    // Si es cliente recurrente
    if (customerData.ordersCount > 0) {
      prompt += `- Cliente recurrente: menciona cómo le ha ido con productos previos\n`;
    }

    prompt += `- Menciona sus compras previas cuando sea relevante para la conversación\n`;
    prompt += `- Haz recomendaciones personalizadas basadas en su historial y tipo de piel\n`;
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
