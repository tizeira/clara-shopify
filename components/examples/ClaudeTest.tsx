'use client';

import { useState, useRef } from 'react';
import { ClaudeStreamingLLM } from '@/lib/realtime-conversation/providers/llm/claude-streaming';

/**
 * Test component for Claude Haiku Streaming LLM
 *
 * Tests:
 * - Streaming response display
 * - Conversation history
 * - Interrupt functionality
 */

export default function ClaudeTest() {
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');

  const llmRef = useRef<ClaudeStreamingLLM | null>(null);

  const addDebugLog = (message: string) => {
    setDebugLogs((prev) => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const initializeLLM = () => {
    if (llmRef.current) return llmRef.current;

    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      addDebugLog('❌ ERROR: ANTHROPIC_API_KEY not configured');
      alert('Please add ANTHROPIC_API_KEY to your .env.local file');
      return null;
    }

    llmRef.current = new ClaudeStreamingLLM({
      apiKey,
      systemPrompt: `Eres Clara, una asistente experta en skincare de la marca Clara.
Hablas español chileno de manera natural y amigable.
Ayudas a los clientes con recomendaciones de productos y rutinas de skincare.
Respondes de forma concisa (máximo 2-3 oraciones).`,
    });

    addDebugLog('✅ Claude LLM initialized');
    return llmRef.current;
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const llm = initializeLLM();
    if (!llm) return;

    const message = userInput;
    setUserInput('');
    setIsGenerating(true);
    setCurrentResponse('');

    addDebugLog(`📤 User: ${message.substring(0, 50)}...`);

    try {
      let fullResponse = '';

      for await (const chunk of llm.streamResponse(message)) {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      addDebugLog(`✅ Response complete: ${fullResponse.length} chars`);

      // Update history
      const history = llm.getHistory();
      setConversationHistory(history);

    } catch (error: any) {
      addDebugLog(`❌ Error: ${error.message}`);
      console.error('Error generating response:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const interruptGeneration = () => {
    if (llmRef.current && isGenerating) {
      llmRef.current.interrupt();
      addDebugLog('🛑 Generation interrupted');
      setIsGenerating(false);
    }
  };

  const clearHistory = () => {
    if (llmRef.current) {
      llmRef.current.clearHistory();
      setConversationHistory([]);
      setCurrentResponse('');
      addDebugLog('🗑️ History cleared');
    }
  };

  const testInterrupt = async () => {
    const llm = initializeLLM();
    if (!llm) return;

    setIsGenerating(true);
    setCurrentResponse('');

    const longQuestion = 'Cuéntame todo sobre tu empresa, historia, todos los productos, ingredientes, y todo lo que haces';
    addDebugLog(`📤 Testing interrupt with long question...`);

    try {
      let fullResponse = '';

      // Schedule interrupt after 1 second
      setTimeout(() => {
        addDebugLog('🛑 Interrupting after 1 second...');
        llm.interrupt();
      }, 1000);

      for await (const chunk of llm.streamResponse(longQuestion)) {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      addDebugLog(`✅ Interrupt test complete`);

    } catch (error: any) {
      addDebugLog(`❌ Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          🤖 Claude Haiku Streaming Test
        </h1>
        <p className="text-sm text-gray-600">
          Test Claude 3.5 Haiku streaming responses with interrupt support
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-gray-700">
            {isGenerating ? 'Generating...' : 'Ready'}
          </span>
        </div>
        <div className="text-gray-500">
          History: {conversationHistory.length} messages
        </div>
      </div>

      {/* Current Response */}
      {currentResponse && (
        <div className="glass-card p-4 bg-blue-50 border-blue-200">
          <div className="text-xs font-semibold text-blue-600 mb-2">
            🤖 Clara's Response:
          </div>
          <div className="text-gray-800 whitespace-pre-wrap">
            {currentResponse}
            {isGenerating && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && sendMessage()}
            placeholder="Escribe tu mensaje aquí..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            disabled={isGenerating}
          />
          <button
            onClick={sendMessage}
            disabled={isGenerating || !userInput.trim()}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generando...' : 'Enviar'}
          </button>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2">
          <button
            onClick={interruptGeneration}
            disabled={!isGenerating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            🛑 Interrupt
          </button>
          <button
            onClick={testInterrupt}
            disabled={isGenerating}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ⚡ Test Auto-Interrupt
          </button>
          <button
            onClick={clearHistory}
            disabled={isGenerating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            🗑️ Clear History
          </button>
        </div>
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <details className="glass-card p-4 bg-gray-50">
          <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
            💬 Conversation History ({conversationHistory.length} messages)
          </summary>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {conversationHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-green-100 border-green-300'
                } border`}
              >
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Debug Logs */}
      <details open>
        <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900 mb-2">
          🐛 Debug Logs
        </summary>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            debugLogs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </details>

      {/* Quick test suggestions */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="font-semibold">Sugerencias de prueba:</div>
        <div>• "Hola, ¿qué crema me recomiendas para piel seca?"</div>
        <div>• "¿Y para qué sirve esa crema?" (test context)</div>
        <div>• Click "Test Auto-Interrupt" para probar interrupciones</div>
      </div>
    </div>
  );
}
