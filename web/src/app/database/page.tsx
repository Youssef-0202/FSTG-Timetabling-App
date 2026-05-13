"use client";

import Header from "@/components/admin/Header";

export default function DatabasePage() {
    return (
        <div className="space-y-8">
            <Header
                title="Base de Données"
                description="Gérez les enseignants, les salles, les modules et les contraintes de l'FSTG."
                buttonLabel="Ajouter Professeur"
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-20 flex items-center justify-center">
                <p className="text-gray-500 font-bold italic">Interface de gestion des données en cours de développement...</p>
            </div>
        </div>
    );
}
