import { type NextRequest, NextResponse } from "next/server"
import { generateResponseWithSession } from "@/services/transcribe-audio"

export async function POST(request: NextRequest) {
  try {
    const { userText, sessionId } = await request.json()

    if (!userText) {
      return NextResponse.json({ error: "User text is required" }, { status: 400 })
    }

    // Generar sessionId UNA SOLA VEZ con método más seguro
    // Usar crypto.randomUUID si está disponible (Node 16+), fallback a Date.now + random
    const finalSessionId = sessionId || (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `heygen_${crypto.randomUUID()}`
        : `heygen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    )

    // Generar respuesta con memoria conversacional usando el MISMO sessionId
    const botResponse = await generateResponseWithSession(userText, finalSessionId)

    return NextResponse.json({
      success: true,
      botResponse,
      sessionId: finalSessionId, // Devolver el MISMO sessionId usado
    })
  } catch (error) {
    console.error("Voice chat avatar API error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
