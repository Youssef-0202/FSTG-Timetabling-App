"use client";

import Header from "@/components/admin/Header";

export default function TimetablePage() {
    return (
        <div className="space-y-8">
            <Header
                title="Emploi du Temps Interactif"
                description="Consultez et ajustez manuellement les affectations générées par le système."
                buttonLabel="Valider Plan"
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-20 flex items-center justify-center">
                <p className="text-gray-500 font-bold italic">Grille d'emploi du temps interactive en cours de développement...</p>
            </div>
        </div>
    );
}
