import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken, isValidCustomerId } from '@/lib/shopify-security';
import { fetchShopifyCustomer, formatCustomerForClara } from '@/lib/shopify-client';

export const runtime = 'nodejs'; // Necesario para crypto y Node APIs

/**
 * Interface para el body del request
 */
interface RequestBody {
  shopify_token: string;
  customer_id: string;
}

/**
 * POST /api/shopify-customer
 *
 * Valida el token HMAC y retorna los datos del cliente desde Shopify
 *
 * @param request - NextRequest con { shopify_token, customer_id }
 * @returns Customer data formateado para Clara
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear request body
    const body: RequestBody = await request.json();
    const { shopify_token, customer_id } = body;

    // Validación básica de inputs
    if (!shopify_token || !customer_id) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['shopify_token', 'customer_id']
        },
        { status: 400 }
      );
    }

    // Validar formato de customer ID
    if (!isValidCustomerId(customer_id)) {
      return NextResponse.json(
        {
          error: 'Invalid customer_id format',
          details: 'Customer ID must be a numeric string with more than 5 digits'
        },
        { status: 400 }
      );
    }

    // Verificar token HMAC
    let isValidToken: boolean;
    try {
      isValidToken = verifyCustomerToken(shopify_token, customer_id);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Token verification error. Check SHOPIFY_HMAC_SECRET configuration.' },
        { status: 500 }
      );
    }

    if (!isValidToken) {
      console.warn(`⚠️  Invalid token attempt for customer ${customer_id}`);
      return NextResponse.json(
        {
          error: 'Invalid authentication token',
          details: 'The provided token does not match the customer ID'
        },
        { status: 401 }
      );
    }

    // Obtener datos del cliente desde Shopify
    let customer;
    try {
      customer = await fetchShopifyCustomer(customer_id);
    } catch (error) {
      console.error('Shopify API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to connect to Shopify',
          details: process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Check Shopify credentials configuration'
        },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error: 'Customer not found',
          details: `Customer with ID ${customer_id} does not exist in Shopify`
        },
        { status: 404 }
      );
    }

    // Formatear para Clara
    const claraCustomer = formatCustomerForClara(customer);

    // Log exitoso (sin datos sensibles)
    console.log(`✅ Customer data fetched successfully: ${customer.firstName} ${customer.lastName} (ID: ${customer_id})`);

    return NextResponse.json({
      success: true,
      customer: claraCustomer
    });

  } catch (error) {
    console.error('Shopify customer API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify-customer
 *
 * Health check endpoint para verificar que el servicio está funcionando
 *
 * @returns Status del servicio
 */
export async function GET() {
  const isConfigured =
    !!process.env.SHOPIFY_HMAC_SECRET &&
    !!process.env.SHOPIFY_STORE_DOMAIN &&
    !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  return NextResponse.json({
    status: 'ok',
    service: 'shopify-customer-api',
    configured: isConfigured,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
