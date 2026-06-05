import { NextResponse } from 'next/server';

const API_BASE = "http://localhost:8000";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const res = await fetch(`${API_BASE}/filieres/${id}/stats`);
        if (!res.ok) return NextResponse.json({ error: "Stats non disponibles" }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
