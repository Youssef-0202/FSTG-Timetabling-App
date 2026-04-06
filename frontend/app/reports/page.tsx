export default function ReportsPage() {
    return (
        <>
            <div className="hero">
                <h1>Rapports et Statistiques</h1>
                <p>Analyse des résultats algorithmiques — en cours de développement</p>
            </div>
            <div className="page-content" style={{ paddingTop: 32 }}>
                <div className="table-card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 16, fontWeight: 800, color: "var(--navy)" }}>
                        Prochaine étape
                    </div>
                    <p>Grid Search résultats, comparaison GA+SA vs SBHH, graphiques fitness</p>
                </div>
            </div>
        </>
    );
}
