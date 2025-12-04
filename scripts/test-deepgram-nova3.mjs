/**
 * Test Deepgram Nova-3 Connection
 *
 * Verifies:
 * 1. API key is valid
 * 2. Nova-3 model is accessible
 * 3. Spanish language (es-419) works
 * 4. WebSocket connection establishes
 *
 * Usage: node scripts/test-deepgram-nova3.mjs
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔑 API Key found:', DEEPGRAM_API_KEY.substring(0, 8) + '...');

async function testConnection() {
  console.log('\n📡 Testing Deepgram Nova-3 Connection...\n');

  const client = createClient(DEEPGRAM_API_KEY);

  const options = {
    model: 'nova-3',
    language: 'es-419',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    endpointing: 500,
    interim_results: true,
    smart_format: true,
    vad_events: true,
    punctuate: true,
    filler_words: true,
  };

  console.log('⚙️  Options:', JSON.stringify(options, null, 2));

  try {
    const connection = client.listen.live(options);

    // Track connection state
    let connected = false;
    let eventsReceived = [];

    connection.on(LiveTranscriptionEvents.Open, () => {
      connected = true;
      eventsReceived.push('Open');
      console.log('\n✅ WebSocket OPEN - Connection successful!');
      console.log('   Model: nova-3');
      console.log('   Language: es-419 (Spanish Latin America)');

      // Close after successful connection test
      setTimeout(() => {
        console.log('\n🔌 Closing connection...');
        connection.finish();
      }, 2000);
    });

    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      eventsReceived.push('Metadata');
      console.log('\n📋 Metadata received:', JSON.stringify(data, null, 2));
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      eventsReceived.push('Transcript');
      console.log('\n📝 Transcript event received');
    });

    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      eventsReceived.push('SpeechStarted');
      console.log('\n🎤 SpeechStarted event received');
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      eventsReceived.push('UtteranceEnd');
      console.log('\n✅ UtteranceEnd event received');
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      eventsReceived.push('Error');
      console.error('\n❌ Error:', error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      eventsReceived.push('Close');
      console.log('\n🔌 WebSocket CLOSED');

      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('TEST SUMMARY');
      console.log('='.repeat(50));
      console.log('Connection established:', connected ? '✅ YES' : '❌ NO');
      console.log('Events received:', eventsReceived.join(', '));
      console.log('='.repeat(50));

      if (connected && eventsReceived.includes('Open')) {
        console.log('\n✅ TEST PASSED - Deepgram Nova-3 is working!\n');
        process.exit(0);
      } else {
        console.log('\n❌ TEST FAILED - Connection issues detected\n');
        process.exit(1);
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!connected) {
        console.error('\n❌ TIMEOUT - Connection not established after 10s');
        process.exit(1);
      }
    }, 10000);

  } catch (error) {
    console.error('\n❌ Failed to create connection:', error.message);
    process.exit(1);
  }
}

testConnection();
