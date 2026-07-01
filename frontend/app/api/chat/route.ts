import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json(
        { error: "Le message ne peut pas être vide." },
        { status: 400 }
      );
    }

    // Agent FastAPI URL
    const FASTAPI_URL = process.env.CHAT_AGENT_URL || "http://127.0.0.1:8005/chat";

    // Appel au serveur FastAPI Python
    const response = await fetch(FASTAPI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: message, history }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Erreur de communication avec le serveur de l'agent IA." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      answer: data.answer,
      route: data.route,
      sql: data.sql_query,
      durationMs: data.duration_ms,
    });
  } catch (error: any) {
    console.error("Erreur API Chat Proxy:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du traitement du message." },
      { status: 500 }
    );
  }
}
