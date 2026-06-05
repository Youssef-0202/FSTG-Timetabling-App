"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Cpu, Zap, BrainCircuit, Play, Clock, ShieldCheck,
    Database, Users, Calendar, Lock, Save, Loader2,
    ChevronRight, AlertCircle, CheckCircle2, RefreshCw
} from "lucide-react";
import {
    runAlgorithm, getStats, getSections, getTDGroups,
    getSectionSanctuarizations, updateSectionSanctuarizations
} from "@/lib/api";
import { motion as m } from "framer-motion";

const DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];
const DAYS_SHORT = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

export default function AlgorithmsPage() {
    // ── Algo state ──────────────────────────────────────────
    const [runningAlgo, setRunningAlgo] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, string[]>>({});
    const [online, setOnline] = useState(true);

    // ── Data state ──────────────────────────────────────────
    const [stats, setStats] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [groups, setGroups] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ── Load data ───────────────────────────────────────────
    useEffect(() => {
        const checkStatus = async () => {
            try { const r = await fetch("http://127.0.0.1:8000/"); setOnline(r.ok); }
            catch { setOnline(false); }
        };
        checkStatus();
        const iv = setInterval(checkStatus, 10000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [s, sec] = await Promise.all([getStats(), getSections()]);
                setStats(s);
                setSections(sec);
                if (sec.length > 0) loadSection(sec[0]);
            } catch (e) { console.error(e); }
            finally { setLoadingData(false); }
        };
        load();
    }, []);

    const loadSection = async (section: any) => {
        setSelectedSection(section);
        setRules([]);
        try {
            const [g, r] = await Promise.all([
                getTDGroups(),
                getSectionSanctuarizations(section.id)
            ]);
            setGroups((g as any[]).filter((gr: any) => gr.section_id === section.id));
            setRules(r as any[]);
        } catch (e) { console.error(e); }
    };

    const toggleRule = (groupId: number, day: string, isMorning: boolean) => {
        setSaved(false);
        const exists = rules.find(r => r.group_id === groupId && r.day === day && r.is_morning === isMorning);
        if (exists) setRules(rules.filter(r => r !== exists));
        else setRules([...rules, { group_id: groupId, day, is_morning: isMorning }]);
    };

    const handleSave = async () => {
        if (!selectedSection) return;
        setSaving(true);
        try {
            await updateSectionSanctuarizations(selectedSection.id, rules);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { alert("Erreur lors de la sauvegarde."); }
        finally { setSaving(false); }
    };

    const startSim = async (algo: "ga_sa" | "alns" | "rl") => {
        setRunningAlgo(algo);
        setLogs(prev => ({ ...prev, [algo]: [`[INFO] Lancement de ${algo.toUpperCase()}...`] }));
        try {
            await runAlgorithm(algo);
            setLogs(prev => ({ ...prev, [algo]: [...(prev[algo] || []), `[SUCCESS] Terminé avec succès.`] }));
        } catch (error: any) {
            setLogs(prev => ({ ...prev, [algo]: [...(prev[algo] || []), `[ERROR] ${error.message}`] }));
        } finally { setRunningAlgo(null); }
    };

    const isBlocked = (groupId: number, day: string, isMorning: boolean) =>
        !!rules.find(r => r.group_id === groupId && r.day === day && r.is_morning === isMorning);

    return (
        <div style={{ background: "#f0f2f8", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

            {/* ── HERO HEADER ── */}
            <div style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)",
                padding: "90px 60px 50px", position: "relative", overflow: "hidden"
            }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%)" }} />
                <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <BrainCircuit size={32} color="#a5b4fc" />
                            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", margin: 0 }}>
                                Centre d'Optimisation IA
                            </h1>
                        </div>
                        <p style={{ color: "#a5b4fc", fontWeight: 600, margin: 0 }}>
                            Configurez les contraintes, validez les données, puis lancez l'algorithme
                            <span style={{ margin: "0 12px", opacity: 0.3 }}>|</span>
                            <span style={{ color: online ? "#34d399" : "#f87171", fontSize: "0.8rem" }}>
                                ● {online ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
                            </span>
                        </p>
                    </motion.div>
                </div>
            </div>

            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 60px 60px" }}>

                {/* ── SECTION 1 : KPIs ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <SectionTitle icon={<Database size={18} />} title="Intégrité des Données" subtitle="Vue d'ensemble de la base de données avant optimisation" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 40 }}>
                        <KPICard label="Séances à placer" value={stats?.total_assignments ?? "—"} icon={<Calendar size={20} />} color="#6366f1" />
                        <KPICard label="Enseignants" value={stats?.total_teachers ?? "—"} icon={<Users size={20} />} color="#0ea5e9" />
                        <KPICard label="Salles disponibles" value={stats?.total_rooms ?? "—"} icon={<Database size={20} />} color="#14b8a6" />
                        <KPICard label="Sections" value={stats?.total_sections ?? "—"} icon={<ShieldCheck size={20} />} color="#f59e0b" />
                        <KPICard
                            label="Indisponibilités Profs"
                            value={stats?.total_teacher_unavailability ?? 0}
                            icon={<Clock size={20} />}
                            color="#8b5cf6"
                            badge="CONTRAINTES"
                        />
                    </div>
                </motion.div>

                {/* ── SECTION 2 : SANCTUARISATION ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <SectionTitle
                        icon={<Lock size={18} />}
                        title="Sanctuarisation des Créneaux TP"
                        subtitle="Cochez les demi-journées bloquées pour chaque groupe. Ces règles seront injectées dans le moteur IA."
                        action={
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                                    borderRadius: 12, border: "none", background: saved ? "#10b981" : "#6366f1",
                                    color: "white", fontWeight: 800, cursor: "pointer", transition: "0.3s",
                                    boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
                                }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                                {saving ? "Sauvegarde..." : saved ? "Sauvegardé !" : "Appliquer les règles"}
                            </button>
                        }
                    />

                    <div style={{ display: "flex", gap: 20, background: "white", borderRadius: 24, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>

                        {/* Sections list */}
                        <div style={{ width: 220, flexShrink: 0 }}>
                            <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>Sections</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {loadingData ? (
                                    <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Chargement...</div>
                                ) : sections.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => loadSection(s)}
                                        style={{
                                            padding: "12px 14px", borderRadius: 12, border: "none", textAlign: "left",
                                            background: selectedSection?.id === s.id ? "#6366f1" : "#f8fafc",
                                            color: selectedSection?.id === s.id ? "white" : "#334155",
                                            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "0.15s",
                                            boxShadow: selectedSection?.id === s.id ? "0 4px 12px rgba(99,102,241,0.35)" : "none"
                                        }}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Matrix */}
                        <div style={{ flex: 1, overflowX: "auto" }}>
                            {groups.length === 0 ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontWeight: 600 }}>
                                    {loadingData ? "Chargement..." : "Sélectionnez une section"}
                                </div>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "3px" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>
                                                Groupe
                                            </th>
                                            {DAYS.map((d, i) => (
                                                <th key={d} colSpan={2} style={{ textAlign: "center", padding: "8px 4px", fontSize: "0.72rem", fontWeight: 800, color: "#475569", borderBottom: "3px solid #e2e8f0" }}>
                                                    {DAYS_SHORT[i]}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr>
                                            <th />
                                            {DAYS.map(d => (
                                                <React.Fragment key={d}>
                                                    <th style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, paddingBottom: 6, textAlign: "center" }}>Matin</th>
                                                    <th style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, paddingBottom: 6, textAlign: "center" }}>A-M</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map((g, gi) => (
                                            <tr key={g.id} style={{ background: gi % 2 === 0 ? "#f8fafc" : "white" }}>
                                                <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.82rem", color: "#1e293b", whiteSpace: "nowrap" }}>
                                                    {g.name}
                                                </td>
                                                {DAYS.map(d => (
                                                    <React.Fragment key={d}>
                                                        <td style={{ textAlign: "center", padding: "4px 3px" }}>
                                                            <button
                                                                onClick={() => toggleRule(g.id, d, true)}
                                                                title={`${g.name} — ${d} Matin`}
                                                                style={{
                                                                    width: 32, height: 32, borderRadius: 8, border: "none",
                                                                    cursor: "pointer", transition: "0.15s", display: "inline-flex",
                                                                    alignItems: "center", justifyContent: "center",
                                                                    background: isBlocked(g.id, d, true) ? "#ef4444" : "#f1f5f9",
                                                                    boxShadow: isBlocked(g.id, d, true) ? "0 2px 8px rgba(239,68,68,0.4)" : "none",
                                                                    transform: isBlocked(g.id, d, true) ? "scale(1.1)" : "scale(1)"
                                                                }}
                                                            >
                                                                {isBlocked(g.id, d, true) ? <Lock size={13} color="white" /> : <span style={{ fontSize: 8, color: "#cbd5e1" }}>○</span>}
                                                            </button>
                                                        </td>
                                                        <td style={{ textAlign: "center", padding: "4px 3px" }}>
                                                            <button
                                                                onClick={() => toggleRule(g.id, d, false)}
                                                                title={`${g.name} — ${d} Après-midi`}
                                                                style={{
                                                                    width: 32, height: 32, borderRadius: 8, border: "none",
                                                                    cursor: "pointer", transition: "0.15s", display: "inline-flex",
                                                                    alignItems: "center", justifyContent: "center",
                                                                    background: isBlocked(g.id, d, false) ? "#f97316" : "#f1f5f9",
                                                                    boxShadow: isBlocked(g.id, d, false) ? "0 2px 8px rgba(249,115,22,0.4)" : "none",
                                                                    transform: isBlocked(g.id, d, false) ? "scale(1.1)" : "scale(1)"
                                                                }}
                                                            >
                                                                {isBlocked(g.id, d, false) ? <Lock size={13} color="white" /> : <span style={{ fontSize: 8, color: "#cbd5e1" }}>○</span>}
                                                            </button>
                                                        </td>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Legend */}
                            <div style={{ display: "flex", gap: 20, marginTop: 20, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                                <LegendItem color="#ef4444" label="Bloqué Matin" />
                                <LegendItem color="#f97316" label="Bloqué Après-midi" />
                                <LegendItem color="#f1f5f9" label="Disponible" />
                                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>
                                    {rules.length} règle(s) active(s) pour {selectedSection?.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── SECTION 3 : ALGORITHMES ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <SectionTitle icon={<BrainCircuit size={18} />} title="Lancement de l'Optimisation" subtitle="Choisissez l'algorithme à exécuter. Les règles de sanctuarisation configurées ci-dessus seront appliquées." />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                        <AlgoCard
                            name="GA-SA Hybride"
                            tag="PRODUCTION READY"
                            tagColor="#16a34a"
                            tagBg="#dcfce7"
                            accentColor="#3b82f6"
                            icon={<Cpu size={26} />}
                            iconBg="#eff6ff"
                            iconColor="#3b82f6"
                            desc="Algorithme Génétique sur-vitaminé par une double passe de Recuit Simulé. Stable, rapide, garanti de trouver une solution valide."
                            running={runningAlgo === "ga_sa"}
                            disabled={runningAlgo !== null}
                            logs={logs["ga_sa"]}
                            logColor="#93c5fd"
                            onLaunch={() => startSim("ga_sa")}
                        />
                        <AlgoCard
                            name="ILS-ALNS"
                            tag="OPTIMISÉ"
                            tagColor="#d97706"
                            tagBg="#fef3c7"
                            accentColor="#14b8a6"
                            icon={<Zap size={26} />}
                            iconBg="#f0fdf4"
                            iconColor="#14b8a6"
                            desc="Adaptive Large Neighborhood Search. Pool d'heuristiques de destruction et réparation. Convergence rapide sur des problèmes complexes."
                            running={runningAlgo === "alns"}
                            disabled={runningAlgo !== null}
                            logs={logs["alns"]}
                            logColor="#5eead4"
                            onLaunch={() => startSim("alns")}
                        />
                        <AlgoCard
                            name="RL-ALNS Fusionné"
                            tag="EXPÉRIMENTAL"
                            tagColor="#7c3aed"
                            tagBg="#ede9fe"
                            accentColor="#8b5cf6"
                            icon={<BrainCircuit size={26} />}
                            iconBg="#f5f3ff"
                            iconColor="#8b5cf6"
                            desc="Apprentissage par Renforcement + ALNS. L'agent IA gère les macro-décisions via Q-Learning. Curriculum Learning 3 phases."
                            running={runningAlgo === "rl"}
                            disabled={runningAlgo !== null}
                            logs={logs["rl"]}
                            logColor="#c4b5fd"
                            onLaunch={() => startSim("rl")}
                            recommended
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────

function SectionTitle({ icon, title, subtitle, action }: any) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, marginTop: 40 }}>
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ color: "#6366f1" }}>{icon}</div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1e293b", margin: 0 }}>{title}</h2>
                </div>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem", fontWeight: 600 }}>{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

function KPICard({ label, value, icon, color, badge }: any) {
    return (
        <div style={{
            background: "white", borderRadius: 20, padding: "20px 24px",
            border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            borderLeft: `5px solid ${color}`
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ padding: 8, background: `${color}15`, borderRadius: 10, color }}>{icon}</div>
                {badge && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, background: "#dcfce7", color: "#16a34a", padding: "3px 8px", borderRadius: 6 }}>
                        {badge}
                    </span>
                )}
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#1e293b", margin: "12px 0 4px" }}>{value}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
        </div>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: color }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{label}</span>
        </div>
    );
}

function AlgoCard({ name, tag, tagColor, tagBg, accentColor, icon, iconBg, iconColor, desc, running, disabled, logs, logColor, onLaunch, recommended }: any) {
    return (
        <div style={{
            background: "white", borderRadius: 24, padding: 28,
            border: recommended ? `2px solid ${accentColor}` : "1px solid #e2e8f0",
            borderTop: `6px solid ${accentColor}`,
            boxShadow: recommended ? `0 12px 30px -5px ${accentColor}30` : "0 4px 20px rgba(0,0,0,0.05)",
            position: "relative"
        }}>
            {recommended && (
                <div style={{ position: "absolute", top: -14, right: 20, background: accentColor, color: "white", fontSize: "0.65rem", fontWeight: 900, padding: "4px 12px", borderRadius: 20 }}>
                    ★ RECOMMANDÉ
                </div>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <div style={{ background: iconBg, color: iconColor, padding: 10, borderRadius: 12 }}>{icon}</div>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900, color: "#1e293b" }}>{name}</h3>
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: tagColor, background: tagBg, padding: "2px 7px", borderRadius: 5 }}>{tag}</span>
                </div>
            </div>
            <p style={{ fontSize: "0.83rem", color: "#64748b", marginBottom: 22, lineHeight: 1.6 }}>{desc}</p>
            <button
                onClick={onLaunch}
                disabled={disabled}
                style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none",
                    background: disabled ? "#e2e8f0" : accentColor,
                    color: disabled ? "#94a3b8" : "white",
                    fontWeight: 800, fontSize: "0.9rem",
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                    transition: "0.2s",
                    boxShadow: disabled ? "none" : `0 4px 12px ${accentColor}50`
                }}
            >
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? "Exécution en cours..." : `LANCER ${name.toUpperCase()}`}
            </button>
            {logs && (
                <div style={{ marginTop: 12, background: "#0f172a", color: logColor, padding: "10px 12px", borderRadius: 10, fontSize: "0.68rem", fontFamily: "monospace", maxHeight: 80, overflowY: "auto" }}>
                    {logs.map((l: string, i: number) => <div key={i} style={{ marginBottom: 3 }}>{l}</div>)}
                </div>
            )}
        </div>
    );
}
