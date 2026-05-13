"use client";
import React, { useState } from "react";
import { Cpu, Zap, BrainCircuit, Play, Settings2, CheckCircle2, Clock } from "lucide-react";
import { runAlgorithm } from "@/lib/api";

export default function AlgorithmsPage() {
    const [runningAlgo, setRunningAlgo] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, string[]>>({});

    const startSim = async (algo: "ga_sa" | "alns" | "rl") => {
        setRunningAlgo(algo);
        setLogs(prev => ({ ...prev, [algo]: [`[INFO] Lancement de l'algorithme ${algo.toUpperCase()}...`] }));

        try {
            await runAlgorithm(algo);
            setLogs(prev => ({ ...prev, [algo]: [...(prev[algo] || []), `[SUCCESS] ${algo.toUpperCase()} a terminé avec succès.`] }));
        } catch (error: any) {
            setLogs(prev => ({ ...prev, [algo]: [...(prev[algo] || []), `[ERROR] Échec : ${error.message || error}`] }));
        } finally {
            setRunningAlgo(null);
        }
    };

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
            <header style={{ padding: "30px 40px", background: "white", borderBottom: "1px solid #e2e8f0" }}>
                <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.5px" }}>
                    Centre d'Optimisation
                </h1>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
                    Contrôle et exécution des moteurs de résolution (GA-SA, ALNS, RL)
                </p>
            </header>

            <main style={{ padding: "40px", maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>

                {/* --- GA-SA --- */}
                <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", borderTop: "5px solid #3b82f6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ background: "#eff6ff", color: "#3b82f6", padding: 10, borderRadius: 10 }}>
                                <Cpu size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 800 }}>GA-SA Hybride</h3>
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: 4 }}>PRODUCTION READY</span>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
                        Algorithme Génétique sur-vitaminé par une double passe de Recuit Simulé. Stable et garanti de trouver une solution valide.
                    </p>
                    <button
                        onClick={() => startSim("ga_sa")} disabled={runningAlgo !== null}
                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: runningAlgo === "ga_sa" ? "#94a3b8" : "#3b82f6", color: "white", fontWeight: 800, cursor: runningAlgo !== null ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "0.2s" }}
                    >
                        {runningAlgo === "ga_sa" ? <Clock size={16} className="animate-spin" /> : <Play size={16} />}
                        {runningAlgo === "ga_sa" ? "Exécution en cours..." : "LANCER GA-SA"}
                    </button>
                    {logs["ga_sa"] && (
                        <div style={{ marginTop: 16, background: "#1e293b", color: "#93c5fd", padding: 12, borderRadius: 8, fontSize: "0.7rem", fontFamily: "monospace", maxHeight: 100, overflowY: "auto" }}>
                            {logs["ga_sa"].map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
                        </div>
                    )}
                </div>

                {/* --- ALNS --- */}
                <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", borderTop: "5px solid #14b8a6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ background: "#f0fdf4", color: "#14b8a6", padding: 10, borderRadius: 10 }}>
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 800 }}>ILS-ALNS</h3>
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: 4 }}>OPTIMISÉ</span>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
                        Adaptive Large Neighborhood Search. Utilise un pool d'heuristiques locales de destruction et réparation. Très rapide.
                    </p>
                    <button
                        onClick={() => startSim("alns")} disabled={runningAlgo !== null}
                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: runningAlgo === "alns" ? "#94a3b8" : "#14b8a6", color: "white", fontWeight: 800, cursor: runningAlgo !== null ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "0.2s" }}
                    >
                        {runningAlgo === "alns" ? <Clock size={16} className="animate-spin" /> : <Play size={16} />}
                        {runningAlgo === "alns" ? "Exécution en cours..." : "LANCER ALNS"}
                    </button>
                    {logs["alns"] && (
                        <div style={{ marginTop: 16, background: "#1e293b", color: "#5eead4", padding: 12, borderRadius: 8, fontSize: "0.7rem", fontFamily: "monospace", maxHeight: 100, overflowY: "auto" }}>
                            {logs["alns"].map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
                        </div>
                    )}
                </div>

                {/* --- RL --- */}
                <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", borderTop: "5px solid #8b5cf6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ background: "#f5f3ff", color: "#8b5cf6", padding: 10, borderRadius: 10 }}>
                                <BrainCircuit size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b", fontWeight: 800 }}>RL Controller</h3>
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", background: "#ede9fe", padding: "2px 6px", borderRadius: 4 }}>EXPÉRIMENTAL</span>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
                        Apprentissage par Renforcement. Agent IA autonome qui prend des décisions de placement basées sur un système de récompenses.
                    </p>
                    <button
                        onClick={() => startSim("rl")} disabled={runningAlgo !== null}
                        style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: runningAlgo === "rl" ? "#94a3b8" : "#8b5cf6", color: "white", fontWeight: 800, cursor: runningAlgo !== null ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "0.2s" }}
                    >
                        {runningAlgo === "rl" ? <Clock size={16} className="animate-spin" /> : <Play size={16} />}
                        {runningAlgo === "rl" ? "Apprentissage..." : "LANCER RL"}
                    </button>
                    {logs["rl"] && (
                        <div style={{ marginTop: 16, background: "#1e293b", color: "#c4b5fd", padding: 12, borderRadius: 8, fontSize: "0.7rem", fontFamily: "monospace", maxHeight: 100, overflowY: "auto" }}>
                            {logs["rl"].map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
