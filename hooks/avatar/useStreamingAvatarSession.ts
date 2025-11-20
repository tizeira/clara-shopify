import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { useCallback, useRef } from "react";

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

  // Timing measurements for latency diagnosis
  const timingRef = useRef({
    userEndTime: 0,
    avatarStartTime: 0,
  });

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

  // Enhanced handler for STREAM_READY with dynamic contextual greeting
  const handleStreamReady = useCallback(
    async (event: any) => {
      handleStream(event);

      let greeting: string;

      // VERSIÓN A: Cliente recurrente con historial de compras
      if (customerData && customerData.ordersCount > 0) {
        const firstName = customerData.firstName;

        // Extraer último producto comprado si existe
        const lastOrder = customerData.recentOrders?.[0];
        const lastProduct = lastOrder?.items?.[0]?.title || "productos Beta";

        greeting = `¡Hola ${firstName}! Qué bueno verte de nuevo. Vi que compraste ${lastProduct}, ¿cómo te está funcionando? Cuéntame si necesitas algo más para tu rutina.`;
      }
      // VERSIÓN B: Cliente nuevo con nombre (Shopify o localStorage)
      else if (customerData?.firstName || userName) {
        const name = customerData?.firstName || userName;
        greeting = `¡Hola ${name}! Soy Clara, encantada de conocerte. Soy tu asesora de skincare aquí en Beta. ¿Tenés alguna preocupación con tu piel que querés resolver? Podemos armar la rutina perfecta para vos.`;
      }
      // VERSIÓN C: Primera vez sin datos
      else {
        greeting = `¡Hola! Soy Clara, tu asesora personal de skincare en Beta. Contame, ¿hay algo específico de tu piel que te preocupa o querés mejorar? Estoy acá para ayudarte a encontrar los productos ideales.`;
      }

      // Send initial greeting immediately when stream is ready
      try {
        await avatarRef.current?.speak({
          text: greeting,
          taskType: TaskType.REPEAT, // REPEAT = only TTS, no LLM processing
        });
        console.log("✅ Dynamic greeting sent:", greeting);
      } catch (error) {
        console.error("Failed to send initial greeting:", error);
      }
    },
    [handleStream, avatarRef, customerData, userName],
  );

  const stop = useCallback(async () => {
    // Remove ALL event listeners to prevent memory leaks
    // For handlers with inline functions, we can't remove them individually
    // But stopAvatar() + clearing the ref will clean up SDK resources
    if (avatarRef.current) {
      avatarRef.current.off(StreamingEvents.STREAM_READY, handleStreamReady);
      avatarRef.current.off(StreamingEvents.STREAM_DISCONNECTED, stop);
      avatarRef.current.off(StreamingEvents.USER_TALKING_MESSAGE, handleUserTalkingMessage);
      avatarRef.current.off(StreamingEvents.AVATAR_TALKING_MESSAGE, handleStreamingTalkingMessage);
      avatarRef.current.off(StreamingEvents.AVATAR_END_MESSAGE, handleEndMessage);

      // Note: Inline handlers (CONNECTION_QUALITY_CHANGED, USER_START, USER_STOP,
      // AVATAR_START_TALKING, AVATAR_STOP_TALKING, USER_END_MESSAGE) can't be
      // individually removed without refactoring. However, stopAvatar() will clean
      // up the SDK instance and release these handlers.
    }

    clearMessages();
    stopVoiceChat();
    setIsListening(false);
    setIsUserTalking(false);
    setIsAvatarTalking(false);
    setStream(null);

    // stopAvatar() destroys the SDK instance, releasing all remaining event listeners
    await avatarRef.current?.stopAvatar();
    setSessionState(StreamingAvatarSessionState.INACTIVE);
  }, [
    handleStreamReady,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
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
        const now = Date.now();
        timingRef.current.avatarStartTime = now;

        // Only log latency if we have a previous user message (not greeting)
        if (timingRef.current.userEndTime > 0) {
          const llmLatency = now - timingRef.current.userEndTime;
          console.log('⏱️ AVATAR_START_TALKING');
          console.log(`⏱️ LLM Processing Latency: ${llmLatency}ms`);
        } else {
          console.log('⏱️ AVATAR_START_TALKING (initial greeting)');
        }

        setIsAvatarTalking(true);
      });
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        const now = Date.now();
        const ttsDuration = now - timingRef.current.avatarStartTime;
        console.log('⏱️ AVATAR_STOP_TALKING');
        console.log(`⏱️ TTS Duration: ${ttsDuration}ms`);
        console.log(`⏱️ Total Response Time: ${now - timingRef.current.userEndTime}ms`);
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
      avatarRef.current.on(StreamingEvents.USER_END_MESSAGE, () => {
        const now = Date.now();
        timingRef.current.userEndTime = now;
        console.log('⏱️ USER_END_MESSAGE - waiting for avatar response...');
        handleEndMessage();
      });
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