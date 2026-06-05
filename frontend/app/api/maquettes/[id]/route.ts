import { NextResponse } from 'next/server';

const API_BASE = "http://localhost:8000";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        
        // Fetch from FastAPI
        const res = await fetch(`${API_BASE}/filieres/${id}`);
        
        if (!res.ok) {
            return NextResponse.json({ success: false, error: "Filière non trouvée sur le backend" }, { status: res.status });
        }
        
        const data = await res.json();
        
        // On peut ajouter des stats ici si besoin
        const stats = {
            total_sections: data.sections?.length || 0,
            total_modules: data.modules?.length || 0,
            received: true // Mock
        };
        
        return NextResponse.json({ 
            success: true, 
            maquette: data,
            stats: stats
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
