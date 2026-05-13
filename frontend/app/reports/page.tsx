"use client";
import React, { useEffect, useState } from "react";
import { FileText, Clock } from "lucide-react";

export default function ReportsPage() {
    const [reports, setReports] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/reports")
            .then(res => res.json())
            .then(data => {
                setReports(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur de chargement", err);
                setLoading(false);
            });
    }, []);

    const parseLogText = (text: string) => {
        if (!text || text === "Rapport introuvable.") return null;

        // Simple extraction pour rendre l'UI plus premium
        const lines = text.split('\n');
        const params: Record<string, string> = {};
        const stats: Record<string, string> = {};
        const conflicts: Record<string, string> = {};

        let section = "";

        lines.forEach(line => {
            if (line.includes("PARAMETRES DE L'ALGORITHME :")) section = "params";
            else if (line.includes("STATISTIQUES DE LA BASE DE DONNEES :")) section = "stats";
            else if (line.includes("DETAIL DES CONFLITS")) section = "conflicts";
            else if (line.includes("==================") || line.includes("------------------")) {
                // Ignore separators
            }
            else {
                const match = line.match(/^\s*-\s*([^:]+):\s*(.+)$/);
                if (match) {
                    const key = match[1].trim();
                    const val = match[2].trim();
                    if (section === "params") params[key] = val;
                    if (section === "stats") stats[key] = val;
                    if (section === "conflicts") conflicts[key] = val;
                }
            }
        });

        return { params, stats, conflicts, raw: text };
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                <Clock className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    const ReportCard = ({ title, algoKey, color }: { title: string, algoKey: string, color: string }) => {
        const data = parseLogText(reports[algoKey]);

        return (
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: color }}></div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>{title}</h3>
                </div>

                <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                    {data ? (
                        <>
                            {Object.keys(data.params).length > 0 && (
                                <div>
                                    <h4 style={{ margin: "0 0 12px", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Configuration Initiale</h4>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                        {Object.entries(data.params).map(([k, v]) => (
                                            <div key={k} style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: 8, fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ color: "#64748b", fontWeight: 500 }}>{k}</span>
                                                <span style={{ color: "#0f172a", fontWeight: 700 }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Object.keys(data.conflicts).length > 0 && (
                                <div style={{ background: "#fff1f2", borderRadius: 12, border: "1px solid #ffe4e6", padding: 16 }}>
                                    <h4 style={{ margin: "0 0 12px", fontSize: "0.75rem", fontWeight: 800, color: "#e11d48", textTransform: "uppercase", letterSpacing: "0.5px" }}>Analyse des Conflits</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {Object.entries(data.conflicts).map(([k, v]) => (
                                            <div key={k} style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                                                <span style={{ color: "#be123c", fontWeight: 600 }}>{k}</span>
                                                <span style={{ color: "#9f1239", fontWeight: 800 }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 style={{ margin: "0 0 12px", fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Logs Bruts</h4>
                                <pre style={{ margin: 0, padding: 16, background: "#0f172a", color: "#e2e8f0", borderRadius: 12, fontSize: "0.7rem", fontFamily: "monospace", overflowX: "auto", maxHeight: 200, overflowY: "auto", border: "1px solid #1e293b", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                    {data.raw}
                                </pre>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                            <FileText size={48} strokeWidth={1} style={{ opacity: 0.5, marginBottom: 12 }} />
                            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>Aucun rapport généré</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
            <header style={{ padding: "30px 40px", background: "white", borderBottom: "1px solid #e2e8f0" }}>
                <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.5px" }}>
                    Rapports d'Execution
                </h1>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
                    Analyse détaillée des performances des derniers moteurs d'optimisation IA
                </p>
            </header>

            <main style={{ padding: "40px", maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                <ReportCard title="Rapport GA-SA Hybride" algoKey="ga_sa" color="#3b82f6" />
                <ReportCard title="Rapport ILS-ALNS" algoKey="alns" color="#14b8a6" />
                <ReportCard title="Rapport RL Controller" algoKey="rl" color="#8b5cf6" />
            </main>
        </div>
    );
}
