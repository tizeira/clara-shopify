/**
 * Script simple para verificar que el token de Shopify funciona
 */

import 'dotenv/config';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE}/admin/api/2025-10/graphql.json`;

console.log('🔍 Testing Shopify token...');
console.log('Store:', SHOPIFY_STORE);
console.log('Token:', SHOPIFY_TOKEN.substring(0, 10) + '...');

const query = `
  query {
    shop {
      id
      name
      myshopifyDomain
    }
  }
`;

try {
  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('❌ GraphQL errors:', JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }

  if (!result.data || !result.data.shop) {
    console.error('❌ No shop data returned');
    console.error('Response:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('\n✅ Token funciona correctamente!');
  console.log('Shop ID:', result.data.shop.id);
  console.log('Shop Name:', result.data.shop.name);
  console.log('Domain:', result.data.shop.myshopifyDomain);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
