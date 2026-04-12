"use client";
import { useState } from "react";
import {
    Cpu, Zap, Activity, BarChart3, Settings2, Play,
    StopCircle, Trash2, CheckCircle2, FlaskConical
} from "lucide-react";

export default function AlgorithmsPage() {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);

    const startSim = () => {
        setRunning(true);
        setProgress(0);
        const inv = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(inv);
                    setRunning(false);
                    return 100;
                }
                return p + 2;
            });
        }, 100);
    };

    return (
        <>
            <div className="hero">
                <h1>Centre d&apos;Optimisation</h1>
                <p>Moteurs de résolution - Hybride (GA+SA) vs Sélection (SBHH)</p>
            </div>

            <div className="page-content" style={{ marginTop: "-30px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* Algorithme 1: GA + SA */}
                    <div className="table-card" style={{ padding: 24, borderTop: "5px solid var(--blue)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <div style={{ background: "#e0f2fe", color: "var(--blue)", padding: 10, borderRadius: 10 }}>
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1rem", color: "var(--navy)" }}>GA + SA Hybride</h3>
                                    <span className="badge badge-cm" style={{ fontSize: "0.65rem" }}>PRODUCTION READY</span>
                                </div>
                            </div>
                            <Activity size={20} color="var(--border)" />
                        </div>

                        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>
                            Algorithme Génétique sur-vitaminé par une double passe de Recuit Simulé.
                            Idéal pour les contraintes de salles complexes de la FSTG.
                        </p>

                        <div style={{ background: "var(--bg)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase" }}>Paramètres Recommandés</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div style={{ fontSize: "0.8rem" }}>⚡ Population: <b>50</b></div>
                                <div style={{ fontSize: "0.8rem" }}>🔥 Générations: <b>100</b></div>
                                <div style={{ fontSize: "0.8rem" }}>🧬 Mutation: <b>0.25</b></div>
                                <div style={{ fontSize: "0.8rem" }}>❄️ SA Iter: <b>40</b></div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={startSim} disabled={running}>
                                {running ? "CALCUL EN COURS..." : <><Play size={14} /> LANCER GA+SA</>}
                            </button>
                            <button className="btn btn-outline"><Settings2 size={14} /></button>
                        </div>
                    </div>

                    {/* Algorithme 2: SBHH */}
                    <div className="table-card" style={{ padding: 24, borderTop: "5px solid var(--teal)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <div style={{ background: "#f0fdf4", color: "var(--teal)", padding: 10, borderRadius: 10 }}>
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1rem", color: "var(--navy)" }}>SBHH</h3>
                                    <span className="badge badge-td" style={{ fontSize: "0.65rem" }}>EXPERIMENTAL</span>
                                </div>
                            </div>
                            <BarChart3 size={20} color="var(--border)" />
                        </div>

                        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>
                            Selection-Based Hyper-Heuristic. Utilise un pool d&apos;heuristiques locales
                            pour naviguer dans l&apos;espace de recherche. Très rapide mais sensible aux minima.
                        </p>

                        <div style={{ background: "var(--bg)", padding: 16, borderRadius: 10, marginBottom: 20 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase" }}>Analyse Comparative</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                    <span>Vitesse convergence</span>
                                    <span style={{ color: "var(--teal)", fontWeight: 700 }}>+40%</span>
                                </div>
                                <div style={{ height: 4, background: "#fff", borderRadius: 2 }}>
                                    <div style={{ width: "90%", height: "100%", background: "var(--teal)", borderRadius: 2 }}></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-outline" style={{ flex: 1, borderColor: "var(--teal)", color: "var(--teal)" }}>
                                <FlaskConical size={14} /> TEST ALNS (V3)
                            </button>
                            <button className="btn btn-outline" title="Nettoyer planning actuel"><Trash2 size={14} /></button>
                        </div>
                    </div>

                </div>

                {/* Zone de logs / Résultat */}
                {(running || progress > 0) && (
                    <div className="table-card" style={{ marginTop: 20, padding: 20, background: "#1c2a45", color: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Simulation GA+SA (Phase d&apos;Optimisation)</div>
                            <div style={{ fontSize: "0.85rem" }}>{progress}%</div>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 15, overflow: "hidden" }}>
                            <div style={{ width: `${progress}%`, height: "100%", background: "var(--gold)", transition: "width 0.2s" }}></div>
                        </div>
                        <div style={{ fontFamily: "monospace", fontSize: "0.7rem", opacity: 0.7, height: "60px", overflowY: "hidden" }}>
                            {progress > 10 && <div>[INFO] Génération 12: Fitness = 0.84, Hard Violations = 2</div>}
                            {progress > 50 && <div>[INFO] Simulated Annealing appliqué...</div>}
                            {progress > 80 && <div>[SUCCESS] Solution trouvée avec H=0 !</div>}
                            {progress === 100 && <div style={{ color: "var(--teal)", marginTop: 4 }}>🏁 Exportation des [41 modules] vers la DB terminée.</div>}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
