#!/usr/bin/env node
/**
 * FASE 2 - Local Testing Script
 * Generates valid HMAC tokens and test URLs for Clara widget
 *
 * Usage: node scripts/test-fase2-url.mjs
 */

import crypto from 'crypto'

// HMAC secret from .env.local
const HMAC_SECRET = 'b6e2bc0ed8256bb0c1fdce4f3422d4253dca64fcc15c17964af345f62ef10981'

// Mock customer data (simulating Shopify Liquid data)
const mockCustomers = [
  {
    id: '7468765298871',
    firstName: 'María',
    lastName: 'García',
    email: 'maria.garcia@example.com',
    ordersCount: 3
  },
  {
    id: '7468765331639',
    firstName: 'Juan',
    lastName: 'Rodríguez',
    email: 'juan.rodriguez@example.com',
    ordersCount: 1
  },
  {
    id: '7468765364407',
    firstName: 'Ana',
    lastName: 'López',
    email: 'ana.lopez@example.com',
    ordersCount: 0
  }
]

/**
 * Generate HMAC-SHA256 token (matches Shopify Liquid: customer_id | hmac_sha256: hmac_secret)
 */
function generateHmacToken(customerId) {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(customerId)
    .digest('hex')
}

/**
 * Build widget URL with customer data
 */
function buildWidgetUrl(customer, baseUrl = 'http://localhost:3000') {
  const shopifyToken = generateHmacToken(customer.id)

  const params = new URLSearchParams({
    customer_id: customer.id,
    shopify_token: shopifyToken,
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    orders_count: customer.ordersCount.toString()
  })

  return `${baseUrl}?${params.toString()}`
}

// Generate test URLs for all mock customers
console.log('═══════════════════════════════════════════════════════════')
console.log('FASE 2 - Test URLs Generator')
console.log('═══════════════════════════════════════════════════════════\n')

mockCustomers.forEach((customer, index) => {
  console.log(`Test Customer ${index + 1}: ${customer.firstName} ${customer.lastName}`)
  console.log(`  Customer ID: ${customer.id}`)
  console.log(`  Email: ${customer.email}`)
  console.log(`  Orders: ${customer.ordersCount}`)

  const hmacToken = generateHmacToken(customer.id)
  console.log(`  HMAC Token: ${hmacToken}`)

  const url = buildWidgetUrl(customer)
  console.log(`  Test URL: ${url}`)
  console.log('')
})

console.log('═══════════════════════════════════════════════════════════')
console.log('Testing Instructions:')
console.log('═══════════════════════════════════════════════════════════')
console.log('1. Start dev server: npm run dev')
console.log('2. Copy one of the test URLs above')
console.log('3. Paste in browser to test Clara with customer data')
console.log('4. Check console logs for data merge confirmation')
console.log('5. Verify Clara uses customer name in greeting')
console.log('')
console.log('Expected console logs:')
console.log('  ✅ "Data sources: { hasLiquidData: true, ... }"')
console.log('  ✅ "Customer data merged successfully"')
console.log('  ✅ "firstName: [customer name]"')
console.log('')
