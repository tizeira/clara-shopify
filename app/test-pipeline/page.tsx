'use client';

/**
 * Test page for Complete Conversation Pipeline
 *
 * Tests the full modular pipeline:
 * - Deepgram Flux STT (turn detection)
 * - Claude Haiku LLM (streaming responses)
 * - HeyGen Avatar (REPEAT mode TTS)
 * - ConversationManager orchestration
 * - Barge-in functionality
 * - End-to-end latency metrics
 */

import { useState, useEffect, useRef } from 'react';
import { DeepgramFluxSTT } from '@/lib/realtime-conversation/providers/stt/deepgram-flux';
import { ClaudeStreamingLLM } from '@/lib/realtime-conversation/providers/llm/claude-streaming';
import { HeyGenAvatarProvider } from '@/lib/realtime-conversation/providers/avatar/heygen-wrapper';
import { ConversationManager, ConversationState } from '@/lib/realtime-conversation/conversation-manager';
import { PROVIDER_CONFIG, AUDIO_CONFIG } from '@/config/features';

export default function PipelineTest() {
  const [isActive, setIsActive] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>(ConversationState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; isFinal: boolean }>>([]);
  const [llmResponse, setLlmResponse] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const managerRef = useRef<ConversationManager | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
      }
    };
  }, []);

  const handleStart = async () => {
    try {
      setError(null);
      addLog('🚀 Starting conversation pipeline...');

      // Get API keys
      const deepgramKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      const heygenKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;

      if (!deepgramKey || !anthropicKey || !heygenKey) {
        throw new Error('Missing API keys. Check .env.local for DEEPGRAM_API_KEY, ANTHROPIC_API_KEY, HEYGEN_API_KEY');
      }

      addLog('✅ API keys loaded');

      // Create providers
      addLog('🔧 Creating providers...');

      const sttProvider = new DeepgramFluxSTT({
        apiKey: deepgramKey,
        model: PROVIDER_CONFIG.deepgram.model,
        language: PROVIDER_CONFIG.deepgram.language,
        encoding: AUDIO_CONFIG.encoding,
        sampleRate: AUDIO_CONFIG.sampleRate,
        eotThreshold: PROVIDER_CONFIG.deepgram.eotThreshold,
        eotTimeoutMs: PROVIDER_CONFIG.deepgram.eotTimeoutMs,
        eagerEotThreshold: PROVIDER_CONFIG.deepgram.eagerEotThreshold,
        logEvents: true,
      });

      const llmProvider = new ClaudeStreamingLLM({
        apiKey: anthropicKey,
        model: PROVIDER_CONFIG.claude.model,
        max_tokens: PROVIDER_CONFIG.claude.max_tokens,
        temperature: PROVIDER_CONFIG.claude.temperature,
        systemPrompt: `Sos Clara, asesora personal de skincare en Beta.
Hablás en español chileno, con tono cercano y profesional.
Respondé de forma concisa (2-3 oraciones máximo) porque esto es una conversación por voz.
Ayudás a elegir productos según tipo de piel y objetivos.`,
      });

      const avatarProvider = new HeyGenAvatarProvider({
        apiKey: heygenKey,
        avatarId: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || 'Katya_CasualLook_public',
        voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID || '0e69c649917e4a6da0f9a9e1fe02f498',
        language: 'es',
        logEvents: true,
      });

      addLog('✅ Providers created');

      // Initialize avatar first (needs session before pipeline starts)
      addLog('🎥 Initializing avatar...');
      await avatarProvider.initialize();

      // Get video stream
      const stream = avatarProvider.getStream();
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        addLog('✅ Video stream connected');
      }

      // Create conversation manager
      addLog('🔧 Creating conversation manager...');

      managerRef.current = new ConversationManager({
        sttProvider,
        llmProvider,
        avatarProvider,
        enableBargeIn: true,
        enableInterimTranscripts: true,
        enableStreaming: true,
        logLatency: true,
        logTranscripts: true,

        // Callbacks
        onStateChange: (from, to) => {
          setConversationState(to);
          addLog(`📊 State: ${from} → ${to}`);
        },

        onTranscript: (text, isFinal) => {
          setTranscripts((prev) => [
            ...prev.slice(-10),
            { text, isFinal },
          ]);

          if (isFinal) {
            addLog(`✅ Final: "${text}"`);
          }
        },

        onLLMChunk: (chunk) => {
          setLlmResponse((prev) => prev + chunk);
        },

        onError: (err, context) => {
          addLog(`❌ Error (${context}): ${err.message}`);
        },
      });

      // Start pipeline
      addLog('🎬 Starting conversation manager...');
      await managerRef.current.start();

      setIsActive(true);
      addLog('✅ Pipeline started! You can now speak.');

    } catch (err: any) {
      console.error('Pipeline error:', err);
      setError(err.message || 'Pipeline failed to start');
      addLog('❌ Error: ' + (err.message || 'Unknown error'));
    }
  };

  const handleStop = async () => {
    if (managerRef.current) {
      addLog('🛑 Stopping pipeline...');

      // Get final metrics before stopping
      const finalMetrics = managerRef.current.getMetrics();
      setMetrics(finalMetrics);

      await managerRef.current.stop();
      managerRef.current = null;

      setIsActive(false);
      setConversationState(ConversationState.IDLE);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      addLog('✅ Pipeline stopped');
    }
  };

  const getStateColor = (state: ConversationState) => {
    switch (state) {
      case ConversationState.IDLE:
        return 'bg-gray-100 text-gray-800';
      case ConversationState.LISTENING:
        return 'bg-blue-100 text-blue-800';
      case ConversationState.USER_SPEAKING:
        return 'bg-green-100 text-green-800';
      case ConversationState.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case ConversationState.AVATAR_SPEAKING:
        return 'bg-purple-100 text-purple-800';
      case ConversationState.INTERRUPTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-2">Conversation Pipeline Test</h1>
          <p className="text-gray-600">
            Testing full modular pipeline: Deepgram Flux → Claude Haiku → HeyGen Avatar
          </p>
        </div>

        {/* Video + State */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Stream */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Avatar Video</h2>
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute top-0 left-0 w-full h-full object-contain"
              />
              {!isActive && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white">
                  <p>Click "Start Pipeline" to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* State & Controls */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Status & Controls</h2>

            {/* State */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Conversation State:</h3>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStateColor(conversationState)}`}>
                {conversationState.toUpperCase()}
              </span>
            </div>

            {/* Controls */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleStart}
                disabled={isActive}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isActive ? '✅ Pipeline Active' : '🚀 Start Pipeline'}
              </button>
              <button
                onClick={handleStop}
                disabled={!isActive}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                🛑 Stop Pipeline
              </button>
            </div>

            {/* Instructions */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">How to test:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Click "Start Pipeline"</li>
                <li>2. Wait for "Pipeline started!" in logs</li>
                <li>3. Speak in Spanish (e.g., "Hola Clara, ¿cómo estás?")</li>
                <li>4. Watch the state transitions</li>
                <li>5. Try interrupting while avatar speaks (barge-in)</li>
                <li>6. Check latency metrics when done</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Transcripts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Transcripts</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transcripts.length === 0 ? (
              <p className="text-gray-500 text-sm">No transcripts yet...</p>
            ) : (
              transcripts.map((t, idx) => (
                <div key={idx} className={`text-sm ${t.isFinal ? 'font-medium' : 'text-gray-500'}`}>
                  {t.isFinal ? '✅' : '⏳'} {t.text}
                </div>
              ))
            )}
          </div>
        </div>

        {/* LLM Response */}
        {llmResponse && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">LLM Response</h2>
            <p className="text-sm text-gray-800">{llmResponse}</p>
          </div>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Latency Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">STT Latency</p>
                <p className="text-lg font-semibold">{metrics.sttLatency}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">LLM Latency</p>
                <p className="text-lg font-semibold">{metrics.llmLatency}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">TTS Latency</p>
                <p className="text-lg font-semibold">{metrics.ttsLatency}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total E2E</p>
                <p className="text-lg font-semibold text-blue-600">{metrics.totalLatency}ms</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-1">❌ Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Debug Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
