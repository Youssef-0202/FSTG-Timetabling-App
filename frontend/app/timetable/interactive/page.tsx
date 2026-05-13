"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    TouchSensor
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Clock, MapPin, ArrowLeft, CheckCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    getAssignments, Assignment,
    getTeachers, Teacher,
    getRooms, Room,
    getModules, Module,
    getModuleParts, ModulePart,
    getTimeslots, Timeslot,
    getSections, Section, getTDGroups,
    updateAssignment, getPreviewSchedule,
    auditSection, AuditResult, getAvailableResources, resetAssignments
} from "@/lib/api";

const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const TYPE_STYLES: Record<string, { border: string; bg: string; nameColor: string }> = {
    cm: { border: "#3b82f6", bg: "#eff6ff", nameColor: "#1e3a8a" },
    td: { border: "#22c55e", bg: "#f0fdf4", nameColor: "#1e3a8a" },
    tp: { border: "#ec4899", bg: "#fdf2f8", nameColor: "#1e3a8a" },
};
function typeStyle(type: string) {
    return TYPE_STYLES[type?.toLowerCase()] ?? TYPE_STYLES.cm;
}

function CourseCard({
    modName, teacherName, roomName, type, groupLabel,
    isDragging = false, isOverlay = false,
    dragListeners, dragRef, dragAttributes, transform,
    conflicts = [], isGhost = false, sectionName = null,
    showAudit = false,
}: any) {
    const isGr6 = showAudit && (groupLabel?.toLowerCase().includes("gr 6") || groupLabel?.toLowerCase().includes("gr6"));
    const { border, bg, nameColor } = typeStyle(type);
    const finalBorder = isGr6 ? "#f97316" : border;
    const finalBg = isGr6 ? "#fff7ed" : bg;
    const hasConflicts = conflicts.length > 0;
    const conflictMsg = hasConflicts ? "CONFLITS :\n" + conflicts.map(c => "• " + c).join("\n") : "";

    const boxStyle: React.CSSProperties = {
        padding: "9px 10px", borderRadius: "8px", fontSize: "0.75rem",
        borderLeft: isGhost ? "5px solid #ef4444" : `5px solid ${finalBorder}`,
        border: hasConflicts ? "2px solid #ef4444" : isGhost ? '2px solid #ef4444' : (isGr6 ? "1px solid #fdba74" : undefined),
        background: isGhost ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : finalBg,
        cursor: isDragging ? "grabbing" : isGhost ? 'default' : "grab",
        opacity: isDragging && !isOverlay ? 0 : isGhost ? 0.72 : 1,
        position: "relative" as const,
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000 } : {}),
    };

    return (
        <div ref={dragRef} style={boxStyle} {...dragListeners} {...dragAttributes} title={isGhost ? `COURS DE LA SECTION : ${sectionName}` : conflictMsg}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 800, color: nameColor, lineHeight: 1.2, fontSize: "0.75rem", flex: 1 }}>{modName || "—"}</div>
                {hasConflicts && <div style={{ background: "#ef4444", color: "white", borderRadius: "50%", padding: "2px", marginRight: 4 }}><AlertTriangle size={12} strokeWidth={3} /></div>}
                {groupLabel && <div style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: 'white', marginLeft: "4px" }}>{groupLabel}</div>}
            </div>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ color: "#475569", textTransform: "uppercase", fontSize: "0.6rem" }}>{teacherName ? `Pr. ${teacherName}` : "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}><MapPin size={10} color="#94a3b8" /> {roomName || "—"}</div>
            </div>
        </div>
    );
}

function DraggableCourse({ assignment, modName, teacherName, roomName, type, groupLabel, conflicts, onContextMenu, isGhost = false, sectionName = null, showAudit = false }: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `course-${assignment.id}`,
        data: { assignment },
        disabled: isGhost
    });
    return (
        <div onContextMenu={(e) => !isGhost && onContextMenu(e, assignment)}>
            <CourseCard
                modName={modName} teacherName={teacherName} roomName={roomName} type={type} groupLabel={groupLabel}
                isDragging={isDragging} dragRef={setNodeRef} dragListeners={listeners} dragAttributes={attributes}
                transform={transform} conflicts={conflicts} isGhost={isGhost} sectionName={sectionName} showAudit={showAudit}
            />
        </div>
    );
}

function DroppableCell({ id, children, isConflict }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });

    const style: React.CSSProperties = {
        borderBottom: "1px solid #f1f5f9",
        borderRight: "1px solid #f1f5f9",
        verticalAlign: "top",
        padding: "6px",
        minHeight: "100px",
        transition: "all 0.15s ease",
        background: isOver ? (isConflict ? "#fef2f2" : "#f0fdf4") : "transparent",
        outline: isOver ? (isConflict ? "3px solid #ef4444" : "3px solid #22c55e") : "none",
        outlineOffset: "-3px",
    };

    return (
        <td ref={setNodeRef} style={style}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
        </td>
    );
}

export default function InteractiveEditor() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [tdGroups, setTdGroups] = useState<any[]>([]);
    const [moduleParts, setModuleParts] = useState<ModulePart[]>([]);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
    const [showFiliereAudit, setShowFiliereAudit] = useState(false);
    const [editingAsgn, setEditingAsgn] = useState<Assignment | null>(null);
    const [editData, setEditData] = useState<{ roomId: number | null; teacherId: number | null }>({ roomId: null, teacherId: null });
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [a, t, r, m, mp, ts, sec, tdg] = await Promise.all([
                getAssignments(), getTeachers(), getRooms(), getModules(),
                getModuleParts(), getTimeslots(), getSections(), getTDGroups()
            ]);
            setAssignments(a); setTeachers(t); setRooms(r); setModules(m);
            setModuleParts(mp); setTimeslots(ts); setSections(sec); setTdGroups(tdg);
            setSelectedId(curr => curr || (sec.length > 0 ? String(sec[0].id) : ""));
        } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
    }, []);

    const loadAudit = useCallback(async () => {
        if (!selectedId) return;
        try {
            const res = await auditSection(Number(selectedId), "interactive");
            setAuditResult(res);
        } catch (e) { console.error(e); }
    }, [selectedId]);

    const searchParams = useSearchParams();
    const algoType = searchParams.get("algo"); // ex: "ga_sa", "alns", "rl"

    const handleReset = async () => {
        const displayName = algoType?.toUpperCase().replace('_', '-') || 'Dernière valide';
        if (!confirm(`Voulez-vous restaurer la version originale de l'IA (${displayName}) ?`)) return;
        try { await resetAssignments(algoType || undefined); loadData(); } catch (e) { alert(e); }
    };

    const openEdit = async (asgn: Assignment) => {
        setEditingAsgn(asgn);
        setEditData({ roomId: asgn.room_id, teacherId: asgn.teacher_id });
        if (asgn.slot_id) {
            try {
                const res = await getAvailableResources(asgn.slot_id, asgn.id);
                setAvailableRooms(res.available_rooms || []);
                setAvailableTeachers(res.available_teachers || []);
            } catch { setAvailableRooms([]); setAvailableTeachers([]); }
        }
    };

    const saveEdit = async () => {
        if (!editingAsgn) return;
        setSaving(true);
        try {
            await updateAssignment(editingAsgn.id, { ...editingAsgn, room_id: editData.roomId, teacher_id: editData.teacherId ?? editingAsgn.teacher_id });
            setEditingAsgn(null);
            loadData(true);
        } catch (e) { alert(e); } finally { setSaving(false); }
    };

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadAudit(); }, [selectedId, assignments, loadAudit]);

    const modulePartById = useMemo(() => {
        const m: Record<number, ModulePart> = {};
        moduleParts.forEach(p => m[p.id] = p);
        return m;
    }, [moduleParts]);

    const moduleById = useMemo(() => {
        const m: Record<number, Module> = {};
        modules.forEach(mod => m[mod.id] = mod);
        return m;
    }, [modules]);

    const teacherById = useMemo(() => {
        const m: Record<number, Teacher> = {};
        teachers.forEach(t => m[t.id] = t);
        return m;
    }, [teachers]);

    const roomById = useMemo(() => {
        const m: Record<number, Room> = {};
        rooms.forEach(r => m[r.id] = r);
        return m;
    }, [rooms]);

    const sectionById = useMemo(() => {
        const m: Record<string, Section> = {};
        sections.forEach(s => { m[String(s.id)] = s; });
        return m;
    }, [sections]);

    function resolveCard(a: Assignment) {
        const part = modulePartById[a.module_part_id];
        const mod = part ? moduleById[part.module_id] : undefined;
        const teacher = teacherById[a.teacher_id];
        const room = a.room_id ? roomById[a.room_id] : undefined;
        const groupLabel = (part?.type.toLowerCase() !== 'cm') && a.td_groups && a.td_groups.length > 0
            ? a.td_groups.map(g => {
                const gid = typeof g === 'object' ? g.id : g;
                const found = tdGroups.find(tg => String(tg.id) === String(gid));
                if (!found) return "";
                const parts = found.name.split(" ");
                const grIndex = parts.findIndex((p: string) => p.toLowerCase() === "gr");
                return grIndex !== -1 ? parts.slice(grIndex).join(" ") : found.name;
            }).filter(n => n !== "").join('+') : null;
        const section = sectionById[String(a.section_id)];
        return { modName: mod?.name ?? "—", teacherName: teacher?.name ?? "—", roomName: room?.name ?? "—", type: part?.type ?? "CM", groupLabel, sectionName: section?.name ?? null };
    }

    function getCoursesAt(day: string, startTime: string): Assignment[] {
        return assignments.filter(a => {
            if (!a.slot_id) return false;
            const ts = timeslots.find(t => t.id === a.slot_id);
            if (!ts) return false;
            if (ts.day.toLowerCase().trim() !== day.toLowerCase().trim()) return false;
            if (!ts.start_time.startsWith(startTime)) return false;
            const isDirect = String(a.section_id) === String(selectedId);
            const isGroupLocal = a.td_groups?.some(g => {
                const gid = typeof g === 'object' ? g.id : g;
                const fullGroup = tdGroups.find(tg => String(tg.id) === String(gid));
                return fullGroup && String(fullGroup.section_id) === String(selectedId);
            });
            return isDirect || isGroupLocal;
        });
    }

    function getConflicts(a: Assignment, slotId: number | null): string[] {
        if (!slotId) return [];
        const errors: string[] = [];
        const ts = timeslots.find(t => t.id === slotId);
        const mp = moduleParts.find(p => p.id === a.module_part_id);
        if (!ts || !mp) return [];
        const profConflict = assignments.find(other => other.id !== a.id && other.slot_id === slotId && other.teacher_id === a.teacher_id && a.teacher_id !== 231);
        if (profConflict) errors.push("Professeur occupé.");
        const roomConflict = assignments.find(other => other.id !== a.id && other.slot_id === slotId && other.room_id === a.room_id && a.room_id !== null);
        if (roomConflict) errors.push("Salle occupée.");
        if (a.td_groups && a.td_groups.length > 0) {
            const grConflict = assignments.find(other => other.id !== a.id && other.slot_id === slotId && other.td_groups && other.td_groups.some(g1 => a.td_groups.some(g2 => g1.id === g2.id)));
            if (grConflict) errors.push("Groupe occupé.");
        }
        return errors;
    }

    const handleDragStart = (event: any) => setActiveAssignment(event.active.data.current.assignment);
    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveAssignment(null);
        if (!over || active.id === over.id) return;
        const asgn = active.data.current.assignment as Assignment;
        const targetId = over.id as string;
        if (targetId.startsWith("cell|")) {
            const [, day, time] = targetId.split("|");
            const newSlot = timeslots.find(ts => ts.day.trim().toLowerCase() === day.trim().toLowerCase() && ts.start_time.startsWith(time));
            if (!newSlot) return;
            setAssignments(prev => prev.map(a => a.id === asgn.id ? { ...a, slot_id: newSlot.id } : a));
            try { await updateAssignment(asgn.id, { ...asgn, slot_id: newSlot.id }); loadData(true); }
            catch (e) { console.error(e); loadData(); }
        }
    };

    const uniqueHours = Array.from(new Set(timeslots.map(t => t.start_time.substring(0, 5)))).sort();

    const S: Record<string, React.CSSProperties> = {
        page: { background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" },
        nav: { display: "flex", alignItems: "center", gap: 20, padding: "12px 40px", background: "white", borderBottom: "2px solid #e2e8f0" },
        select: { padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 10, minWidth: 240, fontWeight: 700 },
        main: { padding: "30px", maxWidth: 1600, margin: "0 auto" },
        gridBox: { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "auto" },
        table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 1000 },
        th: { background: "#f8fafc", padding: "12px", fontSize: "0.75rem", fontWeight: 900, color: "#64748b", borderBottom: "2px solid #e2e8f0" },
        timeCell: { padding: "15px", background: "#f8fafc", borderRight: "2px solid #e2e8f0", fontWeight: 800, color: "#1e293b", fontSize: "0.8rem", textAlign: "center" }
    };

    if (loading && assignments.length === 0) return <div style={{ padding: 100, textAlign: "center", fontWeight: 800 }}>Chargement...</div>;

    return (
        <div style={S.page}>
            <header style={S.nav}>
                <button onClick={() => router.push("/timetable/preview")} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", background: "#f8fafc", padding: "7px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                    <ArrowLeft size={16} /> Retour
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, color: "#1e3a8a" }}>Édition Manuelle</h1>
                </div>
                <button onClick={handleReset} style={{ background: "white", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 800, color: "#1e3a8a", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <RotateCcw size={14} /> Réinitialiser (Version IA)
                </button>
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={S.select}>
                    {sections.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
            </header>

            <main style={S.main}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {auditResult && (
                        <div className="audit-top-bar" style={{
                            display: 'flex', gap: '24px', background: 'white', marginBottom: '20px',
                            padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                            alignItems: 'center'
                        }}>
                            <div className="score-block" style={{ paddingRight: '24px', borderRight: '1px solid #f1f5f9', textAlign: 'center', minWidth: '140px' }}>
                                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px' }}>Score Global</span>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: auditResult.score > 80 ? '#16a34a' : auditResult.score > 60 ? '#f59e0b' : '#dc2626', margin: '4px 0' }}>
                                    {auditResult.score}%
                                </div>
                                <div style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', background: auditResult.score > 80 ? '#dcfce7' : auditResult.score > 60 ? '#fef3c7' : '#fef2f2', color: auditResult.score > 80 ? '#166534' : auditResult.score > 60 ? '#92400e' : '#991b1b' }}>
                                    {auditResult.status}
                                </div>
                            </div>

                            <div className="indicators-row" style={{ flex: 1, display: 'flex', gap: '30px' }}>
                                {Object.entries(auditResult.details || {}).map(([key, value]) => {
                                    const labels: any = {
                                        compacite: { title: "Compacité", desc: "Absence de trous" },
                                        pause_dejeuner: { title: "Pause Déjeuner", desc: "Respect du 12h30" },
                                        rythme_fatigue: { title: "Rythme & Samedi", desc: "Équilibre fin de journée" },
                                        pedagogie_cm: { title: "Pédagogie CM", desc: "Cours Magistraux le matin" }
                                    };
                                    const info = labels[key] || { title: key, desc: "" };
                                    const val = value as number;

                                    return (
                                        <div key={key} style={{ flex: 1, position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>{info.title}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>{Math.round(val)}%</span>
                                            </div>
                                            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${val}%`, height: '100%',
                                                    background: val > 85 ? '#22c55e' : val > 55 ? '#f59e0b' : '#ef4444',
                                                    transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                }}></div>
                                            </div>
                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>{info.desc}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={S.gridBox}>
                        <table style={S.table}>
                            <thead>
                                <tr><th style={S.th}>HEURE</th>{DAYS_ORDER.map(d => <th key={d} style={S.th}>{d}</th>)}</tr>
                            </thead>
                            <tbody>
                                {uniqueHours.map(time => (
                                    <tr key={time}>
                                        <td style={S.timeCell}>{time}</td>
                                        {DAYS_ORDER.map(day => (
                                            <DroppableCell key={`${day}-${time}`} id={`cell|${day}|${time}`}>
                                                {getCoursesAt(day, time).map(c => (
                                                    <DraggableCourse
                                                        key={c.id} assignment={c} {...resolveCard(c)}
                                                        conflicts={getConflicts(c, c.slot_id)}
                                                        onContextMenu={(e: React.MouseEvent, a: Assignment) => { e.preventDefault(); openEdit(a); }}
                                                    />
                                                ))}
                                            </DroppableCell>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeAssignment && <div style={{ width: 150 }}><CourseCard {...resolveCard(activeAssignment)} isOverlay /></div>}
                    </DragOverlay>
                </DndContext>
            </main>

            {editingAsgn && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setEditingAsgn(null)}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>{resolveCard(editingAsgn).modName}</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Clic droit — Modifier salle ou enseignant</p>

                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>SALLE DISPONIBLE</label>
                        <select value={editData.roomId ?? ''} onChange={e => setEditData(d => ({ ...d, roomId: e.target.value ? Number(e.target.value) : null }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontWeight: 700, fontSize: '0.85rem' }}>
                            <option value=''>— Aucune salle —</option>
                            {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type}) — {r.capacity} places</option>)}
                            {editingAsgn.room_id && !availableRooms.find(r => r.id === editingAsgn.room_id) && (
                                <option value={editingAsgn.room_id}>⚠️ {resolveCard(editingAsgn).roomName} (actuelle)</option>
                            )}
                        </select>

                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>ENSEIGNANT DISPONIBLE</label>
                        <select value={editData.teacherId ?? ''} onChange={e => setEditData(d => ({ ...d, teacherId: e.target.value ? Number(e.target.value) : null }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24, fontWeight: 700, fontSize: '0.85rem' }}>
                            <option value=''>— Même enseignant —</option>
                            {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingAsgn(null)}
                                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                            <button onClick={saveEdit} disabled={saving}
                                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                                {saving ? 'Enregistrement…' : '✓ Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}