/**
 * Test script for Claude Haiku Streaming LLM Provider
 *
 * Tests:
 * 1. Streaming response (yields chunks in real-time)
 * 2. Conversation history management
 * 3. Interrupt functionality (AbortController)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ClaudeStreamingLLM } from './lib/realtime-conversation/providers/llm/claude-streaming';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testClaude() {
  console.log('🧪 Testing Claude Haiku Streaming LLM\n');

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in environment');
    console.error('Please add your Anthropic API key to .env.local');
    console.error('Get one at: https://console.anthropic.com/');
    process.exit(1);
  }

  // Initialize provider
  const llm = new ClaudeStreamingLLM({
    apiKey,
    systemPrompt: `Eres Clara, una asistente experta en skincare de la marca Clara.
Hablas español chileno de manera natural y amigable.
Ayudas a los clientes con recomendaciones de productos y rutinas de skincare.
Respondes de forma concisa (máximo 2-3 oraciones).`,
  });

  console.log('✅ Claude initialized\n');

  // Test 1: Streaming response
  console.log('📝 Test 1: Streaming response');
  console.log('Question: "Hola, ¿qué crema me recomiendas para piel seca?"');
  console.log('Response: ');

  process.stdout.write('> ');
  for await (const chunk of llm.streamResponse('Hola, ¿qué crema me recomiendas para piel seca?')) {
    process.stdout.write(chunk);
  }
  console.log('\n');

  // Test 2: Conversation history
  console.log('📝 Test 2: Conversation history');
  const history = llm.getHistory();
  console.log(`History length: ${history.length} messages`);
  console.log('Last user message:', history[history.length - 2]?.content.substring(0, 50) + '...');
  console.log('Last assistant message:', history[history.length - 1]?.content.substring(0, 50) + '...\n');

  // Test 3: Follow-up question (context maintained)
  console.log('📝 Test 3: Follow-up question (testing context)');
  console.log('Question: "¿Y para qué sirve esa crema?"');
  console.log('Response: ');

  process.stdout.write('> ');
  for await (const chunk of llm.streamResponse('¿Y para qué sirve esa crema?')) {
    process.stdout.write(chunk);
  }
  console.log('\n');

  // Test 4: Interrupt (barge-in simulation)
  console.log('📝 Test 4: Interrupt functionality (simulating barge-in)');
  console.log('Question: "Cuéntame todo sobre tu empresa y todos los productos..."');
  console.log('(Will interrupt after 500ms)\n');

  const generator = llm.streamResponse('Cuéntame todo sobre tu empresa, historia, todos los productos, ingredientes, y todo lo que haces');

  // Start streaming
  const streamPromise = (async () => {
    process.stdout.write('> ');
    try {
      for await (const chunk of generator) {
        process.stdout.write(chunk);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('\n❌ Unexpected error:', error);
      }
    }
  })();

  // Interrupt after 500ms
  setTimeout(() => {
    console.log('\n\n🛑 Interrupting after 500ms...');
    llm.interrupt();
  }, 500);

  await streamPromise;
  console.log('\n✅ Interrupt test complete\n');

  // Test 5: Clear history
  console.log('📝 Test 5: Clear history');
  console.log(`History before clear: ${llm.getHistory().length} messages`);
  llm.clearHistory();
  console.log(`History after clear: ${llm.getHistory().length} messages`);

  console.log('\n✅ All tests complete!');
}

testClaude().catch(console.error);
