"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, Video, Phone, PhoneOff, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
  useStreamingAvatarSession,
  useVoiceChat,
  useStreamingAvatarContext
} from "@/hooks/avatar"
import { AvatarVideo } from "@/components/avatar/AvatarVideo"
import { VoiceInterface } from "@/components/avatar/VoiceInterface"
import { AvatarQuality, VoiceEmotion, STTProvider, VoiceChatTransport, StartAvatarRequest, StreamingEvents, ElevenLabsModel } from "@heygen/streaming-avatar"
import { useMemoizedFn, useUnmount } from "ahooks"
import { ClaraCustomerData, generateKnowledgeBaseContext } from "@/lib/shopify-client"

// Avatar configuration by screen size
// Uses environment variables from Vercel, with local fallbacks
// NEXT_PUBLIC_HEYGEN_AVATAR_ID = Mobile avatar (vertical/portrait format)
// NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID = Desktop avatar (horizontal/landscape format)
const getResponsiveAvatarConfig = (
  isDesktop: boolean,
  customerData?: ClaraCustomerData | null,
  userName?: string | null
): StartAvatarRequest => {
  // Build personalized knowledge base if we have customer data
  const knowledgeBase = generateKnowledgeBaseContext(customerData || null, userName || undefined);

  console.log('🎯 Avatar config:', {
    hasCustomerData: !!customerData,
    hasUserName: !!userName,
    firstName: customerData?.firstName,
    skinType: customerData?.skinType,
    usingPersonalizedPrompt: !!(customerData || userName)
  });

  return {
    quality: AvatarQuality.Medium, // CAMBIO 1: Medium quality (1000kbps @ 480p) for better clarity
    avatarName: isDesktop
      ? (process.env.NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID || process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || "Alessandra_Chair_Sitting_public")
      : (process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID || "Alessandra_CasualLook_public"),
    // Use knowledgeBase (personalized) instead of knowledgeId
    knowledgeBase: knowledgeBase,
    voice: {
      voiceId: process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID || "1e080de3d73e4225a7454797a848bffe",
      rate: 1,
      emotion: VoiceEmotion.SERIOUS,
      model: ElevenLabsModel.eleven_flash_v2_5, // CAMBIO 2: Fast model for reduced latency
      elevenlabsSettings: { // CAMBIO 3: Optimized audio quality settings
        stability: 0.8, // Higher stability for consistent voice
        similarity_boost: 0.85, // Enhanced voice similarity and clarity
        use_speaker_boost: true, // Boost speaker clarity
      },
    },
    language: "es",
    voiceChatTransport: VoiceChatTransport.WEBSOCKET,
    sttSettings: {
      provider: STTProvider.DEEPGRAM,
      confidence: 0.55,
    },
  };
};

// Hook to detect screen size
const useScreenSize = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
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
    // Detect if we're in an iframe
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // If in iframe and mobile, calculate and fix height once
    if (inIframe && window.innerWidth < 1024) {
      // Use window.innerHeight which gives us the actual viewport height
      // This prevents the jumping when URL bar appears/disappears in mobile browsers
      const height = window.innerHeight;
      setFixedHeight(height);
      console.log('📱 Fixed height for mobile iframe:', height);
    }
  }, []);

  // Remove scrollbar and prevent scrolling in mobile iframe
  useEffect(() => {
    if (isInIframe && window.innerWidth < 1024) {
      // Store original values
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyHeight = document.body.style.height;

      // Apply overflow hidden to remove scrollbar
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = `${window.innerHeight}px`;

      console.log('🚫 Scrollbar removed in mobile iframe');

      return () => {
        // Cleanup: restore original values
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.height = originalBodyHeight;
      };
    }
  }, [isInIframe]);

  return { fixedHeight, isInIframe };
};

function ClaraWidgetMobile() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();
  const { isVoiceChatActive, isUserTalking, isAvatarTalking, isMuted, customerData, userName } = useStreamingAvatarContext();
  const { isDesktop } = useScreenSize();
  const { fixedHeight, isInIframe } = useFixedHeight();

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const mediaStream = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      if (process.env.NODE_ENV === 'development') {
        console.log("Access Token:", token);
      }

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const startSession = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      setIsVoiceMode(isVoiceChat);

      // Request microphone permissions BEFORE starting avatar session
      // Safari doesn't support navigator.permissions.query for microphone
      // Direct getUserMedia approach works on all browsers
      if (isVoiceChat) {
        try {
          // Request microphone permission directly (works on Chrome, Safari, Firefox)
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Immediately release the stream after getting permission
          tempStream.getTracks().forEach(track => track.stop());
          console.log("✅ Microphone permission granted before session start");
        } catch (permError) {
          console.error("❌ Microphone permission denied:", permError);
          // User denied permission or browser blocked, cannot proceed with voice chat
          alert("Necesitas conceder permiso al micrófono para usar la llamada de voz");
          return;
        }
      }

      const newToken = await fetchAccessToken();
      initAvatar(newToken);

      // Use responsive avatar configuration with personalized data
      const avatarConfig = getResponsiveAvatarConfig(isDesktop, customerData, userName);
      await startAvatar(avatarConfig);

      if (isVoiceChat) {
        // Start voice chat WITH MUTED MIC to allow greeting to play first
        await startVoiceChat(true); // true = muted initially (like HeyGen embed)
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  const handleStopSession = useCallback(async () => {
    await stopAvatar();
    setIsVoiceMode(false);
  }, [stopAvatar]);

  useUnmount(() => {
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
      if (isUserTalking) return "Te escucho...";
      if (isAvatarTalking) return "Clara está hablando...";
      if (isMuted) return "Micrófono silenciado";
      return "Lista para ayudarte";
    }
    return "";
  };

  // Landing State - Before connection
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
          </div>

          {/* Main CTA Button - Always with voice */}
          <button
            onClick={() => startSession(true)}
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

  // Connected State - Fixed Vertical Layout
  return (
    <div
      className={fixedHeight ? "flex flex-col" : "min-h-screen flex flex-col"}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Fix height in mobile iframe to prevent jumping when scrolling
        ...(fixedHeight ? { height: `${fixedHeight}px`, overflow: 'hidden' } : {})
      }}
    >
      {/* Top Status Bar - Ultra Minimal on Mobile, Discrete on Desktop */}
      <div className="flex-shrink-0 px-2 pt-2 pb-1 md:px-4 md:pt-3 md:pb-2">
        <div className="bg-white/30 backdrop-blur-sm rounded-lg md:rounded-xl px-3 py-1.5 md:px-4 md:py-2 border border-white/20 mx-auto max-w-xs shadow-md">
          <p className="text-slate-700 font-medium text-center text-[10px] md:text-xs">{getStatusText()}</p>
          {isVoiceChatActive && (
            <div className="flex items-center justify-center gap-1 md:gap-1.5 mt-0.5 md:mt-1">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] md:text-[10px] text-green-600 font-medium">Conectada</span>
            </div>
          )}
        </div>
      </div>

      {/* Clara Video Container - Maximum Height */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-3 md:p-4 lg:p-6">
          {/* Video Frame - Responsive sizing: MOBILE OPTIMIZED VERTICAL + DESKTOP WIDE */}
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

              {/* Voice Activity Indicators Over Video */}
              {isUserTalking && (
                <div className="absolute top-6 left-6">
                  <div className="bg-green-500/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-green-400/30">
                    <Mic className="w-3 h-3" />
                    <span className="text-xs font-medium">Te escucho</span>
                  </div>
                </div>
              )}

              {isAvatarTalking && (
                <div className="absolute top-6 right-6">
                  <div className="bg-blue-500/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-full shadow-lg border border-blue-400/30">
                    <span className="text-xs font-medium">Clara respondiendo</span>
                  </div>
                </div>
              )}

              {/* Bottom Controls Overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Voice Interface Button */}
                  {isVoiceMode && (
                    <VoiceInterface isActive={true} />
                  )}

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

interface HelpAssistantWidgetProps {
  customerData?: ClaraCustomerData | null;
  customerDataLoading?: boolean;
  userName?: string | null;
}

export default function HelpAssistantWidgetMobile({
  customerData,
  customerDataLoading,
  userName
}: HelpAssistantWidgetProps) {
  return (
    <StreamingAvatarProvider
      basePath={process.env.NEXT_PUBLIC_BASE_API_URL}
      customerData={customerData}
      userName={userName}
    >
      <ClaraWidgetMobile />
    </StreamingAvatarProvider>
  );
}