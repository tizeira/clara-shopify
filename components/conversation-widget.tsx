"use client"

/**
 * ConversationWidget
 *
 * Custom conversation widget using the real-time pipeline:
 * Audio → Deepgram Nova-3 (STT) → Claude Haiku (LLM) → HeyGen Avatar (TTS)
 *
 * Features:
 * - Real-time transcription display (interim + final)
 * - State-based UI (listening, processing, speaking)
 * - Automatic fallback to HeyGen built-in on errors
 * - Shopify personalization support
 * - Same glassmorphism UI as HelpAssistantWidget
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, Video, Phone, PhoneOff, MicOff, Loader2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
  useStreamingAvatarSession,
  useStreamingAvatarContext
} from "@/hooks/avatar"
import { useConversationPipeline, ConversationState } from "@/hooks/conversation"
import { AvatarVideo } from "@/components/avatar/AvatarVideo"
import { AvatarQuality, VoiceEmotion, STTProvider, VoiceChatTransport, StartAvatarRequest, ElevenLabsModel } from "@heygen/streaming-avatar"
import { useMemoizedFn, useUnmount } from "ahooks"
import { ClaraCustomerData, generateKnowledgeBaseContext } from "@/lib/shopify-client"
import { FALLBACK_CONFIG } from "@/config/features"

// Avatar configuration - NO voice chat, just video
const getAvatarConfig = (
  isDesktop: boolean,
  customerData?: ClaraCustomerData | null,
  userName?: string | null
): StartAvatarRequest => {
  // Build personalized knowledge base (still needed for avatar session)
  const knowledgeBase = generateKnowledgeBaseContext(customerData || null, userName || undefined);

  return {
    quality: AvatarQuality.Medium,
    avatarName: isDesktop
      ? (process.env.NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID || process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || "Alessandra_Chair_Sitting_public")
      : (process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || "Alessandra_CasualLook_public"),
    knowledgeBase: knowledgeBase,
    voice: {
      voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID || "1e080de3d73e4225a7454797a848bffe",
      rate: 1,
      emotion: VoiceEmotion.SERIOUS,
      model: ElevenLabsModel.eleven_flash_v2_5,
      elevenlabsSettings: {
        stability: 0.8,
        similarity_boost: 0.85,
        use_speaker_boost: true,
      },
    },
    language: "es",
    // NO voice chat transport - we'll use custom pipeline
  };
};

// Hook to detect screen size
const useScreenSize = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isDesktop };
};

// Hook to detect iframe and fix height on mobile
const useFixedHeight = () => {
  const [fixedHeight, setFixedHeight] = useState<number | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    if (inIframe && window.innerWidth < 1024) {
      const height = window.innerHeight;
      setFixedHeight(height);
    }
  }, []);

  useEffect(() => {
    if (isInIframe && window.innerWidth < 1024) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyHeight = document.body.style.height;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = `${window.innerHeight}px`;

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.height = originalBodyHeight;
      };
    }
  }, [isInIframe]);

  return { fixedHeight, isInIframe };
};

interface ConversationWidgetInnerProps {
  onFallback: () => void;
}

function ConversationWidgetInner({ onFallback }: ConversationWidgetInnerProps) {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream, avatarRef } = useStreamingAvatarSession();
  const { customerData, userName } = useStreamingAvatarContext();
  const { isDesktop } = useScreenSize();
  const { fixedHeight } = useFixedHeight();

  // Transcription state
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastFinalTranscript, setLastFinalTranscript] = useState<string>('');

  const mediaStream = useRef<HTMLVideoElement>(null);

  // Custom conversation pipeline
  const {
    start: startPipeline,
    stop: stopPipeline,
    state: pipelineState,
    errorCount,
    isActive: isPipelineActive,
  } = useConversationPipeline({
    customerData,
    userName,
    avatarInstance: avatarRef.current,
    avatarStream: stream,
    onStateChange: (state) => {
      console.log('📊 Pipeline state:', state);
    },
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setLastFinalTranscript(text);
        setInterimTranscript('');
      } else {
        setInterimTranscript(text);
      }
    },
    onLLMResponse: (text) => {
      console.log('🤖 Clara:', text);
    },
    onError: (error) => {
      console.error('❌ Pipeline error:', error);
    },
    onFallbackTriggered: () => {
      console.warn('🔄 Fallback triggered, switching to HeyGen built-in');
      handleStopSession().then(() => {
        onFallback();
      });
    },
  });

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const startSession = useMemoizedFn(async () => {
    try {
      // Request microphone permission first
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
        console.log("✅ Microphone permission granted");
      } catch (permError) {
        console.error("❌ Microphone permission denied:", permError);
        alert("Necesitas conceder permiso al micrófono para usar la llamada de voz");
        return;
      }

      // Start avatar session (without HeyGen voice chat)
      const newToken = await fetchAccessToken();
      initAvatar(newToken);

      const avatarConfig = getAvatarConfig(isDesktop, customerData, userName);
      await startAvatar(avatarConfig);

      // Note: Pipeline will be started after avatar stream is ready
      // (handled in useEffect below)

    } catch (error) {
      console.error("Error starting session:", error);
    }
  });

  // Start pipeline when avatar stream is ready
  useEffect(() => {
    if (stream && avatarRef.current && sessionState === StreamingAvatarSessionState.CONNECTED && !isPipelineActive) {
      console.log('🎬 Avatar stream ready, starting custom pipeline...');

      // Small delay to ensure avatar is fully initialized
      const timer = setTimeout(() => {
        startPipeline().catch(error => {
          console.error('Failed to start pipeline:', error);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [stream, avatarRef, sessionState, isPipelineActive, startPipeline]);

  const handleStopSession = useCallback(async () => {
    // Stop pipeline first
    await stopPipeline();

    // Then stop avatar
    await stopAvatar();

    // Reset transcription state
    setInterimTranscript('');
    setLastFinalTranscript('');
  }, [stopPipeline, stopAvatar]);

  useUnmount(() => {
    stopPipeline();
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [mediaStream, stream]);

  const getStatusText = () => {
    if (sessionState === StreamingAvatarSessionState.CONNECTING) {
      return "Conectando con Clara...";
    }
    if (sessionState === StreamingAvatarSessionState.CONNECTED) {
      switch (pipelineState) {
        case ConversationState.LISTENING:
          return "Te escucho...";
        case ConversationState.USER_SPEAKING:
          return "Escuchando...";
        case ConversationState.PROCESSING:
          return "Procesando...";
        case ConversationState.AVATAR_SPEAKING:
          return "Clara respondiendo...";
        case ConversationState.INTERRUPTED:
          return "Interrumpido";
        default:
          return isPipelineActive ? "Lista para ayudarte" : "Iniciando...";
      }
    }
    return "";
  };

  const getStateIcon = () => {
    switch (pipelineState) {
      case ConversationState.LISTENING:
        return <Mic className="w-3 h-3" />;
      case ConversationState.USER_SPEAKING:
        return <Mic className="w-3 h-3 animate-pulse" />;
      case ConversationState.PROCESSING:
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case ConversationState.AVATAR_SPEAKING:
        return <MessageSquare className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Landing State
  if (sessionState === StreamingAvatarSessionState.INACTIVE) {
    return (
      <div
        className={fixedHeight ? "flex items-center justify-center p-6" : "min-h-screen flex items-center justify-center p-6"}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          ...(fixedHeight ? { height: `${fixedHeight}px`, overflow: 'hidden' } : {})
        }}
      >
        <div className="text-center space-y-8 max-w-sm mx-auto">
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-lg">
              <Video className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Habla con Clara
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Tu consultora virtual de skincare está lista para ayudarte con recomendaciones personalizadas
            </p>
            {/* Custom Pipeline Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-100/80 text-purple-700 text-xs px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              Pipeline Personalizado
            </div>
          </div>

          <button
            onClick={() => startSession()}
            className="w-full h-14 bg-blue-500/80 hover:bg-blue-500 backdrop-blur-md text-white font-semibold rounded-2xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 border border-blue-400/30 shadow-lg"
          >
            <Phone className="w-6 h-6" />
            Iniciar Llamada con Clara
          </button>
        </div>
      </div>
    );
  }

  // Connecting State
  if (sessionState === StreamingAvatarSessionState.CONNECTING) {
    return (
      <div
        className={fixedHeight ? "flex items-center justify-center" : "min-h-screen flex items-center justify-center"}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          ...(fixedHeight ? { height: `${fixedHeight}px`, overflow: 'hidden' } : {})
        }}
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-lg">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">Conectando...</h3>
            <p className="text-slate-600">Iniciando video llamada con Clara</p>
          </div>
        </div>
      </div>
    );
  }

  // Connected State
  return (
    <div
      className={fixedHeight ? "flex flex-col" : "min-h-screen flex flex-col"}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(fixedHeight ? { height: `${fixedHeight}px`, overflow: 'hidden' } : {})
      }}
    >
      {/* Top Status Bar */}
      <div className="flex-shrink-0 px-2 pt-2 pb-1 md:px-4 md:pt-3 md:pb-2">
        <div className="bg-white/30 backdrop-blur-sm rounded-lg md:rounded-xl px-3 py-1.5 md:px-4 md:py-2 border border-white/20 mx-auto max-w-xs shadow-md">
          <div className="flex items-center justify-center gap-2">
            {getStateIcon()}
            <p className="text-slate-700 font-medium text-center text-[10px] md:text-xs">{getStatusText()}</p>
          </div>
          {isPipelineActive && (
            <div className="flex items-center justify-center gap-1 md:gap-1.5 mt-0.5 md:mt-1">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] md:text-[10px] text-green-600 font-medium">Pipeline Activo</span>
              {errorCount > 0 && (
                <span className="text-[9px] md:text-[10px] text-amber-600 font-medium ml-2">
                  ({errorCount}/{FALLBACK_CONFIG.FAILURE_THRESHOLD} errores)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clara Video Container */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-3 md:p-4 lg:p-6">
          <div className="w-full h-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl bg-white/95 md:backdrop-blur-sm rounded-xl md:rounded-2xl overflow-hidden md:shadow-lg md:border md:border-slate-200/30 relative">
            <div className="w-full h-full relative">
              {stream ? (
                <AvatarVideo
                  ref={mediaStream}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <Video className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-slate-600">Iniciando video...</p>
                  </div>
                </div>
              )}

              {/* Real-time Transcription Display */}
              {(interimTranscript || lastFinalTranscript) && (
                <div className="absolute top-4 left-4 right-4">
                  <div className="bg-black/60 backdrop-blur-md text-white text-sm px-4 py-3 rounded-xl shadow-lg border border-white/10 max-w-md mx-auto">
                    <div className="flex items-start gap-2">
                      <Mic className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                      <div>
                        {interimTranscript && (
                          <p className="text-white/70 italic">{interimTranscript}</p>
                        )}
                        {lastFinalTranscript && !interimTranscript && (
                          <p className="text-white">{lastFinalTranscript}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* State Indicators Over Video */}
              {pipelineState === ConversationState.USER_SPEAKING && (
                <div className="absolute top-20 left-6">
                  <div className="bg-green-500/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-green-400/30">
                    <Mic className="w-3 h-3" />
                    <span className="text-xs font-medium">Te escucho</span>
                  </div>
                </div>
              )}

              {pipelineState === ConversationState.PROCESSING && (
                <div className="absolute top-20 right-6">
                  <div className="bg-purple-500/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-purple-400/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs font-medium">Pensando...</span>
                  </div>
                </div>
              )}

              {pipelineState === ConversationState.AVATAR_SPEAKING && (
                <div className="absolute top-20 right-6">
                  <div className="bg-blue-500/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-full shadow-lg border border-blue-400/30">
                    <span className="text-xs font-medium">Clara respondiendo</span>
                  </div>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Mute indicator (if needed in future) */}

                  {/* End Call Button */}
                  <button
                    onClick={handleStopSession}
                    className="bg-red-500/90 hover:bg-red-500 backdrop-blur-md text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-200 active:scale-95 flex items-center gap-3 shadow-lg border border-red-400/30 min-h-[56px]"
                  >
                    <PhoneOff className="w-6 h-6" />
                    Terminar Llamada
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConversationWidgetProps {
  customerData?: ClaraCustomerData | null;
  customerDataLoading?: boolean;
  userName?: string | null;
  onFallback?: () => void;
}

export default function ConversationWidget({
  customerData,
  customerDataLoading,
  userName,
  onFallback = () => {}
}: ConversationWidgetProps) {
  return (
    <StreamingAvatarProvider
      basePath={process.env.NEXT_PUBLIC_BASE_API_URL}
      customerData={customerData}
      userName={userName}
    >
      <ConversationWidgetInner onFallback={onFallback} />
    </StreamingAvatarProvider>
  );
}
