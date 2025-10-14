import crypto from 'crypto';

const SHOPIFY_SECRET = process.env.SHOPIFY_HMAC_SECRET;

if (!SHOPIFY_SECRET) {
  console.warn('⚠️  SHOPIFY_HMAC_SECRET not configured. Shopify integration will not work.');
}

/**
 * Genera token HMAC para customer ID
 * Este mismo algoritmo se usa en Liquid template
 *
 * @param customerId - ID del cliente de Shopify
 * @returns Token HMAC hex
 */
export function generateCustomerToken(customerId: string): string {
  if (!SHOPIFY_SECRET) {
    throw new Error('SHOPIFY_HMAC_SECRET is not configured');
  }

  return crypto
    .createHmac('sha256', SHOPIFY_SECRET)
    .update(customerId)
    .digest('hex');
}

/**
 * Verifica que el token HMAC es válido
 * Protege contra timing attacks con timingSafeEqual
 *
 * @param token - Token HMAC recibido
 * @param customerId - ID del cliente a verificar
 * @returns true si el token es válido
 */
export function verifyCustomerToken(
  token: string,
  customerId: string
): boolean {
  if (!SHOPIFY_SECRET) {
    throw new Error('SHOPIFY_HMAC_SECRET is not configured');
  }

  try {
    const expectedToken = generateCustomerToken(customerId);

    // Timing-safe comparison para prevenir timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
  } catch (error) {
    // Si los buffers tienen diferente longitud, timingSafeEqual lanza error
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Valida formato de customer ID de Shopify
 * Los IDs de Shopify son números largos (más de 5 dígitos)
 *
 * @param customerId - Customer ID a validar
 * @returns true si el formato es válido
 */
export function isValidCustomerId(customerId: string): boolean {
  // Shopify customer IDs son números largos
  return /^\d+$/.test(customerId) && customerId.length > 5;
}
