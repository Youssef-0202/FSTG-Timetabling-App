"use client";

import Header from "@/components/admin/Header";

export default function ReportsPage() {
    return (
        <div className="space-y-8">
            <Header
                title="Rapports d'Analyse"
                description="Visualisez les statistiques de confort pédagogique et les taux d'occupation."
                buttonLabel="Exporter PDF"
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-20 flex items-center justify-center">
                <p className="text-gray-500 font-bold italic">Générateur de rapports en cours de développement...</p>
            </div>
        </div>
    );
}
