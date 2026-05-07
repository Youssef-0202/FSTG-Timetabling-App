"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
    Calendar, Users, Download, Clock, MapPin, User as UserIcon
} from "lucide-react";
import {
    getAssignments, Assignment, getPreviewSchedule,
    getTeachers, Teacher,
    getRooms, Room,
    getModules, Module,
    getModuleParts, ModulePart,
    getTimeslots, Timeslot,
    getSections, Section, getTDGroups,
    auditSection, AuditResult
} from "@/lib/api";

const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function TimetablePage() {
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
            if (!ts.start_time.startsWith(startTime)) return false;

            if (viewMode === "section") {
                if (String(a.section_id) === String(selectedId)) return true;
                const hasLocalGroup = a.td_groups?.some(g => {
                    const fullGroup = tdGroups.find(tg => tg.id === g.id);
                    return fullGroup && String(fullGroup.section_id) === String(selectedId);
                });
                if (hasLocalGroup) return true;

                if (showFiliereAudit) {
                    const mp = moduleParts.find(p => p.id === a.module_part_id);
                    if (auditGhostType === "CM" && mp?.type !== "CM") return false;
                    const selectedS = sections.find(s => String(s.id) === String(selectedId));
                    if (selectedS && selectedS.groupes) {
                        const localFiliereIds = selectedS.groupes.map(g => g.filiere_id);
                        const courseSection = sections.find(s => String(s.id) === String(a.section_id));
                        if (courseSection && courseSection.groupes?.some(g => localFiliereIds.includes(g.filiere_id))) return true;
                        const hasRelatedGroup = a.td_groups?.some(g => {
                            const fullGroup = tdGroups.find(tg => tg.id === g.id);
                            if (fullGroup) {
                                const fullGroupSec = sections.find(s => String(s.id) === String(fullGroup.section_id));
                                return fullGroupSec?.groupes?.some(fg => localFiliereIds.includes(fg.filiere_id));
                            }
                            return false;
                        });
                        if (hasRelatedGroup) return true;
                    }
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
                </div>

                <div className="timetable-main-flex" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    {/* SIDEBAR GAUCHE : AUDIT */}
                    {auditResult && viewMode === "section" && (
                        <div className="audit-sidebar-left" style={{ width: '180px', position: 'sticky', top: '20px', background: 'white', padding: '24px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px' }}>Score Global</span>
                            <div style={{ fontSize: '2.8rem', fontWeight: 900, color: auditResult.score > 75 ? '#16a34a' : auditResult.score > 50 ? '#d97706' : '#dc2626', margin: '12px 0', lineHeight: 1 }}>
                                {auditResult.score}%
                            </div>
                            <div style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: auditResult.score > 75 ? '#dcfce7' : auditResult.score > 50 ? '#fef3c7' : '#fef2f2', color: auditResult.score > 75 ? '#166534' : auditResult.score > 50 ? '#92400e' : '#991b1b' }}>
                                {auditResult.status}
                            </div>
                        </div>
                    )}

                    {/* CENTRE : PLANNING */}
                    <div className="timetable-center-area" style={{ flex: 1, minWidth: 0 }}>
                        {loading ? (
                            <div className="loading-state">Chargement...</div>
                        ) : assignments.length === 0 ? (
                            <div className="empty-state" style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px' }}>
                                <h3>Aucun résultat trouvé</h3>
                            </div>
                        ) : viewMode !== "master" ? (
                            <div className="grid-container">
                                <table className="pure-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '100px' }}>HEURE</th>
                                            {DAYS_ORDER.map(d => <th key={d}>{d.toUpperCase()}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniqueHours.map(time => (
                                            <tr key={time}>
                                                <td className="time-header"><Clock size={12} /> {time}</td>
                                                {DAYS_ORDER.map(day => {
                                                    const courses = getCoursesAt(day, time);
                                                    return (
                                                        <td key={day} className={courses.length > 0 ? "cell-filled" : ""}>
                                                            {courses.map(c => {
                                                                const mp = moduleParts.find(p => p.id === c.module_part_id);
                                                                const mod = modules.find(m => m.id === mp?.module_id);
                                                                const teacher = teachers.find(t => t.id === c.teacher_id);
                                                                const room = rooms.find(r => r.id === c.room_id);
                                                                return (
                                                                    <div key={c.id} className={`course-box ${mp?.type.toLowerCase()}`}>
                                                                        <div className="c-name">{mod?.name}</div>
                                                                        <div className="c-info-row">
                                                                            <div className="c-room"><MapPin size={10} /> {room?.name}</div>
                                                                            <div className="c-teacher">{teacher?.name}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Simplified Master view for space */
                            <div className="grid-container master-grid-view">
                                <div className="scroll-box">
                                    <table className="pure-table">
                                        <thead>
                                            <tr>
                                                <th className="sticky-cell">HEURE</th>
                                                {rooms.map(r => <th key={r.id}>{r.name}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {timeslots.slice(0, 20).map(slot => ( // Just a slice for example
                                                <tr key={slot.id}>
                                                    <td className="sticky-cell">{slot.day} {slot.start_time}</td>
                                                    {rooms.map(room => {
                                                        const a = assignments.find(asgn => asgn.slot_id === slot.id && asgn.room_id === room.id);
                                                        return <td key={room.id}>{a ? modules.find(m => m.id === moduleParts.find(p => p.id === a.module_part_id)?.module_id)?.name : ""}</td>;
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SIDEBAR DROITE : DETAILS AUDIT */}
                    {auditResult && viewMode === "section" && (
                        <div className="audit-sidebar-right" style={{ width: '200px', position: 'sticky', top: '20px', background: 'white', padding: '24px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px', display: 'block', marginBottom: '20px' }}>Indicateurs</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {Object.entries(auditResult.details || {}).map(([key, value]) => (
                                    <div key={key}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            <span style={{ textTransform: 'uppercase' }}>{key}</span>
                                            <span>{value}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${value}%`, height: '100%', background: value > 80 ? '#22c55e' : value > 50 ? '#eab308' : '#ef4444' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
