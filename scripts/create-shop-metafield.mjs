/**
 * Script para crear metafield de SHOP en Shopify usando GraphQL Admin API
 * Este script crea el metafield definition Y asigna el valor HMAC secret
 */

import 'dotenv/config';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const HMAC_SECRET = process.env.SHOPIFY_HMAC_SECRET;

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN || !HMAC_SECRET) {
  console.error('❌ Faltan variables de entorno:');
  console.error('SHOPIFY_STORE_DOMAIN:', SHOPIFY_STORE ? '✅' : '❌');
  console.error('SHOPIFY_ADMIN_ACCESS_TOKEN:', SHOPIFY_TOKEN ? '✅' : '❌');
  console.error('SHOPIFY_HMAC_SECRET:', HMAC_SECRET ? '✅' : '❌');
  process.exit(1);
}

const SHOPIFY_API_URL = `https://${SHOPIFY_STORE}/admin/api/2025-10/graphql.json`;

/**
 * PASO 1: Crear metafield definition para SHOP
 */
async function createShopMetafieldDefinition() {
  console.log('\n📝 PASO 1: Creando metafield definition para SHOP...');

  const mutation = `
    mutation CreateShopMetafieldDefinition {
      metafieldDefinitionCreate(
        definition: {
          name: "HMAC Secret"
          namespace: "custom"
          key: "hmac_secret"
          description: "HMAC secret for validating customer data tokens from Liquid templates"
          type: "single_line_text_field"
          ownerType: SHOP
        }
      ) {
        createdDefinition {
          id
          name
          namespace
          key
          ownerType
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query: mutation }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('❌ GraphQL errors:', result.errors);
    throw new Error('Failed to create metafield definition');
  }

  const { createdDefinition, userErrors } = result.data.metafieldDefinitionCreate;

  if (userErrors && userErrors.length > 0) {
    console.error('❌ User errors:', userErrors);

    // Check if definition already exists
    if (userErrors[0].code === 'TAKEN') {
      console.log('ℹ️  Metafield definition already exists, continuing...');
      return null; // Will query existing in next step
    }

    throw new Error('Failed to create metafield definition');
  }

  console.log('✅ Metafield definition created:');
  console.log('   ID:', createdDefinition.id);
  console.log('   Namespace:', createdDefinition.namespace);
  console.log('   Key:', createdDefinition.key);
  console.log('   Owner Type:', createdDefinition.ownerType);

  return createdDefinition.id;
}

/**
 * PASO 2: Obtener Shop ID
 */
async function getShopId() {
  console.log('\n🏪 PASO 2: Obteniendo Shop ID...');

  const query = `
    query {
      shop {
        id
        name
        myshopifyDomain
      }
    }
  `;

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
    console.error('❌ GraphQL errors:', result.errors);
    throw new Error('Failed to get shop ID');
  }

  const { shop } = result.data;
  console.log('✅ Shop encontrado:');
  console.log('   ID:', shop.id);
  console.log('   Name:', shop.name);
  console.log('   Domain:', shop.myshopifyDomain);

  return shop.id;
}

/**
 * PASO 3: Asignar valor al metafield
 */
async function setShopMetafieldValue(shopId) {
  console.log('\n💾 PASO 3: Asignando valor HMAC secret al metafield...');

  const mutation = `
    mutation SetShopMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
          createdAt
          updatedAt
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: shopId,
        namespace: "custom",
        key: "hmac_secret",
        type: "single_line_text_field",
        value: HMAC_SECRET,
      },
    ],
  };

  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('❌ GraphQL errors:', result.errors);
    throw new Error('Failed to set metafield value');
  }

  const { metafields, userErrors } = result.data.metafieldsSet;

  if (userErrors && userErrors.length > 0) {
    console.error('❌ User errors:', userErrors);
    throw new Error('Failed to set metafield value');
  }

  console.log('✅ Metafield value asignado:');
  console.log('   ID:', metafields[0].id);
  console.log('   Namespace:', metafields[0].namespace);
  console.log('   Key:', metafields[0].key);
  console.log('   Value length:', metafields[0].value.length, 'chars');
  console.log('   Created:', metafields[0].createdAt);
  console.log('   Updated:', metafields[0].updatedAt);

  return metafields[0];
}

/**
 * PASO 4: Verificar metafield desde Shop query
 */
async function verifyShopMetafield() {
  console.log('\n🔍 PASO 4: Verificando metafield...');

  const query = `
    query {
      shop {
        id
        name
        metafield(namespace: "custom", key: "hmac_secret") {
          id
          namespace
          key
          value
          type
        }
      }
    }
  `;

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
    console.error('❌ GraphQL errors:', result.errors);
    throw new Error('Failed to verify metafield');
  }

  const { shop } = result.data;

  if (!shop.metafield) {
    console.error('❌ Metafield NOT found via GraphQL query');
    return false;
  }

  console.log('✅ Metafield verified via GraphQL:');
  console.log('   ID:', shop.metafield.id);
  console.log('   Namespace:', shop.metafield.namespace);
  console.log('   Key:', shop.metafield.key);
  console.log('   Type:', shop.metafield.type);
  console.log('   Value length:', shop.metafield.value.length, 'chars');

  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Iniciando configuración de Shop metafield...');
  console.log('Store:', SHOPIFY_STORE);
  console.log('HMAC Secret length:', HMAC_SECRET.length, 'chars');

  try {
    // Step 1: Create definition
    await createShopMetafieldDefinition();

    // Step 2: Get shop ID
    const shopId = await getShopId();

    // Step 3: Set value
    await setShopMetafieldValue(shopId);

    // Step 4: Verify
    const verified = await verifyShopMetafield();

    if (verified) {
      console.log('\n✅ ¡TODO COMPLETO!');
      console.log('\n📝 Próximos pasos:');
      console.log('1. El metafield ahora DEBE ser accesible en Liquid como:');
      console.log('   {{ shop.metafields.custom.hmac_secret }}');
      console.log('2. Visita: https://289f72-45.myshopify.com/pages/clara-test');
      console.log('3. Verifica que Test 1 muestre Length: 66');
      console.log('4. Toma screenshot y comparte');
    } else {
      console.error('\n❌ Verificación fallida');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
