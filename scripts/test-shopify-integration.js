/**
 * Script de Testing para Fase 1 - Integración Shopify
 *
 * Este script verifica que toda la configuración de Fase 1 está correcta.
 *
 * Uso:
 *   node scripts/test-shopify-integration.js
 */

const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Cargar variables de .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo .env.local no encontrado');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('='); // Por si hay = en el valor

    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Cargar variables al inicio
loadEnvLocal();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(emoji, message, color = '\x1b[0m') {
  console.log(`${color}${emoji} ${message}\x1b[0m`);
}

function success(message) {
  log('✅', message, '\x1b[32m');
}

function error(message) {
  log('❌', message, '\x1b[31m');
}

function info(message) {
  log('ℹ️ ', message, '\x1b[36m');
}

function warning(message) {
  log('⚠️ ', message, '\x1b[33m');
}

async function checkEnvironmentVariables() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Verificando Variables de Entorno');
  console.log('='.repeat(60) + '\n');

  const requiredVars = [
    'SHOPIFY_HMAC_SECRET',
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_ADMIN_ACCESS_TOKEN'
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`${varName} está configurada`);

      // Validaciones específicas
      if (varName === 'SHOPIFY_HMAC_SECRET') {
        if (process.env[varName].length < 32) {
          warning(`${varName} es muy corta (debe tener al menos 32 caracteres)`);
        }
      }

      if (varName === 'SHOPIFY_STORE_DOMAIN') {
        const domain = process.env[varName];
        if (domain.includes('https://') || domain.includes('http://')) {
          error(`${varName} NO debe incluir https:// o http://`);
          info(`Valor actual: ${domain}`);
          info(`Valor correcto: ${domain.replace(/https?:\/\//, '')}`);
          allPresent = false;
        } else if (domain.includes('/admin')) {
          error(`${varName} NO debe incluir /admin`);
          info(`Valor actual: ${domain}`);
          info(`Valor correcto: ${domain.replace('/admin', '')}`);
          allPresent = false;
        }
      }

      if (varName === 'SHOPIFY_ADMIN_ACCESS_TOKEN') {
        if (!process.env[varName].startsWith('shpat_')) {
          warning(`${varName} debería empezar con 'shpat_'`);
        }
      }
    } else {
      error(`${varName} NO está configurada`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Health Check del API');
  console.log('='.repeat(60) + '\n');

  info('Verificando http://localhost:3000/api/shopify-customer ...');

  try {
    const response = await fetch('http://localhost:3000/api/shopify-customer');

    if (!response.ok) {
      error(`API retornó status ${response.status}`);
      return false;
    }

    const data = await response.json();

    console.log('\nRespuesta del API:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.status === 'ok') {
      success('API está funcionando');
    } else {
      error('API retornó status diferente a "ok"');
      return false;
    }

    if (data.configured === true) {
      success('Todas las variables están configuradas correctamente');
      return true;
    } else {
      error('Las variables NO están configuradas correctamente');
      warning('Verifica que el servidor se reinició después de agregar las variables');
      return false;
    }

  } catch (err) {
    error('No se pudo conectar al servidor');
    info('¿Está el servidor corriendo? (npm run dev)');
    console.error(err.message);
    return false;
  }
}

function generateToken(customerId) {
  const secret = process.env.SHOPIFY_HMAC_SECRET;

  if (!secret) {
    throw new Error('SHOPIFY_HMAC_SECRET no está configurada');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(customerId)
    .digest('hex');
}

async function testFullFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Flujo Completo con Customer Real');
  console.log('='.repeat(60) + '\n');

  info('Para este test necesitas un Customer ID real de tu tienda Shopify.');
  console.log('');
  console.log('Cómo obtenerlo:');
  console.log('1. Ve a Shopify Admin → Customers');
  console.log('2. Abre cualquier cliente');
  console.log('3. La URL se verá así:');
  console.log('   https://admin.shopify.com/store/TU-TIENDA/customers/1234567890');
  console.log('4. El número al final (1234567890) es el Customer ID');
  console.log('');

  const customerId = await question('Ingresa un Customer ID de prueba (o presiona Enter para omitir): ');

  if (!customerId || customerId.trim() === '') {
    warning('Test omitido. Puedes probarlo después con un Customer ID real.');
    return true;
  }

  // Validar que es un número
  if (!/^\d+$/.test(customerId)) {
    error('El Customer ID debe ser un número');
    return false;
  }

  info(`Generando token HMAC para customer ${customerId}...`);

  let token;
  try {
    token = generateToken(customerId);
    success(`Token generado: ${token}`);
  } catch (err) {
    error('Error generando token: ' + err.message);
    return false;
  }

  console.log('');
  info('Enviando request al API...');

  try {
    const response = await fetch('http://localhost:3000/api/shopify-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopify_token: token,
        customer_id: customerId
      })
    });

    const data = await response.json();

    console.log('\nRespuesta del API:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.success) {
      success('¡Customer data obtenida exitosamente!');
      console.log('');
      success(`Cliente: ${data.customer.firstName} ${data.customer.lastName}`);
      success(`Email: ${data.customer.email}`);
      success(`Número de órdenes: ${data.customer.ordersCount}`);

      if (data.customer.recentOrders && data.customer.recentOrders.length > 0) {
        success(`Órdenes recientes: ${data.customer.recentOrders.length}`);
        console.log('');
        info('Primera orden:');
        const firstOrder = data.customer.recentOrders[0];
        console.log(`  - ${firstOrder.name} (${firstOrder.date})`);
        firstOrder.items.forEach(item => {
          console.log(`    · ${item.title} x${item.quantity}`);
        });
      }

      return true;
    } else {
      error('Error al obtener customer data');

      if (response.status === 401) {
        error('Token inválido - El HMAC secret podría ser incorrecto');
      } else if (response.status === 404) {
        error('Customer no encontrado en Shopify');
        info('Verifica que el Customer ID existe en tu tienda');
      } else if (response.status === 500) {
        error('Error del servidor');
        info('Verifica las credenciales de Shopify en .env.local');
      }

      return false;
    }

  } catch (err) {
    error('Error haciendo request: ' + err.message);
    return false;
  }
}

async function generateTestUrl() {
  console.log('\n' + '='.repeat(60));
  console.log('BONUS: Generar URL de Prueba para Clara');
  console.log('='.repeat(60) + '\n');

  const customerId = await question('Ingresa un Customer ID para generar URL (o Enter para omitir): ');

  if (!customerId || customerId.trim() === '') {
    info('URL de prueba omitida.');
    return;
  }

  try {
    const token = generateToken(customerId);
    const url = `http://localhost:3001?shopify_token=${token}&customer_id=${customerId}`;

    console.log('');
    success('URL generada:');
    console.log('');
    console.log('\x1b[36m' + url + '\x1b[0m');
    console.log('');
    info('Copia esta URL y ábrela en tu navegador cuando Fase 2 esté lista');
    info('Clara debería cargar con los datos de este cliente');

  } catch (err) {
    error('Error generando URL: ' + err.message);
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TEST DE INTEGRACIÓN SHOPIFY - FASE 1                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const checks = {
    env: false,
    health: false,
    fullFlow: false
  };

  // Test 1: Environment Variables
  checks.env = await checkEnvironmentVariables();

  if (!checks.env) {
    console.log('\n');
    error('FALLO: Configura las variables en .env.local antes de continuar');
    info('Lee docs/FASE_1_CONFIGURACION_PASO_A_PASO.md para más detalles');
    rl.close();
    process.exit(1);
  }

  // Test 2: Health Check
  checks.health = await testHealthCheck();

  if (!checks.health) {
    console.log('\n');
    error('FALLO: El API no está funcionando correctamente');
    info('Asegúrate de que el servidor está corriendo: npm run dev');
    rl.close();
    process.exit(1);
  }

  // Test 3: Full Flow (opcional)
  checks.fullFlow = await testFullFlow();

  // Bonus: Generate test URL
  await generateTestUrl();

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DE TESTS');
  console.log('='.repeat(60) + '\n');

  success(`Variables de entorno: ${checks.env ? 'OK' : 'FALLO'}`);
  success(`Health check API: ${checks.health ? 'OK' : 'FALLO'}`);
  if (checks.fullFlow) {
    success('Flujo completo: OK');
  } else {
    info('Flujo completo: No probado (opcional)');
  }

  console.log('\n');
  if (checks.env && checks.health) {
    success('═══════════════════════════════════════════════════════════');
    success('  ✅ FASE 1 COMPLETAMENTE FUNCIONAL');
    success('  🚀 LISTO PARA AVANZAR A FASE 2');
    success('═══════════════════════════════════════════════════════════');
  } else {
    error('═══════════════════════════════════════════════════════════');
    error('  ❌ HAY PROBLEMAS QUE RESOLVER');
    error('  📖 Consulta docs/FASE_1_CONFIGURACION_PASO_A_PASO.md');
    error('═══════════════════════════════════════════════════════════');
  }

  console.log('\n');
  rl.close();
}

// Ejecutar
main().catch(err => {
  console.error('\n❌ Error fatal:', err);
  rl.close();
  process.exit(1);
});
