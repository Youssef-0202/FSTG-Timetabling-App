export default function AlgorithmsPage() {
    return (
        <>
            <div className="hero">
                <h1>Algorithmes d&apos;Optimisation</h1>
                <p>Comparez GA+SA et SBHH — en cours de développement</p>
            </div>
            <div className="page-content" style={{ paddingTop: 32 }}>
                <div className="table-card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 16, fontWeight: 800, color: "var(--navy)" }}>
                        Prochaine étape
                    </div>
                    <p>Interface de lancement GA+SA et SBHH avec comparaison live des courbes de fitness</p>
                </div>
            </div>
        </>
    );
}
