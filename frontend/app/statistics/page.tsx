"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity, Users, MapPin, BookOpen, Clock,
    ChevronRight, Info, AlertTriangle, CheckCircle2,
    PieChart as PieIcon, BarChart3, TrendingUp, Zap, HelpCircle
} from "lucide-react";
import {
    getTeachers, getRooms, getTimeslots, getSections, getMasterReference,
    Teacher, Room, Timeslot, Section, TimetableResult, Assignment, ModulePart, getModuleParts,
    auditSection, AuditResult,
    getTPSanctuarizationsCount, getMasterAudit
} from "@/lib/api";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

// ─── Design System Colors ───
const COLORS = [
    { name: 'Navy', hex: '#0b1f4b' },
    { name: 'Gold', hex: '#e8a020' },
    { name: 'Teal', hex: '#1a9e7a' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Sky', hex: '#3dbde4' },
    { name: 'Danger', hex: '#ef4444' }
];

const COLORS_SEQ = ['#0b1f4b', '#e8a020', '#1a9e7a', '#3b82f6', '#8b5cf6', '#3dbde4'];

// ─── Types ───
type TabType = 'kpi' | 'rooms' | 'teachers' | 'pedagogy' | 'distribution' | 'modeling';

export default function StatisticsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('kpi');
    const [loading, setLoading] = useState(true);
    const [master, setMaster] = useState<TimetableResult | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [parts, setParts] = useState<ModulePart[]>([]);
    const [realAudits, setRealAudits] = useState<AuditResult[]>([]);
    const [count_tp, setCountTps] = useState<any>();
    const [masterRadarData, setMasterRadarData] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const [m, t, r, ts, s, p, { count_tp }, mRadar] = await Promise.all([
                    getMasterReference(),
                    getTeachers(),
                    getRooms(),
                    getTimeslots(),
                    getSections(),
                    getModuleParts(),
                    getTPSanctuarizationsCount(),
                    getMasterAudit()
                ]);

                setMasterRadarData(mRadar);
                setCountTps(count_tp)
                setMaster(m);
                setTeachers(t);
                setRooms(r);
                setTimeslots(ts);
                setSections(s);
                setParts(p);

                if (m) {
                    const mode = m.algo_type || "interactive";
                    const audits = await Promise.all(s.map(sec => auditSection(sec.id, mode)));
                    setRealAudits(audits);
                }
            } catch (err) {
                console.error("Failed to load statistics data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // ─── Process Data ───
    const stats = useMemo(() => {
        if (!master || !master.data) return null;
        const assignments: Assignment[] = master.data;

        // 1. Distribution Mixed (Pie)
        const typeCount = { CM: 0, TD: 0, TP: count_tp };
        assignments.forEach(a => {
            const part = parts.find(p => p.id === a.module_part_id);
            if (part) {
                if (part.type === 'CM') typeCount.CM++;
                else if (part.type === 'TD') typeCount.TD++;
            }
        });
        const distributionData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

        // 2. Room Occupation
        const roomOcc = rooms.map(r => {
            const count = assignments.filter(a => a.room_id === r.id).length;
            const percentage = Math.round((count / (timeslots.length || 1)) * 100);
            return { name: r.name, value: percentage, type: r.type, count };
        });
        const topOccupiedRooms = [...roomOcc].sort((a, b) => b.value - a.value).slice(0, 10);

        const typeAvg = rooms.reduce((acc: any, r) => {
            if (!acc[r.type]) acc[r.type] = { total: 0, count: 0 };
            const occ = roomOcc.find(ro => ro.name === r.name)?.value || 0;
            acc[r.type].total += occ;
            acc[r.type].count++;
            return acc;
        }, {});
        const roomTypeData = Object.entries(typeAvg).map(([name, val]: any) => ({
            name,
            value: Math.round(val.total / val.count)
        }));

        const capSats = { small: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, large: { total: 0, count: 0 } };
        rooms.forEach(r => {
            const occCount = assignments.filter(a => a.room_id === r.id).length;
            const saturation = (occCount / (timeslots.length || 1)) * 100;
            if (r.capacity <= 60) { capSats.small.total += saturation; capSats.small.count++; }
            else if (r.capacity <= 150) { capSats.medium.total += saturation; capSats.medium.count++; }
            else { capSats.large.total += saturation; capSats.large.count++; }
        });

        const capacityUsageData = [
            { name: 'Petites (<60)', value: Math.round(capSats.small.total / (capSats.small.count || 1)) },
            { name: 'Moyennes (60-150)', value: Math.round(capSats.medium.total / (capSats.medium.count || 1)) },
            { name: 'Amphis (>150)', value: Math.round(capSats.large.total / (capSats.large.count || 1)) },
        ];

        const teacherLoad = teachers.filter(t => t.name.toUpperCase() !== "PROF").map(t => ({
            name: t.name.split(' ').slice(-1)[0],
            fullName: `Pr. ${t.name}`,
            hours: assignments.filter(a => a.teacher_id === t.id).length * 2
        })).sort((a, b) => b.hours - a.hours).slice(0, 15);

        const dayDist = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"].map(day => ({
            name: day,
            value: assignments.filter(a => timeslots.find(t => t.id === a.slot_id)?.day.toUpperCase() === day).length
        }));

        const sectionVolumeData = sections.map(s => {
            const sAsgns = assignments.filter(a => a.section_id === s.id || (a.td_groups && a.td_groups.some(g => g.section_id === s.id)));
            const cmCount = sAsgns.filter(a => parts.find(p => p.id === a.module_part_id)?.type === 'CM').length;
            return { name: s.name, CM: cmCount, TD_TP: sAsgns.length - cmCount };
        }).sort((a, b) => (b.CM + b.TD_TP) - (a.CM + a.TD_TP)).slice(0, 10);

        // 5. Audit Results (API Officielle)
        const auditSections = realAudits.map(ra => ({
            name: ra.section || "N/A",
            score: ra.score || 0,
            compacite: ra.details?.gaps ?? 0,
            lunch: ra.details?.lunch ?? 0,
            fatigue: ra.details?.fatigue ?? 0,
            stability: ra.details?.stability ?? 0
        })).sort((a, b) => a.score - b.score);

        const studentCompacity = auditSections.map(a => ({ name: a.name, score: Math.round(a.score) }));

        // 5.1 Radar Data - UTILISATION DES CHIFFRES DU BACKEND (88.7, 62.5, etc.)
        const radarData = [
            { subject: 'Compacité', A: masterRadarData?.compacite || 0, fullMark: 100 },
            { subject: 'Pause Midi', A: masterRadarData?.pause_dejeuner || 0, fullMark: 100 },
            { subject: 'Rythme & Samedi', A: masterRadarData?.rythme_fatigue || 0, fullMark: 100 },
            { subject: 'Pédagogie CM', A: masterRadarData?.pedagogie_cm || 0, fullMark: 100 },
        ];

        const avgGlobalScore = masterRadarData ? Math.round((masterRadarData.compacite + masterRadarData.pause_dejeuner + masterRadarData.rythme_fatigue + masterRadarData.pedagogie_cm) / 4) : 0;

        return { distributionData, roomOcc, roomTypeData, topOccupiedRooms, teacherLoad, dayDist, studentCompacity, capacityUsageData, radarData, sectionVolumeData, avgGlobalScore };
    }, [master, teachers, rooms, timeslots, sections, parts, realAudits, count_tp, masterRadarData]);

    if (loading) {
        return (
            <div className="loading-container" style={{ height: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Activity size={48} color="#e8a020" />
                </motion.div>
            </div>
        );
    }

    if (!master || !stats) {
        return (
            <div className="error-view" style={{ padding: '100px', textAlign: 'center' }}>
                <AlertTriangle size={64} color="#ef4444" style={{ margin: '0 auto 20px' }} />
                <h2>Aucune Master Reference trouvée</h2>
                <p>Veuillez d'abord valider une solution dans la page Rapports.</p>
            </div>
        );
    }

    const TABS = [
        { id: 'kpi', label: 'Indicateurs Clés', Icon: Zap },
        { id: 'rooms', label: 'Occupation Salles', Icon: MapPin },
        { id: 'teachers', label: 'Charge Enseignante', Icon: Users },
        { id: 'pedagogy', label: 'Bilan Pédagogique', Icon: BookOpen },
        { id: 'distribution', label: 'Mix Technique', Icon: BarChart3 },
        { id: 'modeling', label: 'Modélisation', Icon: Info }
    ];

    return (
        <div className="statistics-page-layout">
            <style jsx>{`
                .statistics-page-layout {
                    display: flex;
                    height: 100vh;
                    margin-top: 0;
                    background: var(--bg);
                }
                .sidebar-stats {
                    width: 280px;
                    background: var(--white);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    padding: 85px 16px 24px;
                    gap: 12px;
                    z-index: 50;
                }
                .sidebar-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--navy);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding-left: 10px;
                }
                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 14px;
                    border: none;
                    background: transparent;
                    color: var(--muted);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: left;
                    font-size: 0.9rem;
                }
                .tab-btn:hover {
                    background: rgba(11, 31, 75, 0.05);
                    color: var(--navy);
                }
                .tab-btn.active {
                    background: var(--navy);
                    color: var(--white);
                    box-shadow: 0 8px 16px rgba(11, 31, 75, 0.2);
                }
                .main-stats-view {
                    flex: 1;
                    padding: 85px 40px 40px;
                    overflow-y: auto;
                    background: radial-gradient(at 100% 0%, rgba(232, 160, 32, 0.03) 0px, transparent 50%);
                }
                .view-header {
                    margin-bottom: 40px;
                }
                .view-header h2 {
                    font-size: 2.2rem;
                    font-weight: 900;
                    color: var(--navy);
                    margin-bottom: 8px;
                    letter-spacing: -1px;
                }
                .view-header p {
                    color: var(--muted);
                    font-weight: 500;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 30px;
                }
                .glass-chart-card {
                    background: var(--white);
                    border-radius: 24px;
                    padding: 30px;
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .chart-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--navy);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .kpi-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .kpi-box {
                    background: var(--white);
                    padding: 24px;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-sm);
                    text-align: center;
                }
                .kpi-value {
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: var(--navy);
                    font-family: 'Outfit', sans-serif;
                }
                .kpi-label {
                    color: var(--muted);
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-top: 4px;
                }
                .badge-health {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 100px;
                    font-size: 0.75rem;
                    font-weight: 800;
                }
                .badge-health.ok { background: #dcfce7; color: #166534; }
                .badge-health.warn { background: #fef9c3; color: #854d0e; }
            `}</style>

            <aside className="sidebar-stats">
                <div className="sidebar-title">
                    <TrendingUp size={24} color="#e8a020" />
                    <span>Statistiques IA</span>
                </div>
                <div style={{ flex: 1 }}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as TabType)}
                        >
                            <tab.Icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: '16px', background: 'rgba(11, 31, 75, 0.03)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '8px' }}>
                        <Info size={14} /> Source des Données
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                        Analyse basée sur la version <strong>{master.name}</strong> élue Master Reference le {new Date(master.created_at).toLocaleDateString()}.
                    </p>
                </div>
            </aside >

            <main className="main-stats-view">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <header className="view-header">
                            <h2>{TABS.find(t => t.id === activeTab)?.label}</h2>
                            <p>Analyse de performance et optimisation des ressources du Master Reference.</p>
                        </header>

                        {activeTab === 'kpi' && (
                            <>
                                <div className="kpi-row">
                                    <div className="kpi-box">
                                        <div className="kpi-value">{master.score_hard === 0 ? "100%" : "FAIL"}</div>
                                        <div className="kpi-label">Intégrité des Contraintes</div>
                                        <div className={`badge-health ${master.score_hard === 0 ? 'ok' : 'warn'}`} style={{ marginTop: '10px' }}>
                                            {master.score_hard === 0 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                            {master.score_hard === 0 ? "Audit Hard OK" : "Contraintes Violées"}
                                        </div>
                                    </div>
                                    <div className="kpi-box">
                                        <div className="kpi-value">{master.data ? master.data.length : 0}</div>
                                        <div className="kpi-label">Séances Planifiées</div>
                                        <div className="badge-health ok" style={{ marginTop: '10px', background: '#e0f2fe', color: '#0369a1' }}>
                                            <Activity size={12} /> Couverture Totale
                                        </div>
                                    </div>
                                    <div className="kpi-box">
                                        <div className="kpi-value" style={{ color: '#8b5cf6' }}>{Math.max(0, 100 - Math.round(master.score_soft / 4))}%</div>
                                        <div className="kpi-label">Satisfaction Pédagogique</div>
                                        <div className="badge-health ok" style={{ marginTop: '10px', background: '#f3e8ff', color: '#7e22ce' }}>
                                            <HelpCircle size={12} /> Score Meta : {Math.round(master.score_soft)}
                                        </div>

                                    </div>
                                </div>

                                <div className="stats-grid">
                                    <div className="glass-chart-card">
                                        <div className="chart-title">
                                            <span>Couverture Hebdomadaire (par jour)</span>
                                            <Clock size={18} color="#64748b" />
                                        </div>
                                        <div style={{ height: 300, width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats.dayDist}>
                                                    <defs>
                                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'Outfit' }}
                                                    />
                                                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="glass-chart-card">
                                        <div className="chart-title">
                                            <span>Volume de Séances par Cohorte</span>
                                            <Activity size={18} color="#64748b" />
                                        </div>
                                        <div style={{ height: 300, width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.sectionVolumeData}>
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Legend iconType="circle" />
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <Bar dataKey="CM" name="Cours (CM)" stackId="a" fill="var(--navy)" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="TD_TP" name="TP / TD" stackId="a" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'rooms' && (
                            <div className="stats-grid">
                                <div className="glass-chart-card" style={{ gridColumn: 'span 2' }}>
                                    <div className="chart-title">Saturation des Salles par Type (%)</div>
                                    <div style={{ height: 350, width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.roomTypeData} layout="vertical" margin={{ left: 50 }}>
                                                <XAxis type="number" hide />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 700 }} />
                                                <Tooltip cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="value" fill="#0b1f4b" radius={[0, 10, 10, 0]} label={{ position: 'right', formatter: (v: any) => `${v}%`, fontSize: 12, fontWeight: 800 }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="glass-chart-card">
                                    <div className="chart-title">Top 10 Salles Surchargées</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {stats.topOccupiedRooms.map((room, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--navy)', width: '60px' }}>{room.name}</span>
                                                <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${room.value}%` }}
                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                        style={{ height: '100%', background: room.value > 80 ? 'var(--danger)' : 'var(--teal)', borderRadius: '10px' }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>{room.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="glass-chart-card">
                                    <div className="chart-title">Saturation par Gabarit (%)</div>
                                    <div style={{ height: 350, width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.capacityUsageData} layout="vertical" margin={{ left: 60 }}>
                                                <XAxis type="number" domain={[0, 100]} hide />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} width={120} />
                                                <Tooltip formatter={(val: any) => [`${val}%`, "Occupation"]} />
                                                <Bar dataKey="value" fill="var(--gold)" radius={[0, 10, 10, 0]} label={{ position: 'right', formatter: (v: any) => `${v}%`, fontWeight: 800 }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>
                                        % moyen de temps d'utilisation par catégorie de salle.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'teachers' && (
                            <div className="glass-chart-card">
                                <div className="chart-title">Charge Horaire Hebdomadaire (Profs)</div>
                                <div style={{ height: 500, width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.teacherLoad} margin={{ top: 20 }}>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} />
                                            <YAxis axisLine={false} tickLine={false} label={{ value: 'Heures / Semaine', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                                            <Tooltip
                                                formatter={(value, name, props) => [
                                                    `${value}h`,
                                                    props.payload.fullName
                                                ]}
                                            />
                                            <Bar dataKey="hours" fill="#e8a020" radius={[10, 10, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pedagogy' && (
                            <div className="stats-grid">
                                <div className="glass-chart-card">
                                    <div className="chart-title">Qualité Pédagogique Globale</div>
                                    <div style={{ height: 350, width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--navy)', fontSize: 10, fontWeight: 700 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                                <Radar
                                                    name="Score"
                                                    dataKey="A"
                                                    stroke="var(--gold)"
                                                    fill="var(--gold)"
                                                    fillOpacity={0.6}
                                                />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>
                                        Analyse multicritère de la satisfaction des contraintes Soft.
                                    </p>
                                </div>
                                <div className="glass-chart-card">
                                    <div className="chart-title">Audit Qualité par Filière (%)</div>
                                    <div style={{ padding: '20px', borderRadius: '20px', background: 'rgba(11, 31, 75, 0.05)', display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--navy)' }}>
                                            {stats.avgGlobalScore}%
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
                                            Score satisfaction qualité globale (Moyenne).
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {stats.studentCompacity.slice(0, 10).map((sec, i) => (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                                                    <span style={{ color: 'var(--navy)' }}>{sec.name}</span>
                                                    <span style={{ color: sec.score < 70 ? 'var(--danger)' : 'var(--teal)' }}>{sec.score}%</span>
                                                </div>
                                                <div style={{ height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '10px' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${sec.score}%`,
                                                        background: sec.score < 70 ? 'var(--danger)' : 'var(--teal)',
                                                        borderRadius: '10px',
                                                        transition: 'width 1s ease-out'
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'distribution' && (
                            <div className="glass-chart-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <div className="chart-title">Mix Pédagogique (CM/TD/TP)</div>
                                <div style={{ height: 400, width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.distributionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={150}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {stats.distributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS_SEQ[index + 1 % COLORS_SEQ.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                    Répartition des séances par type de pédagogie.
                                </div>
                            </div>
                        )}

                        {activeTab === 'modeling' && (
                            <div className="modeling-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                                <div className="glass-chart-card" style={{ borderTop: '4px solid var(--danger)' }}>
                                    <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={20} color="var(--danger)" />
                                        Spécifications Formelles : Contraintes Strictes (Hard)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                                        {[
                                            { id: 'H1', title: 'Conflit Enseignant', desc: 'Un enseignant ne peut assurer qu’un seul cours simultanément.' },
                                            { id: 'H2', title: 'Conflit Salle', desc: 'Une salle ne peut accueillir qu’un seul cours à la fois.' },
                                            { id: 'H3', title: 'Conflit de Structure (Sections)', desc: 'Gestion des chevauchements entre sections liées (ex: redoublants).' },
                                            { id: 'H4', title: 'Capacité de Salle', desc: 'L’effectif du groupe doit être inférieur ou égal à la capacité de la salle.' },
                                            { id: 'H5', title: 'Compatibilité Équipements', desc: 'Besoins techniques spécifiques (Vidéo-proj, Labo).' },
                                            { id: 'H6', title: 'Volume Hebdomadaire', desc: 'Respect strict du volume horaire défini dans la maquette.' },
                                            { id: 'H7', title: 'Cohérence de Modalité', desc: 'Aucune salle physique si le cours est en ligne.' },
                                            { id: 'H8', title: 'Disponibilité Enseignant', desc: 'Respect des plages d’indisponibilité individuelles.' },
                                            { id: 'H9', title: 'Spécificité Pédagogique', desc: 'Type de salle (CM/TD/TP) compatible avec le type de module.' },
                                            { id: 'H10', title: 'Verrouillage Administrateur', desc: 'Immuabilité des séances fixées manuellement via l’UI.' },
                                            { id: 'H11', title: 'CM Interdits le Samedi', desc: 'Journée restreinte aux TD/TP par règlement pédagogique.' }
                                        ].map(h => (
                                            <div key={h.id} style={{ display: 'flex', gap: '15px' }}>
                                                <div style={{ background: 'rgba(239, 44, 44, 0.1)', color: 'var(--danger)', fontWeight: 900, px: 10, py: 5, borderRadius: '5px', height: 'fit-content', fontSize: '0.7rem', minWidth: '35px', textAlign: 'center' }}>
                                                    {h.id}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{h.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{h.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-chart-card" style={{ borderTop: '4px solid var(--teal)' }}>
                                    <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <TrendingUp size={20} color="var(--teal)" />
                                        Critères de Qualité : Contraintes Souples (Soft)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                                        {[
                                            { id: 'S1', title: 'Compactage Groupes (Gaps)', desc: 'Minimiser les "trous" entre deux séances pour les étudiants.' },
                                            { id: 'S2', title: 'Équilibre Hebdomadaire', desc: 'Répartir la charge horaire de manière homogène sur la semaine.' },
                                            { id: 'S3', title: 'Créneaux Sensibles', desc: 'Minimiser l’usage des soirées et du samedi.' },
                                            { id: 'S4', title: 'Préférences Enseignants', desc: 'Respecter les choix horaires formulés par le corps professoral.' },
                                            { id: 'S5', title: 'Compactage Enseignants', desc: 'Réduire les temps de présence non-productifs sur campus.' },
                                            { id: 'S6', title: 'Stabilité des Salles', desc: 'Éviter les changements de salle pour un même module.' },
                                            { id: 'S7', title: 'Évitement des Journées Hachées', desc: 'Minimiser les déplacements pour une seule séance.' },
                                            { id: 'S8', title: 'Après-midis Libres', desc: 'Favoriser le travail personnel par blocs de temps libres.' },
                                            { id: 'S9', title: 'Gestion de la Fatigue', desc: 'Pénalisation des créneaux chargés en fin de journée.' },
                                            { id: 'S10', title: 'Pause Déjeuner (12h30)', desc: 'Libérer le créneau méridien pour la restauration.' }
                                        ].map(s => (
                                            <div key={s.id} style={{ display: 'flex', gap: '15px' }}>
                                                <div style={{ background: 'rgba(26, 158, 122, 0.1)', color: 'var(--teal)', fontWeight: 900, px: 10, py: 5, borderRadius: '5px', height: 'fit-content', fontSize: '0.7rem', minWidth: '35px', textAlign: 'center' }}>
                                                    {s.id}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{s.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence >
            </main >
        </div >
    );
}
