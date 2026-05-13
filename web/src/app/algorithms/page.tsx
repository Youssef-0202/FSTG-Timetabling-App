"use client";

import Header from "@/components/admin/Header";

export default function AlgorithmsPage() {
    return (
        <div className="space-y-8">
            <Header
                title="Contrôle des Algorithmes"
                description="Pilotez les solveurs ILS-ALNS et RL-SBHH pour générer des emplois du temps optimaux."
                buttonLabel="Lancer Optimisation"
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-20 flex items-center justify-center">
                <p className="text-gray-500 font-bold italic">Module de contrôle des solveurs en cours de développement...</p>
            </div>
        </div>
    );
}
