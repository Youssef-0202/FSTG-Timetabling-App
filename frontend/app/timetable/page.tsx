"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
    Calendar, Users, Download, Clock, MapPin, User as UserIcon
} from "lucide-react";
import {
    getAssignments, Assignment,
    getTeachers, Teacher,
    getRooms, Room,
    getModules, Module,
    getModuleParts, ModulePart,
    getTimeslots, Timeslot,
    getSections, Section
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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [a, t, r, m, mp, ts, sec] = await Promise.all([
                getAssignments(), getTeachers(), getRooms(), getModules(),
                getModuleParts(), getTimeslots(), getSections()
            ]);
            setAssignments(a); setTeachers(t); setRooms(r); setModules(m);
            setModuleParts(mp); setTimeslots(ts); setSections(sec);
            if (sec.length > 0) setSelectedId(String(sec[0].id));
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Lignes pour les vues Section/Enseignant
    const uniqueHours = Array.from(new Set(timeslots.map(t => t.start_time.substring(0, 5)))).sort();

    const getCourseAt = (day: string, startTime: string) => {
        return assignments.find(a => {
            const ts = timeslots.find(t => t.id === a.slot_id);
            if (!ts || ts.day.toLowerCase() !== day.toLowerCase() || !ts.start_time.startsWith(startTime)) return false;
            return viewMode === "section" ? String(a.section_id) === selectedId : String(a.teacher_id) === selectedId;
        });
    };

    return (
        <div className="page-container">
            <div className="hero-section">
                <h1>Explorateur de Planning</h1>
                <p>Consultez l'emploi du temps généré par l'IA de la FSTM Marrakech.</p>
            </div>

            <div className="content-wrapper">
                <div className="top-bar">
                    <div className="mode-toggle">
                        <button className={viewMode === "section" ? "active" : ""} onClick={() => setViewMode("section")}><Users size={16} /> Par Section</button>
                        <button className={viewMode === "teacher" ? "active" : ""} onClick={() => setViewMode("teacher")}><UserIcon size={16} /> Par Prof</button>
                        <button className={viewMode === "master" ? "active" : ""} onClick={() => setViewMode("master")}><Calendar size={16} /> Vue Globale</button>
                    </div>

                    {viewMode !== "master" && (
                        <select className="id-selector" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                            {viewMode === "section" ? sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                    <button className="btn-download"><Download size={16} /> Exporter PDF</button>
                </div>

                {loading ? (
                    <div className="loading-state">Chargement du planning...</div>
                ) : (
                    <div className="timetable-area">
                        {viewMode !== "master" ? (
                            <div className="grid-container standard-grid">
                                <table className="pure-table">
                                    <thead>
                                        <tr>
                                            <th>HEURE</th>
                                            {DAYS_ORDER.map(d => <th key={d}>{d.toUpperCase()}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniqueHours.map(time => (
                                            <tr key={time}>
                                                <td className="time-header"><Clock size={12} /> {time}</td>
                                                {DAYS_ORDER.map(day => {
                                                    const c = getCourseAt(day, time);
                                                    if (!c) return <td key={day} className="cell-empty" />;
                                                    const mp = moduleParts.find(p => p.id === c.module_part_id);
                                                    const mod = modules.find(m => m.id === mp?.module_id);
                                                    const room = rooms.find(r => r.id === c.room_id);
                                                    return (
                                                        <td key={day} className="cell-filled">
                                                            <div className={`course-box ${mp?.type.toLowerCase()}`}>
                                                                <div className="c-name">{mod?.name}</div>
                                                                <div className="c-room"><MapPin size={10} /> {room?.name}</div>
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
                            <div className="grid-container master-grid-view">
                                <div className="scroll-box">
                                    <table className="pure-table">
                                        <thead>
                                            <tr>
                                                <th className="sticky-cell header-time">CRÉNEAU</th>
                                                {rooms.sort((a, b) => a.type.localeCompare(b.type)).map(r => (
                                                    <th key={r.id} className="room-col-header">
                                                        <span>{r.name}</span>
                                                        <div className="room-info">
                                                            <small className="type-tag">{r.type}</small>
                                                            <small className="cap-tag">{r.capacity} pl.</small>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const sortedSlots = [...timeslots].sort((a, b) => {
                                                    const dayA = a.day.trim().charAt(0).toUpperCase() + a.day.trim().slice(1).toLowerCase();
                                                    const dayB = b.day.trim().charAt(0).toUpperCase() + b.day.trim().slice(1).toLowerCase();

                                                    const idxA = DAYS_ORDER.indexOf(dayA);
                                                    const idxB = DAYS_ORDER.indexOf(dayB);

                                                    if (idxA !== idxB) return idxA - idxB;
                                                    return a.start_time.localeCompare(b.start_time);
                                                });

                                                let currentDay = "";
                                                return sortedSlots.map(slot => {
                                                    const dayStr = slot.day.trim().toUpperCase();
                                                    const showDay = dayStr !== currentDay;
                                                    currentDay = dayStr;
                                                    return (
                                                        <React.Fragment key={slot.id}>
                                                            {showDay && (
                                                                <tr className="day-separator">
                                                                    <td colSpan={rooms.length + 1}>{slot.day.toUpperCase()}</td>
                                                                </tr>
                                                            )}
                                                            <tr>
                                                                <td className="sticky-cell time-label">{slot.start_time.substring(0, 5)}</td>
                                                                {rooms.sort((a, b) => a.type.localeCompare(b.type)).map(room => {
                                                                    const assignment = assignments.find(as => as.slot_id === slot.id && as.room_id === room.id);
                                                                    if (!assignment) return <td key={room.id} />;
                                                                    const mp = moduleParts.find(p => p.id === assignment.module_part_id);
                                                                    return (
                                                                        <td key={room.id} className="assignment-cell">
                                                                            <div className={`m-assignment ${mp?.type.toLowerCase()}`}>
                                                                                <div className="m-mod">{modules.find(m => m.id === mp?.module_id)?.name}</div>
                                                                                <div className="m-sec">{sections.find(s => s.id === assignment.section_id)?.name}</div>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .page-container { background: #f8fafc; min-height: 100vh; }
                .hero-section { background: #0f172a; color: white; padding: 40px 20px 80px; text-align: center; }
                .hero-section h1 { font-size: 2rem; margin: 0; font-weight: 800; }
                .hero-section p { opacity: 0.7; margin: 8px 0 0; }

                .content-wrapper { max-width: 1400px; margin: -40px auto 0; padding: 0 20px 40px; }
                
                .top-bar { display: flex; align-items: center; gap: 15px; background: white; padding: 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 25px; }
                .mode-toggle { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; }
                .mode-toggle button { border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #64748b; background: transparent; transition: all 0.2s; }
                .mode-toggle button.active { background: #0f172a; color: white; }
                
                .id-selector { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; flex: 1; max-width: 300px; font-weight: 500; }
                .btn-download { margin-left: auto; display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }

                .loading-state { text-align: center; padding: 100px; font-weight: 600; color: #64748b; }

                .grid-container { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
                .scroll-box { overflow: auto; max-height: calc(100vh - 280px); }
                
                .pure-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .master-grid-view .pure-table { table-layout: auto; width: max-content; }

                .pure-table th { background: #f8fafc; color: #475569; padding: 12px; font-size: 0.75rem; font-weight: 800; border-bottom: 2px solid #e2e8f0; border-right: 1px solid #f1f5f9; text-align: center; }
                .room-col-header span { display: block; font-size: 0.85rem; color: #1e293b; }
                .room-col-header small { color: #64748b; font-weight: 500; font-size: 0.65rem; }

                .pure-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; }
                .time-header { font-weight: 700; color: #1e293b; width: 110px; text-align: center; font-size: 0.85rem; background: #fafafa; }
                .sticky-cell { position: sticky; left: 0; background: #f8fafc; z-index: 5; font-weight: 800; border-right: 2px solid #e2e8f0; }
                .header-time { min-width: 110px; }

                .course-box { padding: 10px; border-radius: 8px; font-size: 0.8rem; height: 100%; min-height: 60px; display: flex; flex-direction: column; justify-content: center; }
                .m-assignment { padding: 6px; border-radius: 6px; font-size: 0.7rem; min-height: 50px; min-width: 150px; }
                
                .room-info { display: flex; flex-direction: column; gap: 2px; align-items: center; margin-top: 4px; }
                .type-tag { color: #64748b; font-weight: 600; font-size: 0.6rem; text-transform: uppercase; }
                .cap-tag { background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 700; }

                .cm { background: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; }
                .td { background: #f0fdf4; border-left: 4px solid #22c55e; color: #166534; }
                .tp { background: #fdf2f8; border-left: 4px solid #ec4899; color: #9d174d; }

                .c-name { font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2; margin-bottom: 4px; }
                .c-room { font-size: 0.75rem; display: flex; align-items: center; gap: 4px; opacity: 0.8; }
                
                .m-mod { font-weight: 700; line-height: 1.1; margin-bottom: 2px; }
                .day-separator { background: #f1f5f9; }
                .day-separator td { padding: 8px 15px; font-weight: 900; color: #475569; font-size: 0.75rem; letter-spacing: 1.5px; position: sticky; left: 0; }
                
                .time-label { text-align: center; min-width: 110px; font-size: 0.8rem; color: #0f172a; }
            `}</style>
        </div>
    );
}
