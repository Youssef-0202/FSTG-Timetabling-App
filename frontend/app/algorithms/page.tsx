"use client";
import React, { useState, useEffect } from "react";
import { Cpu, Zap, BrainCircuit, Play, Clock } from "lucide-react";
import { runAlgorithm } from "@/lib/api";
import { motion } from "framer-motion";

export default function AlgorithmsPage() {
    const [runningAlgo, setRunningAlgo] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, string[]>>({});
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/");
                setOnline(res.ok);
            } catch {
                setOnline(false);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, []);

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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}
        >
            <div className="sub-header" style={{ paddingBottom: "110px" }}>
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    Centre d&apos;Optimisation IA
                </motion.h1>
                <p>
                    Pilotage des moteurs de résolution par <span style={{ color: 'var(--gold)', fontWeight: 800 }}>MÉTA-HEURISTIQUES</span>
                    <span style={{ margin: "0 12px", opacity: 0.2 }}>|</span>
                    <span style={{ color: online ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: '0.75rem' }}>
                        ● {online ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
                    </span>
                </p>
            </div>

            <main style={{ padding: "0 40px 40px", maxWidth: 1600, margin: "-70px auto 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", position: "relative", zIndex: 10 }}>

                {/* --- GA-SA --- */}
                <div style={{ background: "white", borderRadius: "18px", padding: "28px", border: "1px solid #e2e8f0", borderTop: "6px solid #3b82f6", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)" }}>
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
                <div style={{ background: "white", borderRadius: "18px", padding: "28px", border: "1px solid #e2e8f0", borderTop: "6px solid #14b8a6", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)" }}>
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
                <div style={{ background: "white", borderRadius: "18px", padding: "28px", border: "1px solid #e2e8f0", borderTop: "6px solid #8b5cf6", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)" }}>
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
        </motion.div>
    );
}
