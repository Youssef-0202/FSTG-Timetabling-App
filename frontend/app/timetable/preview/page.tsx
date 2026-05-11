"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
    Calendar, Users, Download, Clock, MapPin, User as UserIcon, CheckCircle, Edit2
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    getAssignments, Assignment, getPreviewSchedule,
    getTeachers, Teacher,
    getRooms, Room,
    getModules, Module,
    getModuleParts, ModulePart,
    getTimeslots, Timeslot,
    getSections, Section, getTDGroups,
    auditSection, AuditResult, commitPreview
} from "@/lib/api";

const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function TimetablePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [moduleParts, setModuleParts] = useState<ModulePart[]>([]);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [viewMode, setViewMode] = useState<"section" | "teacher" | "master">("section");
    const [selectedId, setSelectedId] = useState<string>("");
    const [showFiliereAudit, setShowFiliereAudit] = useState(false);
    const [auditGhostType, setAuditGhostType] = useState<"CM" | "ALL">("CM");

    const [tdGroups, setTdGroups] = useState<any[]>([]);
    const [resultMode, setResultMode] = useState<"ga_sa" | "rl" | "alns">("alns");
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

    useEffect(() => {
        if (viewMode === "section" && selectedId) {
            auditSection(Number(selectedId), resultMode)
                .then(setAuditResult)
                .catch(console.error);
        } else {
            setAuditResult(null);
        }
    }, [selectedId, resultMode, viewMode]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [a, t, r, m, mp, ts, sec, tdg] = await Promise.all([
                getPreviewSchedule(resultMode), getTeachers(), getRooms(), getModules(),
                getModuleParts(), getTimeslots(), getSections(), getTDGroups()
            ]);
            setAssignments(a); setTeachers(t); setRooms(r); setModules(m);
            setModuleParts(mp); setTimeslots(ts); setSections(sec);
            setTdGroups(tdg);

            if (sec.length > 0 && !selectedId) {
                const firstId = String(sec[0].id);
                setSelectedId(firstId);
            }
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    }, [resultMode]);

    useEffect(() => { load(); }, [load, resultMode]);

    const uniqueHours = Array.from(new Set(timeslots.map(t => t.start_time.substring(0, 5)))).sort();

    const getCoursesAt = (day: string, startTime: string) => {
        return assignments.filter(a => {
            const ts = timeslots.find(t => t.id === a.slot_id);
            if (!ts) return false;
            if (ts.day.toLowerCase().trim() !== day.toLowerCase().trim()) return false;
            if (!ts.start_time.substring(0, 5).startsWith(startTime.substring(0, 5))) return false;

            if (viewMode === "section") {
                const mp = moduleParts.find(p => p.id === a.module_part_id);
                const isDirect = String(a.section_id) === String(selectedId);
                const isGroupLocal = a.td_groups?.some(g => {
                    const gid = typeof g === 'object' ? g.id : g;
                    const fullGroup = tdGroups.find(tg => String(tg.id) === String(gid));
                    return fullGroup && String(fullGroup.section_id) === String(selectedId);
                });

                if (isDirect || isGroupLocal) return true;

                if (showFiliereAudit) {
                    const selectedS = sections.find(s => String(s.id) === String(selectedId));
                    if (!selectedS || !selectedS.groupes) return false;
                    const localFiliereIds = selectedS.groupes.map(g => g.filiere_id);
                    const currentSemester = selectedS.name.split(" ").pop();

                    // RÈGLE : Pas d'audit si on est en S4
                    if (currentSemester === "S4") return false;

                    const otherLevelSections = sections.filter((s: any) =>
                        s.groupes?.some((g: any) => localFiliereIds.includes(g.filiere_id)) &&
                        s.name.split(" ").pop() !== currentSemester
                    );

                    const isBlueInOtherLevel = otherLevelSections.some((rs: any) => {
                        const isDirectMatch = String(a.section_id) === String(rs.id);
                        const sharesGroupsWithRs = a.td_groups?.some((g: any) => {
                            const gid = typeof g === 'object' ? g.id : g;
                            const foundG = tdGroups.find(tg => String(tg.id) === String(gid));
                            return foundG && String(foundG.section_id) === String(rs.id);
                        });
                        const isRelated = isDirectMatch || sharesGroupsWithRs;
                        const isCMorSectionWide = mp?.type === "CM" || !a.td_groups || a.td_groups.length === 0;
                        return isRelated && isCMorSectionWide;
                    });

                    if (isBlueInOtherLevel) return true;

                    const isRelatedGr6 = a.td_groups?.some((g: any) => {
                        const gid = typeof g === 'object' ? g.id : g;
                        const found = tdGroups.find(tg => String(tg.id) === String(gid));
                        if (found && (found.name.toLowerCase().includes("gr 6") || found.name.toLowerCase().includes("gr6"))) {
                            const grSec = sections.find((s: any) => String(s.id) === String(found.section_id));
                            return grSec && grSec.groupes?.some((fg: any) => localFiliereIds.includes(fg.filiere_id)) && grSec.name.split(" ").pop() !== currentSemester;
                        }
                        return false;
                    });
                    if (isRelatedGr6) return true;
                }
            } else if (viewMode === "teacher") {
                return String(a.teacher_id) === String(selectedId);
            }
            return false;
        });
    };

    const activeTeachers = React.useMemo(() => {
        return teachers.filter(t => assignments.some(a => String(a.teacher_id) === String(t.id)));
    }, [teachers, assignments]);

    const sortedRooms = React.useMemo(() => {
        const typePriority: Record<string, number> = { "AMPHI": 1, "SALLE_TD": 2, "SALLE_TP": 3 };
        const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        return [...rooms].sort((a, b) => {
            const pa = typePriority[a.type] || 99;
            const pb = typePriority[b.type] || 99;
            if (pa !== pb) return pa - pb;
            return naturalCollator.compare(a.name, b.name);
        });
    }, [rooms]);

    return (
        <div className="page-container">
            <div className="hero-section" style={{ background: "linear-gradient(90deg, #1e3a8a, #0f172a)" }}>
                <h1>IA Preview : Emploi du Temps</h1>
                <p>Aperçu en direct du résultat de l'Algorithme Hybride GA+SA (Non enregistré en base de données).</p>
            </div>

            <div className="content-wrapper">
                <div className="top-bar">
                    <div className="mode-toggle">
                        <button className={viewMode === "section" ? "active" : ""} onClick={() => { setViewMode("section"); if (sections.length > 0) setSelectedId(String(sections[0].id)); }}><Users size={16} /> Par Section</button>
                        <button className={viewMode === "teacher" ? "active" : ""} onClick={() => { setViewMode("teacher"); if (activeTeachers.length > 0) setSelectedId(String(activeTeachers[0].id)); }}><UserIcon size={16} /> Par Prof</button>
                        <button className={viewMode === "master" ? "active" : ""} onClick={() => setViewMode("master")}><Calendar size={16} /> Vue Globale</button>
                    </div>
                    <button
                        onClick={() => router.push("/timetable/interactive")}
                        style={{
                            background: '#10b981', color: 'white', padding: '8px 16px',
                            borderRadius: '10px', border: 'none', fontWeight: 800,
                            fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <Edit2 size={14} /> Édition Manuelle
                    </button>
                    {viewMode === "section" && (
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                                background: showFiliereAudit ? '#fee2e2' : '#f1f5f9',
                                borderRadius: '8px', border: `1px solid ${showFiliereAudit ? '#fca5a5' : '#e2e8f0'}`,
                                cursor: sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4") ? 'not-allowed' : 'pointer',
                                opacity: sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4") ? 0.5 : 1,
                                transition: 'all 0.2s'
                            }}
                            onClick={() => {
                                if (!sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4")) {
                                    setShowFiliereAudit(!showFiliereAudit);
                                }
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={showFiliereAudit && !sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4")}
                                onChange={(e) => {
                                    if (!sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4")) {
                                        setShowFiliereAudit(e.target.checked);
                                    }
                                }}
                                disabled={sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4")}
                                style={{ accentColor: '#ef4444', cursor: sections.find(s => String(s.id) === String(selectedId))?.name.endsWith("S4") ? 'not-allowed' : 'pointer' }}
                            />
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: showFiliereAudit ? '#b91c1c' : '#64748b', cursor: 'inherit', userSelect: 'none' }}>
                                Audit : Chevauchement Filières
                            </label>
                        </div>
                    )}
                    <div className="result-mode-selector" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '4px' }}>
                        {["alns", "rl", "ga_sa"].map(mode => (
                            <button
                                key={mode}
                                className={resultMode === mode ? "active-mode" : ""}
                                onClick={() => setResultMode(mode as any)}
                                style={{
                                    border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '0.75rem', fontWeight: 800,
                                    background: resultMode === mode ? (mode === 'alns' ? '#7c3aed' : '#d97706') : 'transparent',
                                    color: resultMode === mode ? 'white' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {mode.toUpperCase()} Agent
                            </button>
                        ))}
                    </div>

                    {viewMode !== "master" && (
                        <select className="id-selector" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                            {viewMode === "section" ? sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : activeTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}

                    <button className="btn-download"><Download size={16} /> Exporter PDF</button>

                    <button
                        onClick={async () => {
                            if (confirm("Voulez-vous valider ce planning et passer à l'édition manuelle ?")) {
                                try {
                                    await commitPreview(resultMode);
                                    router.push(`/timetable/interactive?mode=${resultMode}`);
                                } catch (err) {
                                    alert("Erreur lors de la validation : " + err);
                                }
                            }
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                            background: '#10b981', color: 'white', border: 'none', borderRadius: '12px',
                            fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <CheckCircle size={18} /> Valider & Éditer
                    </button>
                </div>

                <div className="timetable-main-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {auditResult && viewMode === "section" && (
                        <div className="audit-top-bar" style={{
                            display: 'flex', gap: '24px', background: 'white',
                            padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                            alignItems: 'center'
                        }}>
                            <div className="score-block" style={{ paddingRight: '24px', borderRight: '1px solid #f1f5f9', textAlign: 'center', minWidth: '140px' }}>
                                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px' }}>Score Global</span>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: auditResult.score > 75 ? '#16a34a' : auditResult.score > 50 ? '#d97706' : '#dc2626', margin: '4px 0' }}>
                                    {auditResult.score}%
                                </div>
                                <div style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', background: auditResult.score > 75 ? '#dcfce7' : auditResult.score > 50 ? '#fef3c7' : '#fef2f2', color: auditResult.score > 75 ? '#166534' : auditResult.score > 50 ? '#92400e' : '#991b1b' }}>
                                    {auditResult.status}
                                </div>
                            </div>

                            <div className="indicators-row" style={{ flex: 1, display: 'flex', gap: '40px' }}>
                                {Object.entries(auditResult.details || {}).map(([key, value]) => (
                                    <div key={key} style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                                            <span>{key}</span>
                                            <span style={{ color: '#1e293b' }}>{value}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${value}%`, height: '100%',
                                                background: value > 80 ? '#22c55e' : value > 50 ? '#eab308' : '#ef4444',
                                                transition: 'width 1s ease-out'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="timetable-grid-area" style={{ flex: 1, minWidth: 0 }}>
                        {loading ? (
                            <div className="loading-state">Chargement...</div>
                        ) : assignments.length === 0 ? (
                            <div className="empty-state" style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px' }}>
                                <h3>Aucun résultat trouvé</h3>
                            </div>
                        ) : viewMode !== "master" ? (
                            <div style={{ width: '100%', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ width: '85px', padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' }}>
                                                HEURE
                                            </th>
                                            {DAYS_ORDER.map(day => (
                                                <th key={day} style={{ padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#475569', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', textTransform: 'uppercase', textAlign: 'center' }}>
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniqueHours.map(time => (
                                            <tr key={time}>
                                                <td style={{ textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                                        <Clock size={14} color="#64748b" /> {time}
                                                    </div>
                                                </td>
                                                {DAYS_ORDER.map(day => {
                                                    const courses = getCoursesAt(day, time);
                                                    return (
                                                        <td key={day} style={{ padding: '12px', borderBottom: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', verticalAlign: 'top' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                {courses.map(c => {
                                                                    const mp = moduleParts.find(p => p.id === c.module_part_id);
                                                                    const mod = modules.find(m => m.id === mp?.module_id);
                                                                    const teacher = teachers.find(t => t.id === c.teacher_id);
                                                                    const room = rooms.find(r => r.id === c.room_id);
                                                                    const cSection = sections.find(s => s.id === c.section_id);

                                                                    const isDirect = String(c.section_id) === String(selectedId);
                                                                    const isGroupLocal = c.td_groups?.some(g => {
                                                                        const gid = typeof g === 'object' ? g.id : g;
                                                                        const found = tdGroups.find(tg => String(tg.id) === String(gid));
                                                                        return found && String(found.section_id) === String(selectedId);
                                                                    });

                                                                    const isTDorTP = mp?.type.toLowerCase() !== 'cm';
                                                                    const groupLabel = isTDorTP && c.td_groups && c.td_groups.length > 0
                                                                        ? c.td_groups.map(g => {
                                                                            const gid = typeof g === 'object' ? g.id : g;
                                                                            const found = tdGroups.find(tg => String(tg.id) === String(gid));
                                                                            if (!found) return "";
                                                                            const parts = found.name.split(" ");
                                                                            const grIndex = parts.findIndex((p: string) => p.toLowerCase() === "gr");
                                                                            return grIndex !== -1 ? parts.slice(grIndex).join(" ") : found.name;
                                                                        }).filter(n => n !== "").join('+')
                                                                        : null;

                                                                    let isGhost = false;
                                                                    let ghostSectionName = cSection?.name || "FILIÈRE";
                                                                    const selectedS = sections.find(s => String(s.id) === String(selectedId));

                                                                    if (showFiliereAudit && !isDirect && !isGroupLocal) {
                                                                        isGhost = true;
                                                                        if (selectedS?.groupes) {
                                                                            const localFiliereIds = selectedS.groupes.map(g => g.filiere_id);
                                                                            const currentSem = selectedS.name.split(" ").pop();

                                                                            // On collecte TOUTES les sections de l'autre niveau qui partagent ce cours
                                                                            const otherLevelSections = sections.filter(s =>
                                                                                s.groupes?.some(g => localFiliereIds.includes(g.filiere_id)) &&
                                                                                s.name.split(" ").pop() !== currentSem
                                                                            );

                                                                            const sharingSections = otherLevelSections.filter(rs => {
                                                                                // Match direct ?
                                                                                const isDirectMatch = String(c.section_id) === String(rs.id) && (mp?.type === "CM" || !c.td_groups || c.td_groups.length === 0);
                                                                                if (isDirectMatch) return true;
                                                                                // Match via groupe ?
                                                                                return c.td_groups?.some(g => {
                                                                                    const gid = typeof g === 'object' ? g.id : g;
                                                                                    const fullG = tdGroups.find(tg => String(tg.id) === String(gid));
                                                                                    return fullG && String(fullG.section_id) === String(rs.id);
                                                                                });
                                                                            });

                                                                            if (sharingSections.length > 0) {
                                                                                ghostSectionName = sharingSections.map(s => s.name).join(' + ');
                                                                            }
                                                                        }
                                                                    }

                                                                    const bgColor = isGhost ? '#fff1f2' : undefined;

                                                                    return (
                                                                        <div key={c.id} className={`course-box ${mp?.type.toLowerCase()}`} style={{
                                                                            margin: 0, padding: '10px', borderRadius: '8px',
                                                                            borderLeft: `5px solid ${isGhost ? '#ef4444' : (mp?.type.toLowerCase() === 'cm' ? '#3b82f6' : '#22c55e')}`,
                                                                            background: isGhost ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : bgColor,
                                                                            pointerEvents: isGhost ? 'none' : 'auto',
                                                                            position: 'relative',
                                                                            boxShadow: isGhost ? '0 4px 6px -1px rgba(239, 68, 68, 0.1)' : undefined
                                                                        }}>
                                                                            {isGhost && (
                                                                                <div style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 900, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 20 }}>{ghostSectionName}</div>
                                                                            )}
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                                                <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.75rem', lineHeight: 1.2, flex: 1 }}>
                                                                                    {mod?.name}
                                                                                </div>
                                                                                {groupLabel && (
                                                                                    <div style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: 'white', marginLeft: '6px' }}>
                                                                                        {groupLabel}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.65rem', fontWeight: 600 }}>
                                                                                <div style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                                                                                    {teacher ? `Pr. ${teacher.name}` : '—'}
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                                                                    <MapPin size={10} color="#94a3b8" /> {room?.name || '—'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{
                                width: '100%', height: 'calc(100vh - 350px)',
                                background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'auto',
                                position: 'relative'
                            }}>
                                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{
                                                position: 'sticky', top: 0, left: 0, zIndex: 10,
                                                background: '#f8fafc', padding: '16px', fontSize: '0.7rem', fontWeight: 900,
                                                color: '#64748b', borderBottom: '2px solid #e2e8f0', borderRight: '2px solid #e2e8f0'
                                            }}>HEURE / SALLE</th>
                                            {sortedRooms.map(r => (
                                                <th key={r.id} style={{
                                                    position: 'sticky', top: 0, zIndex: 5,
                                                    background: '#f8fafc', padding: '16px', fontSize: '0.7rem', fontWeight: 900,
                                                    color: '#475569', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #f1f5f9',
                                                    textTransform: 'uppercase', textAlign: 'center', minWidth: '180px'
                                                }}>
                                                    {r.name}
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>{r.type} • Cap. {r.capacity}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DAYS_ORDER.map((day, dayIdx) => (
                                            <React.Fragment key={day}>
                                                <tr style={{ background: '#f1f5f9' }}>
                                                    <td colSpan={sortedRooms.length + 1} style={{ padding: '8px 20px', fontSize: '0.75rem', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0' }}>
                                                        {day}
                                                    </td>
                                                </tr>
                                                {uniqueHours.map(time => (
                                                    <tr key={`${day}-${time}`}>
                                                        <td style={{
                                                            position: 'sticky', left: 0, zIndex: 4,
                                                            background: '#f8fafc', padding: '12px', borderBottom: '1px solid #e2e8f0', borderRight: '2px solid #cbd5e1',
                                                            fontSize: '0.75rem', fontWeight: 800, color: '#475569', textAlign: 'center'
                                                        }}>
                                                            {time}
                                                        </td>
                                                        {sortedRooms.map(room => {
                                                            const a = assignments.find(asgn => {
                                                                const ts = timeslots.find(t => t.id === asgn.slot_id);
                                                                if (!ts) return false;
                                                                const dayMatch = ts.day.toLowerCase().trim() === day.toLowerCase().trim();
                                                                const timeMatch = ts.start_time.substring(0, 5) === time;
                                                                return dayMatch && timeMatch && asgn.room_id === room.id;
                                                            });

                                                            if (!a) return <td key={room.id} style={{ borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', background: 'white' }}></td>;

                                                            const mp = moduleParts.find(p => p.id === a.module_part_id);
                                                            const mod = modules.find(m => m.id === mp?.module_id);
                                                            const teacher = teachers.find(t => t.id === a.teacher_id);
                                                            const sec = sections.find(s => s.id === a.section_id);

                                                            const type = mp?.type.toLowerCase() || 'cm';
                                                            const color = type === 'cm' ? '#3b82f6' : type === 'td' ? '#22c55e' : '#ec4899';
                                                            const bg = type === 'cm' ? '#eff6ff' : type === 'td' ? '#f0fdf4' : '#fdf2f8';

                                                            return (
                                                                <td key={room.id} style={{ padding: '4px', border: '1px solid #e2e8f0', verticalAlign: 'top', background: '#f8fafc', position: 'relative' }}>
                                                                    <div style={{
                                                                        padding: '8px', borderRadius: '8px', borderLeft: `4px solid ${color}`,
                                                                        background: bg, fontSize: '0.65rem'
                                                                    }}>
                                                                        <div style={{ fontWeight: 800, color: '#1e3a8a', marginBottom: '4px', lineHeight: 1.2 }}>{mod?.name}</div>
                                                                        <div style={{ color: '#475569', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                                                                            {teacher ? `Pr. ${teacher.name}` : '—'}
                                                                        </div>
                                                                        <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.6rem' }}>
                                                                            {sec ? sec.name : a.td_groups && a.td_groups.length > 0 ? a.td_groups.map(g => g.name).join('+') : '—'}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .page-container { background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
                .hero-section { color: white; padding: 40px 20px; text-align: center; }
                .content-wrapper { max-width: 1600px; margin: 0 auto; padding: 20px; }
                .top-bar { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; background: white; padding: 12px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .mode-toggle { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; }
                .mode-toggle button { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem; color: #64748b; background: transparent; }
                .mode-toggle button.active { background: white; color: #1e3a8a; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .id-selector { padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; flex: 1; max-width: 250px; }
                .grid-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: auto; }
                .pure-table { width: 100%; border-collapse: collapse; }
                .pure-table th { background: #f8fafc; padding: 12px; font-size: 0.75rem; color: #475569; border-bottom: 1px solid #e2e8f0; text-align: center; }
                .pure-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; height: 80px; vertical-align: top; border-right: 1px solid #f1f5f9; }
                .time-header { width: 100px; font-weight: 700; text-align: center; background: #f8fafc; }
                .course-box { padding: 8px; border-radius: 8px; font-size: 0.75rem; margin-bottom: 4px; border-left: 4px solid #3b82f6; background: #eff6ff; }
                .cm { border-left-color: #3b82f6; background: #eff6ff; }
                .td { border-left-color: #22c55e; background: #f0fdf4; }
                .tp { border-left-color: #ec4899; background: #fdf2f8; }
                .c-name { font-weight: 800; color: #1e3a8a; margin-bottom: 4px; }
                .c-info-row { font-size: 0.65rem; color: #64748b; display: flex; flex-direction: column; gap: 2px; }
            `}</style>
        </div>
    );
}
