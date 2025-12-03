/**
 * @deprecated This file is deprecated. Use buildPersonalizedPrompt from lib/shopify-client.ts instead.
 * This file will be removed in a future version.
 *
 * Migration path:
 * - CLARA_BASE_PROMPT → Use from lib/shopify-client.ts
 * - buildPersonalizedPrompt → Use from lib/shopify-client.ts (different signature)
 * - PersonalizationData → Use from lib/shopify-client.ts
 *
 * This file contains the Chilean Spanish prompt that has been migrated to shopify-client.ts
 */

/**
 * Clara's Personalized Prompt Template System
 * @deprecated Use lib/shopify-client.ts instead
 */

import type { ShopifyCustomerData, PromptVariables, ClaraPromptConfig } from './types';

/**
 * Clara's base personality and rules (Chilean Spanish, dermatologist)
 */
const CLARA_BASE_PROMPT = `Eres Clara, asesora de skincare de Beta Skin Tech, dermatóloga virtual de 28 años, chilena.

PERSONALIDAD:
- Cálida, profesional, y cercana
- Usas español chileno coloquial cuando es apropiado
- Experta en cuidado de la piel y productos Beta Skin Tech

REGLAS CRÍTICAS DE CONVERSACIÓN:
- Responde en MÁXIMO 2-3 oraciones cortas (15-20 segundos al hablar)
- Conversación natural, NO monólogos
- Pregunta UNA cosa a la vez para mantener diálogo fluido
- No uses markdown, solo texto plano para hablar

ESTILO CONVERSACIONAL (Español Chileno):
- "Bacán, ¿cachai? El Booster Sebo Regulador te va a ayudar caleta."
- "Dale, vamos a armar una rutina perfecta para ti."
- Usa: "cachai", "po", "bacán", "caleta", "dale", "onda"

FLOW DE CONVERSACIÓN (3-4 minutos total):
1. Saludo personalizado (10-15 seg)
2. Preguntas sobre tipo de piel y preocupaciones (30-45 seg)
3. Recomendación de productos específicos (45-60 seg)
4. Call-to-action al carrito (15-20 seg)

PRODUCTOS BETA SKIN TECH:
- Booster Sebo Regulador (niacinamida, piel grasa/mixta)
- Serum Antioxidante (vitamina C, manchas)
- Crema Hidratante (ácido hialurónico, todo tipo)
- Limpiador Suave (uso diario)
- Protector Solar SPF 50 (uso diario obligatorio)`;

/**
 * Build personalized prompt from customer data
 */
export function buildPersonalizedPrompt(
  customerData: ShopifyCustomerData | null,
  config?: Partial<ClaraPromptConfig>
): string {
  let prompt = CLARA_BASE_PROMPT;

  // If no customer data, return generic prompt
  if (!customerData) {
    prompt += `\n\n---INSTRUCCIONES---\n`;
    prompt += `Usuario nuevo sin historial. Pregunta su nombre y tipo de piel.\n`;
    return prompt;
  }

  // Extract variables from customer data
  const variables = extractVariables(customerData);

  // Add personalization section
  prompt += `\n\n---INFORMACIÓN DEL CLIENTE ACTUAL---\n`;
  prompt += `Nombre: ${variables.firstName}${variables.lastName ? ` ${variables.lastName}` : ''}\n`;

  // Skin type
  if (variables.skinType) {
    prompt += `Tipo de Piel: ${variables.skinType}\n`;
    prompt += `INSTRUCCIÓN: Considera su tipo de piel ${variables.skinType} en TODAS las recomendaciones.\n`;
  } else {
    prompt += `Tipo de Piel: Desconocido (pregunta en la conversación)\n`;
  }

  // Skin concerns
  if (variables.skinConcerns) {
    prompt += `Preocupaciones: ${variables.skinConcerns}\n`;
    prompt += `INSTRUCCIÓN: Enfócate en productos que aborden estas preocupaciones.\n`;
  }

  // Purchase history
  if (variables.hasHistory && variables.recentProducts) {
    prompt += `\nHistorial de Compras:\n${variables.recentProducts}\n`;
    prompt += `INSTRUCCIÓN: Menciona cómo le ha ido con productos previos y sugiere complementos.\n`;
  }

  // Greeting instructions
  prompt += `\n---SALUDO INICIAL---\n`;
  if (variables.hasHistory) {
    prompt += `"Hola de nuevo ${variables.firstName}! Bacán verte, ¿cachai?" (menciona que es cliente recurrente)\n`;
  } else {
    prompt += `"Hola ${variables.firstName}! Bacán conocerte, soy Clara." (primera vez)\n`;
  }

  return prompt;
}

/**
 * Extract template variables from customer data
 */
function extractVariables(data: ShopifyCustomerData): PromptVariables {
  const variables: PromptVariables = {
    firstName: data.firstName || 'Cliente',
    lastName: data.lastName,
    hasHistory: data.numberOfOrders > 0,
  };

  // Skin type
  if (data.skinType) {
    variables.skinType = data.skinType;
  }

  // Skin concerns
  if (data.skinConcerns && data.skinConcerns.length > 0) {
    variables.skinConcerns = data.skinConcerns.join(', ');
  }

  // Recent products
  if (data.recentProducts && data.recentProducts.length > 0) {
    const productList = data.recentProducts
      .map((p, idx) => `${idx + 1}. ${p.title} (${new Date(p.purchasedAt).toLocaleDateString('es-CL')})`)
      .join('\n');
    variables.recentProducts = productList;
  }

  return variables;
}

/**
 * Get generic (non-personalized) prompt
 */
export function getGenericPrompt(): string {
  return buildPersonalizedPrompt(null);
}

/**
 * Validate customer data completeness
 */
export function validateCustomerData(data: ShopifyCustomerData | null): {
  isValid: boolean;
  missingFields: string[];
  hasPersonalization: boolean;
} {
  if (!data) {
    return {
      isValid: false,
      missingFields: ['all'],
      hasPersonalization: false,
    };
  }

  const missingFields: string[] = [];

  if (!data.firstName) missingFields.push('firstName');
  if (!data.skinType) missingFields.push('skinType');

  return {
    isValid: missingFields.length === 0,
    missingFields,
    hasPersonalization: !!data.skinType || (data.recentProducts?.length ?? 0) > 0,
  };
}

/**
 * Preview what the personalized greeting will look like
 */
export function previewGreeting(data: ShopifyCustomerData | null): string {
  if (!data) {
    return 'Hola! Bacán conocerte, soy Clara. ¿Cómo te llamas?';
  }

  const hasHistory = data.numberOfOrders > 0;

  if (hasHistory) {
    return `Hola de nuevo ${data.firstName}! Bacán verte, ¿cachai? ¿Cómo te ha ido con los productos que te recomendé?`;
  } else {
    return `Hola ${data.firstName}! Bacán conocerte, soy Clara. Soy dermatóloga virtual y estoy acá para ayudarte a encontrar los productos perfectos para tu piel.`;
  }
}
