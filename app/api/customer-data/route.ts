/**
 * API Route: Get customer data from Shopify
 *
 * GET /api/customer-data?customerId=123456
 *
 * Returns customer information including metafields (skin_type, skin_concerns)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchShopifyCustomer, formatCustomerForClara } from '@/lib/shopify-client';

export async function GET(request: NextRequest) {
  try {
    // Get customer ID from query params
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId parameter is required' },
        { status: 400 }
      );
    }

    // Check Shopify credentials
    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      console.warn('⚠️ Shopify credentials not configured');
      return NextResponse.json(
        {
          error: 'Shopify integration not configured',
          customer: null
        },
        { status: 503 }
      );
    }

    // Fetch customer from Shopify
    console.log(`📥 Fetching Shopify customer: ${customerId}`);
    const shopifyCustomer = await fetchShopifyCustomer(customerId);

    if (!shopifyCustomer) {
      console.warn(`❌ Customer not found: ${customerId}`);
      return NextResponse.json(
        { error: 'Customer not found', customer: null },
        { status: 404 }
      );
    }

    // Format for Clara
    const formattedCustomer = formatCustomerForClara(shopifyCustomer);

    console.log(`✅ Customer data retrieved: ${formattedCustomer.firstName} ${formattedCustomer.lastName}`);
    if (formattedCustomer.skinType) {
      console.log(`   Skin Type: ${formattedCustomer.skinType}`);
    }
    if (formattedCustomer.skinConcerns) {
      console.log(`   Concerns: ${formattedCustomer.skinConcerns.join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      customer: formattedCustomer,
    });

  } catch (error) {
    console.error('❌ Error in customer-data API:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch customer data',
        message: error instanceof Error ? error.message : 'Unknown error',
        customer: null,
      },
      { status: 500 }
    );
  }
}
