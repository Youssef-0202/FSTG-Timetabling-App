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
    auditSection, AuditResult
} from "@/lib/api";

const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ─── Color map per type ───────────────────────────────────────────────────────
const TYPE_STYLES: Record<string, { border: string; bg: string; nameColor: string }> = {
    cm: { border: "#3b82f6", bg: "#eff6ff", nameColor: "#1e3a8a" },
    td: { border: "#22c55e", bg: "#f0fdf4", nameColor: "#1e3a8a" },
    tp: { border: "#ec4899", bg: "#fdf2f8", nameColor: "#1e3a8a" },
};
function typeStyle(type: string) {
    return TYPE_STYLES[type?.toLowerCase()] ?? TYPE_STYLES.cm;
}

// ─── Course Card (pure inline styles — no JSX scope issues) ──────────────────
function CourseCard({
    modName, teacherName, roomName, type, groupLabel,
    isDragging = false, isOverlay = false,
    dragListeners, dragRef, dragAttributes, transform,
    conflicts = [], isGhost = false, sectionName = null,
    showAudit = false,
}: {
    modName: string; teacherName: string; roomName: string; type: string; groupLabel?: string | null;
    isDragging?: boolean; isOverlay?: boolean;
    dragListeners?: object; dragRef?: (el: HTMLElement | null) => void;
    dragAttributes?: object; transform?: { x: number; y: number } | null;
    conflicts?: string[];
    isGhost?: boolean;
    sectionName?: string | null;
    showAudit?: boolean;
}) {
    const isGr6 = showAudit && (groupLabel?.toLowerCase().includes("gr 6") || groupLabel?.toLowerCase().includes("gr6"));
    const { border, bg, nameColor } = typeStyle(type);

    const finalBorder = isGr6 ? "#f97316" : border;
    const finalBg = isGr6 ? "#fff7ed" : bg;

    const hasConflicts = conflicts.length > 0;
    const conflictMsg = hasConflicts ? "CONFLITS :\n" + conflicts.map(c => "• " + c).join("\n") : "";

    const boxStyle: React.CSSProperties = {
        padding: "9px 10px",
        borderRadius: "8px",
        fontSize: "0.75rem",
        borderLeft: isGhost ? "5px solid #ef4444" : `5px solid ${finalBorder}`,
        border: hasConflicts ? "2px solid #ef4444" : isGhost ? '2px solid #ef4444' : (isGr6 ? "1px solid #fdba74" : undefined),
        boxShadow: hasConflicts ? "0 0 10px rgba(239, 68, 68, 0.15)" : isGhost ? '0 4px 6px -1px rgba(239, 68, 68, 0.1)' : undefined,
        background: isGhost ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : finalBg,
        cursor: isDragging ? "grabbing" : isGhost ? 'default' : "grab",
        opacity: isDragging && !isOverlay ? 0 : isGhost ? 0.72 : 1,
        userSelect: "none",
        position: "relative" as const,
        pointerEvents: isGhost && !isOverlay ? 'none' : 'auto',
        filter: isGhost ? 'grayscale(10%)' : 'none',
        ...(transform ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 1000,
        } : {}),
    };

    return (
        <div ref={dragRef} style={boxStyle} {...dragListeners} {...dragAttributes} title={isGhost ? `COURS DE LA SECTION : ${sectionName}` : conflictMsg}>
            {isGhost && (
                <div style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{sectionName || 'FILIÈRE'}</div>
            )}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4
            }}>
                <div style={{
                    fontWeight: 800, color: nameColor, lineHeight: 1.2, fontSize: "0.75rem", flex: 1
                }}>
                    {modName || "—"}
                </div>
                {hasConflicts && (
                    <div style={{ background: "#ef4444", color: "white", borderRadius: "50%", padding: "2px", marginRight: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AlertTriangle size={12} strokeWidth={3} />
                    </div>
                )}
                {groupLabel && (
                    <div style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: 'white', marginLeft: "4px" }}>
                        {groupLabel}
                    </div>
                )}
            </div>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ color: "#475569", textTransform: "uppercase", fontSize: "0.6rem" }}>
                    {teacherName ? `Pr. ${teacherName}` : "—"}
                </div>

                {/* Room on last line */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}>
                    <MapPin size={10} color="#94a3b8" /> {roomName || "—"}
                </div>
            </div>
        </div>
    );
}

function DraggableCourse({ assignment, modName, teacherName, roomName, type, groupLabel, conflicts, onContextMenu, isGhost = false, sectionName = null, showAudit = false }: {
    assignment: Assignment; modName: string; teacherName: string; roomName: string; type: string; groupLabel?: string | null;
    conflicts: string[];
    onContextMenu: (e: React.MouseEvent, asgn: Assignment) => void;
    isGhost?: boolean;
    sectionName?: string | null;
    showAudit?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `course-${assignment.id}`,
        data: { assignment },
        disabled: isGhost
    });

    return (
        <div onContextMenu={(e) => !isGhost && onContextMenu(e, assignment)}>
            <CourseCard
                modName={modName}
                teacherName={teacherName}
                roomName={roomName}
                type={type}
                groupLabel={groupLabel}
                isDragging={isDragging}
                dragRef={setNodeRef}
                dragListeners={listeners}
                dragAttributes={attributes}
                transform={transform}
                conflicts={conflicts}
                isGhost={isGhost}
                sectionName={sectionName}
                showAudit={showAudit}
            />
        </div>
    );
}

function DroppableCell({ id, children, isConflict }: { id: string; children: React.ReactNode; isConflict?: boolean }) {
    const { isOver, setNodeRef } = useDroppable({ id });

    let bgColor = "transparent";
    if (isOver) {
        bgColor = isConflict ? "#fef2f2" : "#f0fdf4";
    }

    return (
        <td
            ref={setNodeRef}
            style={{
                borderBottom: "1px solid #f1f5f9",
                borderRight: "1px solid #f1f5f9",
                verticalAlign: "top",
                padding: "6px",
                minHeight: "100px",
                background: bgColor,
                transition: "background 0.15s",
                border: isOver && isConflict ? "1px solid #ef4444" : undefined,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {children}
            </div>
        </td>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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
    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [editingAsgn, setEditingAsgn] = useState<Assignment | null>(null);
    const [editData, setEditData] = useState<{ roomId: number | null, slotId: number | null, teacherId: number }>({ roomId: null, slotId: null, teacherId: 0 });
    const [showFiliereAudit, setShowFiliereAudit] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    const searchParams = useSearchParams();
    const forcedMode = searchParams.get("mode") as "alns" | "rl" | "ga_sa" | null;

    const loadAudit = useCallback(async () => {
        if (!selectedId) return;
        try {
            const res = await auditSection(Number(selectedId), forcedMode || "db");
            setAuditResult(res);
        } catch (e) {
            console.error("Audit failed", e);
        }
    }, [selectedId, forcedMode]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const fetchAssignments = forcedMode ? getPreviewSchedule(forcedMode) : getAssignments();
            const [a, t, r, m, mp, ts, sec, tdg] = await Promise.all([
                fetchAssignments, getTeachers(), getRooms(), getModules(),
                getModuleParts(), getTimeslots(), getSections(), getTDGroups()
            ]);
            setAssignments(a); setTeachers(t); setRooms(r); setModules(m);
            setModuleParts(mp); setTimeslots(ts); setSections(sec);
            setTdGroups(tdg);
            if (sec.length > 0 && !selectedId) setSelectedId(String(sec[0].id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadAudit();
    }, [selectedId, assignments, loadAudit]);

    // Unique sorted time slots
    const uniqueHours = useMemo(() =>
        Array.from(new Set(timeslots.map(t => t.start_time.substring(0, 5)))).sort()
        , [timeslots]);

    // Helper lookups
    const modulePartById = useMemo(() => {
        const m: Record<number, ModulePart> = {};
        moduleParts.forEach(p => { m[p.id] = p; });
        return m;
    }, [moduleParts]);

    const moduleById = useMemo(() => {
        const m: Record<number, Module> = {};
        modules.forEach(mod => { m[mod.id] = mod; });
        return m;
    }, [modules]);

    const teacherById = useMemo(() => {
        const m: Record<number, Teacher> = {};
        teachers.forEach(t => { m[t.id] = t; });
        return m;
    }, [teachers]);

    const roomById = useMemo(() => {
        const m: Record<number, Room> = {};
        rooms.forEach(r => { m[r.id] = r; });
        return m;
    }, [rooms]);

    const sectionById = useMemo(() => {
        const m: Record<string, Section> = {};
        sections.forEach(s => { m[String(s.id)] = s; });
        return m;
    }, [sections]);

    // Resolve display data for an assignment
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
            }).filter(n => n !== "").join('+')
            : null;

        const section = sectionById[String(a.section_id)];

        return {
            modName: mod?.name ?? "—",
            teacherName: teacher?.name ?? "—",
            roomName: room?.name ?? "—",
            type: part?.type ?? "CM",
            groupLabel,
            sectionName: section?.name ?? null
        };
    }

    // Filter assignments for the selected section at a given day+time
    function getCoursesAt(day: string, startTime: string): Assignment[] {
        return assignments.filter(a => {
            const ts = timeslots.find(t => t.id === a.slot_id);
            if (!ts) return false;
            if (ts.day.toLowerCase().trim() !== day.toLowerCase().trim()) return false;
            if (!ts.start_time.startsWith(startTime)) return false;

            const mp = modulePartById[a.module_part_id];
            const isDirect = String(a.section_id) === String(selectedId);
            const isGroupLocal = a.td_groups?.some(g => {
                const gid = typeof g === 'object' ? g.id : g;
                const fullGroup = tdGroups.find(tg => String(tg.id) === String(gid));
                return fullGroup && String(fullGroup.section_id) === String(selectedId);
            });

            if (isDirect || isGroupLocal) return true;

            if (showFiliereAudit) {
                // Détection intelligente des cours communs (CM de la même filière) -> Affichés en NORMAL car partagés
                const selectedS = sectionById[String(selectedId)];
                if (!selectedS || !selectedS.groupes) return false;
                const localFiliereIds = selectedS.groupes.map(g => g.filiere_id);

                if (mp?.type === "CM") {
                    const courseSection = sectionById[String(a.section_id)];
                    if (courseSection && courseSection.groupes?.some(g => localFiliereIds.includes(g.filiere_id))) {
                        return true;
                    }
                }

                if (showFiliereAudit) {
                    const selectedS = sectionById[String(selectedId)];
                    if (!selectedS || !selectedS.groupes) return false;
                    const localFiliereIds = selectedS.groupes.map(g => g.filiere_id);
                    const currentSemester = selectedS.name.split(" ").pop();

                    // RÈGLE : Pas d'audit si on est en S4
                    if (currentSemester === "S4") return false;

                    const relatedSections = Object.values(sectionById).filter(s =>
                        String(s.id) !== String(selectedId) &&
                        s.groupes?.some(g => localFiliereIds.includes(g.filiere_id)) &&
                        s.name.split(" ").pop() !== currentSemester
                    );

                    const isBlueElsewhere = relatedSections.some(rs => {
                        const isForThisSection = String(a.section_id) === String(rs.id);
                        const isCMorSectionWide = mp?.type === "CM" || !a.td_groups || a.td_groups.length === 0;
                        return isForThisSection && isCMorSectionWide;
                    });

                    if (isBlueElsewhere) return true;

                    const isRelatedGr6 = a.td_groups?.some((g: any) => {
                        const gid = typeof g === 'object' ? g.id : g;
                        const found = tdGroups.find(tg => String(tg.id) === String(gid));
                        if (found && (found.name.toLowerCase().includes("gr 6") || found.name.toLowerCase().includes("gr6"))) {
                            const grSec = sectionById[String(found.section_id)];
                            return grSec && grSec.groupes?.some(fg => localFiliereIds.includes(fg.filiere_id)) && grSec.name.split(" ").pop() !== currentSemester;
                        }
                        return false;
                    });
                    if (isRelatedGr6) return true;
                }
            }

            return false;
        });
    }

    // ─── DIAGNOSTIC DES CONFLITS (HARD CONSTRAINTS) ──────────────────────────
    function getConflicts(a: Assignment, slotId: number | null): string[] {
        if (!slotId) return [];
        const errors: string[] = [];
        const ts = timeslots.find(t => t.id === slotId);
        const mp = moduleParts.find(p => p.id === a.module_part_id);
        const room = rooms.find(r => r.id === a.room_id);
        if (!ts || !mp) return [];

        // H1: Conflit Prof
        const profConflict = assignments.find(other =>
            other.id !== a.id &&
            other.slot_id === slotId &&
            other.teacher_id === a.teacher_id &&
            a.teacher_id !== 231 // Exclure prof générique
        );
        if (profConflict) errors.push("L'enseignant est déjà occupé sur ce créneau.");

        // H2: Conflit Salle
        const roomConflict = assignments.find(other =>
            other.id !== a.id &&
            other.slot_id === slotId &&
            other.room_id === a.room_id &&
            a.room_id !== null
        );
        if (roomConflict) errors.push("La salle est déjà occupée sur ce créneau.");

        // H3: Conflit Groupe (TD/TP)
        if (a.td_groups && a.td_groups.length > 0) {
            const groupConflict = assignments.find(other =>
                other.id !== a.id &&
                other.slot_id === slotId &&
                other.td_groups &&
                other.td_groups.some(g1 => a.td_groups.some(g2 => g1.id === g2.id))
            );
            if (groupConflict) errors.push("Un des groupes est déjà en cours sur ce créneau.");
        }

        // H4: Capacité
        if (room && mp.weekly_hours > 0) { // On utilise weekly_hours comme proxy si group_size n'est pas dispo
            // En réalité il faudrait mp.group_size. Vérifions si on l'a dans l'interface (voir schema.py)
        }

        // H12: CM le Samedi
        if (ts.day === "SAMEDI" && mp.type === "CM") {
            errors.push("Interdiction de placer un CM le samedi.");
        }

        return errors;
    }

    const handleDragStart = (event: any) => {
        setActiveAssignment(event.active.data.current.assignment);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveAssignment(null);
        if (!over || active.id === over.id) return;

        const asgn = active.data.current.assignment as Assignment;
        const [, day, time] = (over.id as string).split("|");

        const newSlot = timeslots.find(
            ts =>
                ts.day.trim().toLowerCase() === day.trim().toLowerCase() &&
                ts.start_time.startsWith(time)
        );

        if (!newSlot) return;

        // 1. Optimistic update (Mise à jour visuelle immédiate)
        setAssignments(prev =>
            prev.map(a => a.id === asgn.id ? { ...a, slot_id: newSlot.id } : a)
        );

        // 2. Persistence
        // Si on est en mode Aperçu (forcedMode), on ne tente pas l'update en DB pour éviter le crash/rollback
        if (forcedMode) {
            console.log("Modification locale de l'aperçu conservée.");
            return;
        }

        try {
            await updateAssignment(asgn.id, {
                ...asgn,
                slot_id: newSlot.id,
                tdgroup_ids: asgn.td_groups?.map(g => g.id) ?? [],
            });
        } catch (error) {
            console.error("Échec de la mise à jour DB, rollback...", error);
            loadData(); // On ne fait le rollback que si la DB est vraiment concernée
        }
    };

    // ── Styles (all inline / module-safe) ─────────────────────────────────────
    const S = {
        page: {
            background: "#f8fafc",
            minHeight: "100vh",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        } as React.CSSProperties,

        nav: {
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "12px 40px",
            background: "white",
            borderBottom: "2px solid #e2e8f0",
        } as React.CSSProperties,

        backBtn: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "7px 14px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "#64748b",
            cursor: "pointer",
        } as React.CSSProperties,

        titleH1: {
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 900,
            color: "#1e3a8a",
        } as React.CSSProperties,

        titleP: {
            margin: 0,
            fontSize: "0.75rem",
            color: "#94a3b8",
        } as React.CSSProperties,

        select: {
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            minWidth: 240,
            fontWeight: 700,
            outline: "none",
            fontSize: "0.875rem",
        } as React.CSSProperties,

        main: {
            padding: "30px",
            maxWidth: 1600,
            margin: "0 auto",
        } as React.CSSProperties,

        gridBox: {
            background: "white",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        } as React.CSSProperties,

        table: {
            width: "100%",
            borderCollapse: "collapse" as const,
            tableLayout: "fixed" as const,
            minWidth: 1100,
        } as React.CSSProperties,

        th: {
            background: "#f8fafc",
            padding: "12px",
            fontSize: "0.75rem",
            color: "#475569",
            borderBottom: "1px solid #e2e8f0",
            borderRight: "1px solid #cbd5e1",
            textAlign: "center" as const,
            fontWeight: 900,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
        } as React.CSSProperties,

        timeCell: {
            width: 100,
            fontWeight: 800,
            textAlign: "center" as const,
            background: "#f8fafc",
            color: "#1e293b",
            borderRight: "2px solid #cbd5e1",
            borderBottom: "1px solid #cbd5e1",
            fontSize: "0.8rem",
            whiteSpace: "nowrap" as const,
            padding: "0 8px",
        } as React.CSSProperties,

        loading: {
            textAlign: "center" as const,
            padding: 100,
            color: "#64748b",
            fontSize: "1rem",
        } as React.CSSProperties,
    };

    const overlayCard = activeAssignment ? resolveCard(activeAssignment) : null;

    return (
        <div style={S.page}>
            {/* Header */}
            <header style={S.nav}>
                <button onClick={() => router.push("/timetable/preview")} style={S.backBtn}>
                    <ArrowLeft size={16} /> Retour
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <h1 style={S.titleH1}>Édition Manuelle</h1>
                    {forcedMode && (
                        <div style={{
                            background: forcedMode === 'alns' ? '#7c3aed' : forcedMode === 'rl' ? '#d97706' : '#2563eb',
                            color: 'white',
                            padding: '2px 10px',
                            borderRadius: '20px',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                        }}>
                            {forcedMode.replace("_", "+")} Agent
                        </div>
                    )}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                        onClick={loadData}
                        style={{
                            background: "white",
                            border: "1px solid #e2e8f0",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color: "#64748b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}
                    >
                        <RotateCcw size={14} /> Réinitialiser
                    </button>

                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                            background: showFiliereAudit ? '#fee2e2' : '#f1f5f9',
                            borderRadius: '10px', border: `1px solid ${showFiliereAudit ? '#fca5a5' : '#e2e8f0'}`,
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
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: showFiliereAudit ? '#b91c1c' : '#64748b', cursor: 'inherit', userSelect: 'none' }}>
                            Audit Filière
                        </label>
                    </div>

                    <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        style={S.select}
                    >
                        {sections.map(s => (
                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Audit Bar */}
            {auditResult && (
                <div style={{
                    display: 'flex', gap: '24px', background: 'white', margin: '0 24px 20px 24px',
                    padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ paddingRight: '20px', borderRight: '1px solid #f1f5f9', textAlign: 'center', minWidth: '120px' }}>
                        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>Score Qualité</span>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: auditResult.score > 75 ? '#16a34a' : auditResult.score > 50 ? '#d97706' : '#dc2626', margin: '2px 0' }}>
                            {auditResult.score}%
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: '30px' }}>
                        {Object.entries(auditResult.details || {}).map(([key, value]) => (
                            <div key={key} style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 800, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                                    <span>{key}</span>
                                    <span>{value}%</span>
                                </div>
                                <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${value}%`, height: '100%',
                                        background: value > 80 ? '#22c55e' : value > 50 ? '#eab308' : '#ef4444',
                                        transition: 'width 0.4s'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid */}
            <main style={S.main}>
                {loading ? (
                    <div style={S.loading}>Chargement…</div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div style={S.gridBox}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        <th style={{ ...S.th, width: 100 }}>HEURE</th>
                                        {DAYS_ORDER.map(d => (
                                            <th key={d} style={S.th}>{d.toUpperCase()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueHours.map(time => (
                                        <tr key={time}>
                                            {/* Time label */}
                                            <td style={S.timeCell}>
                                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                                    <Clock size={12} color="#94a3b8" /> {time}
                                                </span>
                                            </td>

                                            {DAYS_ORDER.map(day => {
                                                const courses = getCoursesAt(day, time);
                                                const cellId = `cell|${day}|${time}`;

                                                // Check if dragging course has conflict in this cell
                                                let cellIsConflict = false;
                                                if (activeAssignment) {
                                                    const targetTs = timeslots.find(t =>
                                                        t.day.toLowerCase().trim() === day.toLowerCase().trim() &&
                                                        t.start_time.startsWith(time)
                                                    );
                                                    if (targetTs) {
                                                        const errors = getConflicts(activeAssignment, targetTs.id);
                                                        cellIsConflict = errors.length > 0;
                                                    }
                                                }

                                                return (
                                                    <DroppableCell key={cellId} id={cellId} isConflict={cellIsConflict}>
                                                        {courses.map(c => {
                                                            const card = resolveCard(c);
                                                            const conflicts = getConflicts(c, c.slot_id);
                                                            const isDirect = String(c.section_id) === String(selectedId);
                                                            const isGroupLocal = c.td_groups?.some(g => {
                                                                const gid = typeof g === 'object' ? g.id : g;
                                                                const found = tdGroups.find(tg => String(tg.id) === String(gid));
                                                                return found && String(found.section_id) === String(selectedId);
                                                            });

                                                            let isGhost = false;
                                                            let ghostSectionName = card.sectionName;

                                                            if (showFiliereAudit && !isDirect && !isGroupLocal) {
                                                                isGhost = true;
                                                                const selectedS = sections.find(s => String(s.id) === String(selectedId));
                                                                if (selectedS?.groupes) {
                                                                    const localFiliereIds = selectedS.groupes.map(fg => fg.filiere_id);
                                                                    const currentSem = selectedS.name.split(" ").pop();
                                                                    const mp = moduleParts.find(p => p.id === c.module_part_id);

                                                                    // Sections de l'autre niveau
                                                                    const otherLevelSections = sections.filter(s =>
                                                                        s.groupes?.some(g => localFiliereIds.includes(g.filiere_id)) &&
                                                                        s.name.split(" ").pop() !== currentSem
                                                                    );

                                                                    const sharingSections = otherLevelSections.filter(rs => {
                                                                        const isDirectMatch = String(c.section_id) === String(rs.id) && (mp?.type === "CM" || !c.td_groups || c.td_groups.length === 0);
                                                                        if (isDirectMatch) return true;
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

                                                            return (
                                                                <DraggableCourse
                                                                    key={c.id}
                                                                    assignment={c}
                                                                    modName={card.modName}
                                                                    teacherName={card.teacherName}
                                                                    roomName={card.roomName}
                                                                    type={card.type}
                                                                    groupLabel={card.groupLabel}
                                                                    conflicts={conflicts}
                                                                    isGhost={isGhost}
                                                                    sectionName={isGhost ? ghostSectionName : card.sectionName}
                                                                    showAudit={showFiliereAudit}
                                                                    onContextMenu={(e, asgn) => {
                                                                        e.preventDefault();
                                                                        setEditingAsgn(asgn);
                                                                        setEditData({ roomId: asgn.room_id, slotId: asgn.slot_id, teacherId: asgn.teacher_id });
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </DroppableCell>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Drag ghost */}
                        <DragOverlay dropAnimation={null}>
                            {overlayCard && activeAssignment && (
                                <div style={{ width: 160 }}>
                                    <CourseCard
                                        modName={overlayCard.modName}
                                        teacherName={overlayCard.teacherName}
                                        roomName={overlayCard.roomName}
                                        type={overlayCard.type}
                                        isOverlay
                                    />
                                </div>
                            )}
                        </DragOverlay>
                        {/* Quick Edit Modal */}
                        {editingAsgn && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: 'white', borderRadius: '16px', width: '560px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                                    <div style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Ajustement Rapide</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Configurez manuellement les ressources pour cette séance.</p>
                                    </div>
                                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ display: 'flex', gap: '20px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Salle Imposée</label>
                                                <div style={{ position: 'relative' }}>
                                                    <select
                                                        value={editData.roomId || ""}
                                                        onChange={e => setEditData({ ...editData, roomId: Number(e.target.value) || null })}
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white', appearance: 'none' }}
                                                    >
                                                        <option value="">-- Choisir --</option>
                                                        {rooms.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name} (Cap. {r.capacity})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Enseignant Imposé</label>
                                                <select
                                                    value={editData.teacherId}
                                                    onChange={e => setEditData({ ...editData, teacherId: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                                                >
                                                    {teachers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Créneau Imposé</label>
                                            <select
                                                value={editData.slotId || ""}
                                                onChange={e => setEditData({ ...editData, slotId: Number(e.target.value) || null })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                                            >
                                                {timeslots
                                                    .sort((a, b) => (DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day)) || a.start_time.localeCompare(b.start_time))
                                                    .map(ts => (
                                                        <option key={ts.id} value={ts.id}>{ts.day} - {ts.start_time.substring(0, 5)}</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button onClick={() => setEditingAsgn(null)} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // On persiste dans l'API
                                                    await updateAssignment(editingAsgn.id, {
                                                        room_id: editData.roomId,
                                                        slot_id: editData.slotId,
                                                        teacher_id: editData.teacherId
                                                    });
                                                    // On met à jour l'UI
                                                    setAssignments(prev => prev.map(a => a.id === editingAsgn.id ? { ...a, room_id: editData.roomId, slot_id: editData.slotId, teacher_id: editData.teacherId } : a));
                                                    setEditingAsgn(null);
                                                } catch (err) {
                                                    alert("Erreur lors de la sauvegarde : " + err);
                                                }
                                            }}
                                            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                        >Valider</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DndContext>
                )}
            </main>
        </div>
    );
}