const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = '2024-01'; // Versión actual de Shopify Admin API

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.warn('⚠️  Shopify credentials not configured. Shopify integration will not work.');
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
 * Este texto se pasa al campo knowledgeBase de HeyGen
 *
 * @param customerData - Datos formateados del cliente
 * @returns String con el contexto personalizado
 */
export function generateKnowledgeBaseContext(customerData: ClaraCustomerData): string {
  const ordersText = customerData.recentOrders.length > 0
    ? customerData.recentOrders.map((order, idx) =>
        `  ${idx + 1}. Orden ${order.name} (${order.date}):\n` +
        order.items.map(item => `     - ${item.title} (x${item.quantity})`).join('\n')
      ).join('\n')
    : '  (No tiene compras previas aún)';

  return `
Información del cliente actual:
- Nombre: ${customerData.firstName} ${customerData.lastName}
- Email: ${customerData.email}
- Total de compras: ${customerData.ordersCount}

Historial de compras recientes:
${ordersText}

INSTRUCCIONES PARA CLARA:
- Saluda al cliente por su nombre de forma natural y amigable
- Menciona sus compras previas cuando sea relevante para la conversación
- Haz recomendaciones personalizadas basadas en su historial
- Si pregunta por productos que ya compró, reconócelo y sugiere complementos
- Si no tiene compras previas, enfócate en entender sus necesidades
- Mantén un tono personalizado, profesional y cercano
- Demuestra que conoces su historial sin ser invasiva
`.trim();
}
