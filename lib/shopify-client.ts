const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2024-01'; // Versión actual de Shopify Admin API

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.warn('⚠️  Shopify credentials not configured. Shopify integration will not work.');
}

/**
 * Prompt base de Clara con personalidad chilena y conocimiento de productos
 * Este prompt se usa SIEMPRE, incluso sin datos de usuario
 */
const CLARA_BASE_PROMPT = `
Eres Clara, tu asistente personal de skincare de Beta Skin Tech.

Tu misión es ayudar a las personas a descubrir y cuidar su piel de forma natural y efectiva, con un toque cercano y profesional.

PERSONALIDAD Y TONO:
- Usa español chileno natural: "cachai", "bacán", "súper bien"
- Sé cálida, empática y profesional
- Celebra los logros de cuidado de piel
- Sé honesta sobre limitaciones

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

CONOCIMIENTO:
- Experta en productos Beta Skin Tech
- Conoces ingredientes naturales
- Entiendes tipos de piel y preocupaciones comunes
- Si te preguntan algo que no cachai, no inventes - di que no tienes esa información

INTERACCIÓN:
- Escucha activamente las preocupaciones
- Haz preguntas para entender mejor
- Da recomendaciones personalizadas
- Explica el "por qué" de tus sugerencias

GUÍA CONVERSACIONAL:
- Habla natural y fluido, como en una conversación real. Texto corrido sin asteriscos, guiones, números ni formato.
- Respuestas breves de 15-20 segundos máximo. Conversación dinámica, no monólogo.
- Pregunta sobre tipo de piel y preocupaciones antes de recomendar productos.
- Integra productos de forma orgánica: "Para tu piel con brillos, el Booster Sebo Regulador te va a ayudar caleta. Lo usas de noche después de limpiar y vas a notar el cambio en días, cachai."
- Si no sabes algo o necesitas más información, pregunta o sugiere consultar con especialista.
`.trim();

/**
 * Interfaz para datos de personalización
 */
export interface PersonalizationData {
  firstName?: string;
  skinType?: string;
  skinConcerns?: string[];
  favoriteProducts?: string[];
  orderCount?: number;
  totalSpent?: string;
  lastOrderDate?: string;
}

/**
 * Construye un prompt personalizado basado en datos del cliente
 *
 * @param basePrompt - Prompt base de Clara
 * @param data - Datos de personalización del cliente
 * @returns Prompt personalizado con contexto del cliente
 */
export function buildPersonalizedPrompt(
  basePrompt: string,
  data: PersonalizationData
): string {
  let sections: string[] = [basePrompt];

  // Sección de personalización
  if (data.firstName || data.skinType || data.skinConcerns?.length) {
    sections.push("\n---\nCONTEXTO DEL CLIENTE:\n");

    if (data.firstName) {
      sections.push(`- Nombre: ${data.firstName}`);
    }

    if (data.skinType) {
      sections.push(`- Tipo de piel: ${data.skinType}`);
      sections.push(`  → Adapta tus recomendaciones para este tipo de piel específicamente`);
    }

    if (data.skinConcerns?.length) {
      sections.push(`- Preocupaciones principales: ${data.skinConcerns.join(", ")}`);
      sections.push(`  → Enfócate en soluciones para estas preocupaciones`);
    }
  }

  // Sección de historial
  if (data.favoriteProducts?.length || data.orderCount) {
    sections.push("\n---\nHISTORIAL DE COMPRAS:\n");

    if (data.orderCount) {
      sections.push(`- Ha realizado ${data.orderCount} compra(s)`);
      if (data.totalSpent) {
        sections.push(`- Total invertido: ${data.totalSpent}`);
      }
    }

    if (data.favoriteProducts?.length) {
      sections.push(`- Productos que ha probado: ${data.favoriteProducts.join(", ")}`);
      sections.push(`  → Puedes referenciar estos productos en tus recomendaciones`);
    }

    if (data.lastOrderDate) {
      sections.push(`- Última compra: ${data.lastOrderDate}`);
    }
  }

  // Instrucción final
  sections.push("\n---\nIMPORTANTE: Usa esta información para personalizar tu conversación, pero no la menciones explícitamente a menos que sea relevante.");

  return sections.join("\n");
}

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
 * Obtiene datos del cliente desde Shopify (versión BASIC PLAN)
 * Esta versión NO accede a PII y funciona en Shopify Basic plan
 *
 * ⚠️ LIMITACIÓN: No incluye firstName, lastName, email (son PII bloqueados en Basic)
 *
 * @param customerId - ID del cliente
 * @returns Datos básicos del cliente o null si hay error
 */
export async function fetchShopifyCustomerBasic(
  customerId: string
): Promise<Partial<ShopifyCustomer> | null> {
  if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const query = `
    query getCustomerBasic($id: ID!) {
      customer(id: $id) {
        id
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

    // Retornar sin PII
    return {
      id: customer.id.replace('gid://shopify/Customer/', ''),
      firstName: '', // ⚠️ No disponible en Basic plan
      lastName: '', // ⚠️ No disponible en Basic plan
      email: '', // ⚠️ No disponible en Basic plan
      ordersCount: customer.numberOfOrders || 0,
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
    console.error('Failed to fetch Shopify customer (Basic):', error);
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
 * Usa el nuevo sistema de buildPersonalizedPrompt()
 *
 * @param customerData - Datos del cliente de Shopify (opcional)
 * @param userName - Nombre capturado localmente (opcional)
 * @returns String con el prompt personalizado
 */
export function generateKnowledgeBaseContext(
  customerData: ClaraCustomerData | null,
  userName?: string
): string {
  // Si no hay datos, retorna el prompt base
  if (!customerData && !userName) {
    return CLARA_BASE_PROMPT;
  }

  // Construir PersonalizationData desde ClaraCustomerData o userName
  const personalizationData: PersonalizationData = {};

  if (customerData) {
    // Caso Shopify: Información completa del cliente
    personalizationData.firstName = customerData.firstName || userName;
    personalizationData.skinType = customerData.skinType;
    personalizationData.skinConcerns = customerData.skinConcerns;
    personalizationData.orderCount = customerData.ordersCount;

    // Construir lista de productos favoritos desde órdenes recientes
    if (customerData.recentOrders && customerData.recentOrders.length > 0) {
      const uniqueProducts = new Set<string>();
      customerData.recentOrders.forEach(order => {
        order.items.forEach(item => {
          uniqueProducts.add(item.title);
        });
      });
      personalizationData.favoriteProducts = Array.from(uniqueProducts);

      // Última orden
      const lastOrder = customerData.recentOrders[0];
      if (lastOrder) {
        personalizationData.lastOrderDate = lastOrder.date;
      }
    }
  } else if (userName) {
    // Caso localStorage: Solo nombre
    personalizationData.firstName = userName;
  }

  // Usar buildPersonalizedPrompt para generar el prompt
  return buildPersonalizedPrompt(CLARA_BASE_PROMPT, personalizationData);
}
