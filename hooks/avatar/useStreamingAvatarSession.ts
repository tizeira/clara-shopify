import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { useCallback } from "react";

import {
  StreamingAvatarSessionState,
  useStreamingAvatarContext,
} from "./context";
import { useVoiceChat } from "./useVoiceChat";
import { generateKnowledgeBaseContext } from "@/lib/shopify-client";

export const useStreamingAvatarSession = () => {
  const {
    avatarRef,
    basePath,
    sessionState,
    setSessionState,
    stream,
    setStream,
    setIsListening,
    setIsUserTalking,
    setIsAvatarTalking,
    setConnectionQuality,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
    clearMessages,
    customerData,
    userName,
  } = useStreamingAvatarContext();
  const { stopVoiceChat } = useVoiceChat();

  const init = useCallback(
    (token: string) => {
      avatarRef.current = new StreamingAvatar({
        token,
        basePath: basePath,
      });

      return avatarRef.current;
    },
    [basePath, avatarRef],
  );

  const handleStream = useCallback(
    ({ detail }: { detail: MediaStream }) => {
      setStream(detail);
      setSessionState(StreamingAvatarSessionState.CONNECTED);
    },
    [setSessionState, setStream],
  );

  // Enhanced handler for STREAM_READY with initial greeting
  const handleStreamReady = useCallback(
    async (event: any) => {
      handleStream(event);

      // Determinar nombre para saludo personalizado
      const userFirstName = customerData?.firstName || userName;

      // Saludo personalizado si hay nombre, genérico si no
      const greeting = userFirstName
        ? `¡Hola ${userFirstName}! Soy Clara de Beta Skin Tech, tu asesora virtual de skincare. ¿En qué puedo ayudarte hoy?`
        : `¡Hola! Soy Clara de Beta Skin Tech, tu asesora virtual de skincare. ¿En qué puedo ayudarte hoy?`;

      // Send initial greeting immediately when stream is ready
      try {
        await avatarRef.current?.speak({
          text: greeting,
          taskType: TaskType.REPEAT, // REPEAT = only TTS, no LLM processing
        });
        console.log("✅ Initial greeting sent:", greeting);
      } catch (error) {
        console.error("Failed to send initial greeting:", error);
      }
    },
    [handleStream, avatarRef, customerData, userName],
  );

  const stop = useCallback(async () => {
    avatarRef.current?.off(StreamingEvents.STREAM_READY, handleStreamReady);
    avatarRef.current?.off(StreamingEvents.STREAM_DISCONNECTED, stop);
    clearMessages();
    stopVoiceChat();
    setIsListening(false);
    setIsUserTalking(false);
    setIsAvatarTalking(false);
    setStream(null);
    await avatarRef.current?.stopAvatar();
    setSessionState(StreamingAvatarSessionState.INACTIVE);
  }, [
    handleStreamReady,
    setSessionState,
    setStream,
    avatarRef,
    setIsListening,
    stopVoiceChat,
    clearMessages,
    setIsUserTalking,
    setIsAvatarTalking,
  ]);

  const start = useCallback(
    async (config: StartAvatarRequest, token?: string) => {
      if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
        throw new Error("There is already an active session");
      }

      if (!avatarRef.current) {
        if (!token) {
          throw new Error("Token is required");
        }
        init(token);
      }

      if (!avatarRef.current) {
        throw new Error("Avatar is not initialized");
      }

      setSessionState(StreamingAvatarSessionState.CONNECTING);

      // Enhanced STREAM_READY handler with initial greeting
      avatarRef.current.on(StreamingEvents.STREAM_READY, handleStreamReady);
      avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, stop);
      avatarRef.current.on(
        StreamingEvents.CONNECTION_QUALITY_CHANGED,
        ({ detail }: { detail: ConnectionQuality }) =>
          setConnectionQuality(detail),
      );
      avatarRef.current.on(StreamingEvents.USER_START, () => {
        setIsUserTalking(true);
      });
      avatarRef.current.on(StreamingEvents.USER_STOP, () => {
        setIsUserTalking(false);
      });
      avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setIsAvatarTalking(true);
      });
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setIsAvatarTalking(false);
      });
      avatarRef.current.on(
        StreamingEvents.USER_TALKING_MESSAGE,
        handleUserTalkingMessage,
      );
      avatarRef.current.on(
        StreamingEvents.AVATAR_TALKING_MESSAGE,
        handleStreamingTalkingMessage,
      );
      avatarRef.current.on(StreamingEvents.USER_END_MESSAGE, handleEndMessage);
      avatarRef.current.on(
        StreamingEvents.AVATAR_END_MESSAGE,
        handleEndMessage,
      );

      // SIEMPRE usar knowledge base personalizada (con o sin datos de usuario)
      const finalConfig = { ...config };

      if (customerData) {
        // Prioridad 1: Datos completos de Shopify (futuro)
        finalConfig.knowledgeBase = generateKnowledgeBaseContext(customerData);
        console.log('✅ Using Shopify customer knowledge base:', customerData.firstName, customerData.lastName);
      } else if (userName) {
        // Prioridad 2: Solo nombre de localStorage
        finalConfig.knowledgeBase = generateKnowledgeBaseContext(null, userName);
        console.log('✅ Using personalized knowledge base for:', userName);
      } else {
        // Prioridad 3: Solo prompt base (sin personalización)
        finalConfig.knowledgeBase = generateKnowledgeBaseContext(null);
        console.log('ℹ️  Using base Clara prompt without personalization');
      }

      await avatarRef.current.createStartAvatar(finalConfig);

      return avatarRef.current;
    },
    [
      init,
      handleStreamReady,
      stop,
      setSessionState,
      avatarRef,
      sessionState,
      setConnectionQuality,
      setIsUserTalking,
      handleUserTalkingMessage,
      handleStreamingTalkingMessage,
      handleEndMessage,
      setIsAvatarTalking,
      customerData,
      userName,
    ],
  );

  return {
    avatarRef,
    sessionState,
    stream,
    initAvatar: init,
    startAvatar: start,
    stopAvatar: stop,
  };
};