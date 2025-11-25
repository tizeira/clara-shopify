/**
 * ⚠️ LEGACY TEST SCRIPT - Uses deprecated Nova-2 implementation
 *
 * Test script for Deepgram Streaming STT (Nova-2)
 * For new implementations, use DeepgramFluxSTT instead.
 *
 * Usage:
 * 1. Make sure NEXT_PUBLIC_DEEPGRAM_API_KEY is set in .env.local
 * 2. Run: npx tsx test-deepgram.ts
 * 3. Speak into your microphone
 * 4. Press Ctrl+C to stop
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { DeepgramStreamingSTT } from './lib/realtime-conversation/providers/stt/deepgram-streaming.legacy';

async function testDeepgramSTT() {
  console.log('🧪 Starting Deepgram STT Test\n');

  // Get API key from environment
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: NEXT_PUBLIC_DEEPGRAM_API_KEY not found in environment');
    console.error('Please add it to your .env.local file');
    process.exit(1);
  }

  console.log('✅ API key found');

  // Create STT provider
  const stt = new DeepgramStreamingSTT({
    apiKey,
    // Optional: override default config
    // endpointing: 300,
    // eotThreshold: 0.7,
    // eotTimeoutMs: 5000,
    // keyterms: ['Clara', 'skincare', 'crema'],
  });

  // Setup callbacks
  stt.onInterim((text) => {
    // Show interim transcripts in gray
    console.log('\x1b[90m⏳ Interim:\x1b[0m', text);
  });

  stt.onTranscript((text) => {
    // Show final transcripts in green
    console.log('\x1b[32m✅ Final:\x1b[0m', text);
  });

  stt.onSpeechStart(() => {
    console.log('\x1b[36m🎤 User started speaking\x1b[0m');
  });

  stt.onSpeechEnd(() => {
    console.log('\x1b[36m🎤 User stopped speaking\x1b[0m');
  });

  stt.onError((error) => {
    console.error('\x1b[31m❌ Error:\x1b[0m', error.message);
  });

  try {
    // Start listening
    console.log('\n🎙️  Starting to listen...');
    await stt.startListening();

    console.log('\n✅ Listening started successfully!');
    console.log('📢 Speak now in Spanish...');
    console.log('   Try: "Hola, ¿qué crema me recomiendas para piel seca?"');
    console.log('   Press Ctrl+C to stop\n');

    // Keep running until user stops
    await new Promise(() => {});

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Stopping test...');
  process.exit(0);
});

// Run test
testDeepgramSTT().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
