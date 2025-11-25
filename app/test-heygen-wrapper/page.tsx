'use client';

/**
 * Test page for HeyGenAvatarProvider
 *
 * Tests:
 * - Initialize avatar session
 * - Video stream rendering
 * - speak() with REPEAT mode (TTS only)
 * - interrupt() mid-speech
 * - Event callbacks (onSpeakStart, onSpeakEnd)
 * - isSpeaking() status
 */

import { useState, useEffect, useRef } from 'react';
import { HeyGenAvatarProvider } from '@/lib/realtime-conversation/providers/avatar/heygen-wrapper';

export default function HeyGenWrapperTest() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testText, setTestText] = useState('Hola, soy Clara. Estoy probando el modo REPEAT del wrapper de HeyGen.');
  const [logs, setLogs] = useState<string[]>([]);

  const avatarRef = useRef<HeyGenAvatarProvider | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-15), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (avatarRef.current) {
        avatarRef.current.cleanup();
      }
    };
  }, []);

  const handleInitialize = async () => {
    try {
      setError(null);
      addLog('🚀 Initializing HeyGen Avatar Provider...');

      // Get API key
      const apiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_HEYGEN_API_KEY not found. Add it to .env.local');
      }

      // Get avatar and voice IDs
      const avatarId = process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || 'Katya_CasualLook_public';
      const voiceId = process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID || '0e69c649917e4a6da0f9a9e1fe02f498';

      // Create provider
      avatarRef.current = new HeyGenAvatarProvider({
        apiKey,
        avatarId,
        voiceId,
        language: 'es',
        logEvents: true,
      });

      // Register event callbacks
      avatarRef.current.onSpeakStart(() => {
        setIsSpeaking(true);
        addLog('🗣️ Avatar started speaking');
      });

      avatarRef.current.onSpeakEnd(() => {
        setIsSpeaking(false);
        addLog('🛑 Avatar stopped speaking');
      });

      // Initialize (starts HeyGen session)
      await avatarRef.current.initialize();

      // Get video stream
      const stream = avatarRef.current.getStream();
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        addLog('🎥 Video stream connected');
      }

      setIsInitialized(true);
      addLog('✅ Initialized successfully');
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || 'Initialization failed');
      addLog('❌ Error: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSpeak = async () => {
    if (!avatarRef.current || !isInitialized) {
      setError('Avatar not initialized');
      return;
    }

    try {
      setError(null);
      addLog('🗣️ Sending text to speak (REPEAT mode)...');

      await avatarRef.current.speak(testText, 'REPEAT');

      addLog('✅ Speech command sent');
    } catch (err: any) {
      console.error('Speak error:', err);
      setError(err.message || 'Speak failed');
      addLog('❌ Speak error: ' + (err.message || 'Unknown error'));
    }
  };

  const handleInterrupt = async () => {
    if (!avatarRef.current || !isInitialized) {
      setError('Avatar not initialized');
      return;
    }

    try {
      setError(null);
      addLog('🛑 Interrupting speech...');

      await avatarRef.current.interrupt();

      addLog('✅ Interrupted successfully');
    } catch (err: any) {
      console.error('Interrupt error:', err);
      setError(err.message || 'Interrupt failed');
      addLog('❌ Interrupt error: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCleanup = async () => {
    if (avatarRef.current) {
      addLog('🧹 Cleaning up...');
      await avatarRef.current.cleanup();
      avatarRef.current = null;
      setIsInitialized(false);
      setIsSpeaking(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addLog('✅ Cleanup complete');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-2">HeyGen Avatar Provider Test</h1>
          <p className="text-gray-600">
            Testing REPEAT mode wrapper for modular conversation pipeline
          </p>
        </div>

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
            {!isInitialized && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white">
                <p>Click "Initialize" to start avatar session</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Controls</h2>

          {/* Initialize / Cleanup */}
          <div className="flex gap-3">
            <button
              onClick={handleInitialize}
              disabled={isInitialized}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isInitialized ? '✅ Initialized' : '🚀 Initialize'}
            </button>
            <button
              onClick={handleCleanup}
              disabled={!isInitialized}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              🧹 Cleanup
            </button>
          </div>

          {/* Test Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Text (will be spoken in REPEAT mode):
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Enter text to speak..."
            />
          </div>

          {/* Speak / Interrupt */}
          <div className="flex gap-3">
            <button
              onClick={handleSpeak}
              disabled={!isInitialized || isSpeaking || !testText.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSpeaking ? '🗣️ Speaking...' : '🗣️ Speak (REPEAT)'}
            </button>
            <button
              onClick={handleInterrupt}
              disabled={!isInitialized || !isSpeaking}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              🛑 Interrupt
            </button>
          </div>

          {/* Status */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Status:</h3>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm ${isInitialized ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isInitialized ? '✅ Initialized' : '⏸️ Not Initialized'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${isSpeaking ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                {isSpeaking ? '🗣️ Speaking' : '🔇 Silent'}
              </span>
            </div>
          </div>
        </div>

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
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
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

        {/* Test Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-blue-900 font-semibold mb-3">Test Checklist:</h3>
          <ol className="space-y-2 text-blue-800 text-sm">
            <li>✅ Click "Initialize" to start HeyGen session</li>
            <li>✅ Verify video stream appears</li>
            <li>✅ Enter test text in Spanish</li>
            <li>✅ Click "Speak (REPEAT)" - avatar should speak WITHOUT using LLM</li>
            <li>✅ Verify "Speaking" status appears</li>
            <li>✅ Verify onSpeakStart/onSpeakEnd events fire (check logs)</li>
            <li>✅ Test interrupt by clicking "Interrupt" while speaking</li>
            <li>✅ Click "Cleanup" when done</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
