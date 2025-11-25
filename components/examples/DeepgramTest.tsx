'use client';

/**
 * ⚠️ LEGACY TEST COMPONENT - Uses deprecated Nova-2 implementation
 *
 * Example component showing how to use DeepgramStreamingSTT (Nova-2)
 * For new implementations, use DeepgramFluxSTT instead.
 *
 * This is kept for testing the legacy implementation only.
 */

import { useState, useEffect, useRef } from 'react';
import { DeepgramStreamingSTT } from '@/lib/realtime-conversation/providers/stt/deepgram-streaming.legacy';

export default function DeepgramTest() {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const sttRef = useRef<DeepgramStreamingSTT | null>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sttRef.current) {
        sttRef.current.cleanup();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setError(null);
      setInterimTranscript('');
      setFinalTranscripts([]);
      setDebugLogs([]);

      addDebugLog('🚀 Starting Deepgram STT...');

      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_DEEPGRAM_API_KEY not found. Please add it to .env.local');
      }

      addDebugLog('✅ API key found');

      // Create STT provider
      sttRef.current = new DeepgramStreamingSTT({
        apiKey,
        // Optional configuration overrides
        endpointing: 300, // 300ms silence = end of utterance
        // eotThreshold: 0.7,
        // keyterms: ['Clara', 'skincare', 'crema', 'piel'],
      });

      addDebugLog('📦 STT provider created');

      // Setup callbacks
      sttRef.current.onInterim((text) => {
        addDebugLog(`⏳ Interim: ${text.substring(0, 50)}...`);
        setInterimTranscript(text);
      });

      sttRef.current.onTranscript((text) => {
        addDebugLog(`✅ Final: ${text.substring(0, 50)}...`);
        setFinalTranscripts((prev) => [...prev, text]);
        setInterimTranscript(''); // Clear interim after final
      });

      sttRef.current.onSpeechStart(() => {
        addDebugLog('🎤 Speech started');
        setIsSpeaking(true);
      });

      sttRef.current.onSpeechEnd(() => {
        addDebugLog('🎤 Speech ended');
        setIsSpeaking(false);
      });

      sttRef.current.onError((err) => {
        addDebugLog(`❌ Error: ${err.message}`);
        setError(err.message);
        setIsListening(false);
      });

      addDebugLog('🎧 Setting up callbacks...');

      // Start listening
      await sttRef.current.startListening();

      addDebugLog('🎙️ Listening started! Speak now...');
      setIsListening(true);

    } catch (err: any) {
      addDebugLog(`❌ Failed to start: ${err.message}`);
      setError(err.message);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (sttRef.current) {
      await sttRef.current.stopListening();
      setIsListening(false);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🎤 Deepgram STT Test</h2>

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={startListening}
            disabled={isListening}
            className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
          >
            {isListening ? '🎙️ Listening...' : '▶️ Start Listening'}
          </button>

          <button
            onClick={stopListening}
            disabled={!isListening}
            className="px-6 py-2 bg-red-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
          >
            ⏹️ Stop
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isListening ? 'Listening' : 'Not listening'}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
            <span>{isSpeaking ? 'Speaking detected' : 'Silent'}</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Interim Transcript */}
        {interimTranscript && (
          <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Interim (typing...):</div>
            <div className="text-gray-700 italic">{interimTranscript}</div>
          </div>
        )}

        {/* Final Transcripts */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">
            Final Transcripts ({finalTranscripts.length}):
          </div>

          {finalTranscripts.length === 0 ? (
            <div className="text-gray-500 italic text-sm">
              No transcripts yet. Start listening and speak in Spanish...
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {finalTranscripts.map((transcript, index) => (
                <div
                  key={index}
                  className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="text-xs text-gray-500 mb-1">
                    Transcript #{index + 1}
                  </div>
                  <div className="text-gray-900">{transcript}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <strong>💡 Instructions:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
            <li>Click "Start Listening" and allow microphone access</li>
            <li>Speak in Spanish (configured for LAT-AM Spanish, es-419)</li>
            <li>Gray text shows interim results (typing effect)</li>
            <li>White boxes show final transcripts</li>
            <li>Try: "Hola, ¿qué crema me recomiendas para piel seca?"</li>
          </ul>
        </div>

        {/* Debug Logs */}
        <details className="text-sm" open>
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-semibold">
            🐛 Debug Logs (Console + UI)
          </summary>
          <div className="mt-2 p-3 bg-black text-green-400 rounded-lg space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Start Listening" to begin.</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            💡 Tip: Open browser DevTools console (F12) for detailed logs
          </div>
        </details>

        {/* Configuration Info */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
            ⚙️ Configuration Details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1 text-xs font-mono">
            <div><strong>Model:</strong> nova-2</div>
            <div><strong>Language:</strong> es-419 (Latin American Spanish)</div>
            <div><strong>Endpointing:</strong> 300ms</div>
            <div><strong>Smart Format:</strong> Enabled</div>
            <div><strong>Interim Results:</strong> Enabled</div>
            <div><strong>VAD Events:</strong> Enabled (for barge-in)</div>
          </div>
        </details>
      </div>
    </div>
  );
}
