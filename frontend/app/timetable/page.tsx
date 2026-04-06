export default function TimetablePage() {
    return (
        <>
            <div className="hero">
                <h1>Emploi du Temps</h1>
                <p>Visualisation interactive et modification manuelle — en cours de développement</p>
            </div>
            <div className="page-content" style={{ paddingTop: 32 }}>
                <div className="table-card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 16, fontWeight: 800, color: "var(--navy)" }}>
                        Prochaine étape
                    </div>
                    <p>Vue hebdomadaire avec drag-and-drop et verrouillage de créneaux (contrainte H12)</p>
                </div>
            </div>
        </>
    );
}
