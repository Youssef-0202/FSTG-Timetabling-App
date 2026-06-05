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
import { Clock, MapPin, ArrowLeft, CheckCircle, RotateCcw, AlertTriangle, FileText, XCircle, AlertCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
    getAssignments, Assignment,
    getTeachers, Teacher,
    getRooms, Room,
    getModules, Module,
    getModuleParts, ModulePart,
    getTimeslots, Timeslot,
    getSections, Section, getTDGroups, getSectionSanctuarizations,
    updateAssignment, getPreviewSchedule,
    auditSection, AuditResult, getAvailableResources, resetAssignments, saveManualSession, getTimetableResult
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
    conflicts = { hard: [], warnings: [] }, isGhost = false, sectionName = null,
    showAudit = false, isLocked = false
}: any) {
    const isGr6 = showAudit && (groupLabel?.toLowerCase().includes("gr 6") || groupLabel?.toLowerCase().includes("gr6"));
    const { border, bg, nameColor } = typeStyle(type);
    const finalBorder = isGr6 ? "#f97316" : border;
    const finalBg = isGr6 ? "#fff7ed" : bg;

    const hardErr = (conflicts.hard || []).length > 0;
    const warnErr = (conflicts.warnings || []).length > 0;
    const conflictMsg = [...(conflicts.hard || []), ...(conflicts.warnings || [])].join("\n• ");

    const boxStyle: React.CSSProperties = {
        padding: "9px 10px", borderRadius: "8px", fontSize: "0.75rem",
        borderLeft: isGhost ? "5px solid #ef4444" : `5px solid ${finalBorder}`,
        border: hardErr ? "2px solid #ef4444" : warnErr ? "2px solid #f59e0b" : isGhost ? '2px solid #ef4444' : (isGr6 ? "1px solid #fdba74" : undefined),
        background: isGhost ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : finalBg,
        cursor: isDragging ? "grabbing" : (isGhost || isLocked) ? 'default' : "grab",
        opacity: isDragging && !isOverlay ? 0 : isGhost ? 0.72 : 1,
        position: "relative" as const,
        transition: transform ? 'none' : 'all 0.2s',
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000 } : {}),
    };

    return (
        <div ref={dragRef} style={boxStyle} {...dragListeners} {...dragAttributes} title={isGhost ? `COURS DE LA SECTION : ${sectionName}` : conflictMsg}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 800, color: nameColor, lineHeight: 1.2, fontSize: "0.75rem", flex: 1 }}>
                    {modName || "—"}
                </div>
                {hardErr && <div style={{ background: "#ef4444", color: "white", borderRadius: "50%", padding: "2px", marginRight: 4 }}><AlertTriangle size={12} strokeWidth={3} /></div>}
                {!hardErr && warnErr && <div style={{ background: "#f59e0b", color: "white", borderRadius: "50%", padding: "2px", marginRight: 4 }}><AlertTriangle size={12} strokeWidth={3} /></div>}
                {groupLabel && <div style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: 'white', marginLeft: "4px" }}>{groupLabel}</div>}
            </div>

            {isLocked && (
                <div style={{ position: 'absolute', bottom: '6px', right: '6px', opacity: 0.8 }}>
                    <Lock size={12} color="#ef4444" strokeWidth={3} />
                </div>
            )}
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
        disabled: isGhost || assignment.is_locked
    });
    return (
        <div
            onClick={() => !isGhost && onContextMenu(null as any, assignment)}
            onContextMenu={(e) => !isGhost && onContextMenu(e, assignment)}
        >
            <CourseCard
                modName={modName} teacherName={teacherName} roomName={roomName} type={type} groupLabel={groupLabel}
                isDragging={isDragging} dragRef={setNodeRef} dragListeners={listeners} dragAttributes={attributes}
                transform={transform} conflicts={conflicts} isGhost={isGhost} sectionName={sectionName} showAudit={showAudit}
                isLocked={assignment.is_locked}
            />
        </div>
    );
}

function DroppableCell({ id, children, status = 'default' }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });

    const bgMap: Record<string, string> = {
        'default': isOver ? "#f0fdf4" : "transparent", // Green if safe
        'warning': isOver ? "#fffbeb" : "transparent", // Orange if warning
        'hard': isOver ? "#fef2f2" : "transparent",    // Red if hard
    };

    const borderMap: Record<string, string> = {
        'default': isOver ? "3px solid #22c55e" : "none",
        'warning': isOver ? "3px solid #f59e0b" : "none",
        'hard': isOver ? "3px solid #ef4444" : "none",
    };

    return (
        <td ref={setNodeRef} style={{
            borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9",
            verticalAlign: "top", padding: "6px", minHeight: "100px", transition: "all 0.15s ease",
            background: bgMap[status],
            outline: borderMap[status], outlineOffset: "-3px",
        }}>
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
    const [editData, setEditData] = useState<{ roomId: number | null; teacherId: number | null; isLocked: boolean }>({ roomId: null, teacherId: null, isLocked: false });
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
    const [saving, setSaving] = useState(false);
    const [validationResult, setValidationResult] = useState<{ hard: string[], warnings: string[] } | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [allSanctuRules, setAllSanctuRules] = useState<any[]>([]);

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

            // Charger TOUTES les sanctuarisations (un peu gourmand mais efficace pour le drag&drop global)
            const sanctuRequests = sec.map(s => getSectionSanctuarizations(s.id));
            const allRulesArrays = await Promise.all(sanctuRequests);
            setAllSanctuRules(allRulesArrays.flat());

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
    const editId = searchParams.get("edit_id") ? Number(searchParams.get("edit_id")) : null;
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Initialisation du nom par défaut ou récupération de l'ancien nom
    useEffect(() => {
        if (editId) {
            getTimetableResult(editId).then(res => {
                if (res && res.name) setSaveName(res.name);
            }).catch(console.error);
        } else {
            const now = new Date();
            const dateStr = now.toLocaleDateString('fr-FR');
            const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            setSaveName(`Version du ${dateStr} ${timeStr}`);
        }
    }, [editId]);

    const handleReset = async () => {
        const displayName = algoType?.toUpperCase().replace('_', '-') || 'Dernière valide';
        if (!confirm(`Voulez-vous restaurer la version originale de l'IA (${displayName}) ?`)) return;
        try { await resetAssignments(algoType || undefined); loadData(); } catch (e) { alert(e); }
    };

    const openEdit = async (asgn: Assignment) => {
        setEditingAsgn(asgn);
        setEditData({ roomId: asgn.room_id, teacherId: asgn.teacher_id, isLocked: asgn.is_locked });
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
            // Création d'un objet propre pour l'API (AssignmentCreate)
            const payload = {
                module_part_id: editingAsgn.module_part_id,
                teacher_id: editData.teacherId ?? editingAsgn.teacher_id,
                room_id: editData.roomId,
                slot_id: editingAsgn.slot_id,
                section_id: editingAsgn.section_id,
                is_locked: editData.isLocked,
                tdgroup_ids: editingAsgn.td_groups?.map(g => typeof g === 'object' ? g.id : g) || []
            };

            await updateAssignment(editingAsgn.id, payload as any);
            setEditingAsgn(null);
            await loadData(true); // Recharger les données pour rafraîchir l'UI
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la mise à jour");
        } finally { setSaving(false); }
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

    function getConflicts(a: Assignment, slotId: number | null) {
        const result = { hard: [] as string[], warnings: [] as string[] };
        if (!slotId) return result;

        const ts = timeslots.find(t => t.id === slotId);
        const mp = moduleParts.find(p => p.id === a.module_part_id);
        const room = a.room_id ? roomById[a.room_id] : null;
        const teacher = teacherById[a.teacher_id];
        if (!ts || !mp) return result;

        // 1. HARD CONSTRAINTS (RED)
        // H1: Prof collision
        const profColl = assignments.find(o => o.id !== a.id && o.slot_id === slotId && o.teacher_id === a.teacher_id && a.teacher_id !== 231);
        if (profColl) result.hard.push("Collision Professeur.");

        // H2: Room collision
        const roomColl = assignments.find(o => o.id !== a.id && o.slot_id === slotId && o.room_id === a.room_id && a.room_id !== null);
        if (roomColl) result.hard.push("Collision Salle.");

        // H3: Group collision
        if (a.td_groups && a.td_groups.length > 0) {
            const grColl = assignments.find(o => o.id !== a.id && o.slot_id === slotId && o.td_groups?.some(g1 => a.td_groups.some(g2 => (g1.id || g1) === (g2.id || g2))));
            if (grColl) result.hard.push("Collision Groupe étudiant.");
        }

        // H4: Physical Capacity
        const mSize = a.td_groups?.reduce((acc, g) => acc + (g.size || 0), 0) || (mp.type === 'CM' ? (sectionById[String(a.section_id)]?.total_capacity || 200) : 40);
        if (room && room.capacity < mSize) result.hard.push(`Capacité salle insuffisante (${room.capacity} < ${mSize}).`);

        // H9: Teacher Unavailability
        const unSlots = (teacher?.availabilities as any)?.unavailable_slots || [];
        if (unSlots.includes(slotId)) result.hard.push("Professeur indisponible.");

        // 2. WARNING CONSTRAINTS (ORANGE)
        // H10: Room Type
        if (room && mp.required_room_type && room.type !== mp.required_room_type) {
            result.warnings.push(`Type de salle incorrect (Attendu: ${mp.required_room_type}).`);
        }

        // H12: CM on Saturday
        if (ts.day.toUpperCase() === "SAMEDI" && mp.type === "CM") {
            result.warnings.push("CM le samedi déconseillé.");
        }

        // H13/H14: Related Sections (Simplified)
        const myFiliereIds = sectionById[String(a.section_id)]?.groupes?.map(g => g.filiere_id) || [];
        if (myFiliereIds.length > 0 && (mp.type === 'CM' || (a.td_groups?.some(g => (g.name || "").includes("Gr 6") || (g.name || "").includes("Gr6"))))) {
            const relConflict = assignments.find(o => {
                if (o.id === a.id || o.slot_id !== slotId) return false;
                const oSec = sectionById[String(o.section_id)];
                const oMp = moduleParts.find(p => p.id === o.module_part_id);
                if (!oSec || !oMp) return false;
                const isORelevant = oMp.type === 'CM' || o.td_groups?.some(g => (g.name || "").includes("Gr 6") || (g.name || "").includes("Gr6"));
                if (!isORelevant) return false;
                return oSec.groupes?.some(g => myFiliereIds.includes(g.filiere_id));
            });
            if (relConflict) result.warnings.push("Conflit de filière (Tronc commun / Année liée).");
        }

        // H15: TP Sanctuarization (NEW)
        const isMorningStatus = ts.start_time.startsWith("08:") || ts.start_time.startsWith("10:");
        const isAfternoonStatus = ts.start_time.startsWith("14:") || ts.start_time.startsWith("16:");

        // Si ce n'est ni un créneau de pur matin ni de pur après-midi (ex: 12:30), on ne bloque pas
        if (isMorningStatus || isAfternoonStatus) {
            const myGroupIds = a.td_groups?.map(g => typeof g === 'object' ? g.id : g) || [];
            const groupsToCheck = mp.type === 'CM'
                ? tdGroups.filter(g => Number(g.section_id) === Number(a.section_id)).map(g => g.id)
                : myGroupIds;

            const tpConflict = allSanctuRules.find(r =>
                groupsToCheck.includes(r.group_id) &&
                r.day.toUpperCase() === ts.day.toUpperCase() &&
                r.is_morning === isMorningStatus
            );

            if (tpConflict) {
                const gName = tdGroups.find(g => g.id === tpConflict.group_id)?.name || "du groupe";
                result.hard.push(`Conflit TP : Créneau réservé pour les TP ${gName}.`);
            }
        }

        return result;
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

    if (loading && assignments.length === 0) return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f8fafc', color: '#1e3a8a', fontWeight: 800, fontSize: '1.2rem'
        }}>
            Initialisation de l&apos;Éditeur...
        </div>
    );

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
            {/* 1. SUB-HEADER COMPACT */}
            <div className="sub-header" style={{ padding: "80px 20px 70px" }}>
                <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, letterSpacing: '-0.025em' }}>
                    Édition Manuelle
                </h1>
                <p style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '4px' }}>
                    Ajustez votre planning par simple Glisser-Déposer
                </p>
            </div>

            <div className="content-wrapper" style={{
                maxWidth: "1600px",
                margin: "-50px auto 0",
                padding: "0 20px 40px",
                position: "relative",
                zIndex: 10
            }}>
                {/* 2. TOP-BAR HARMONISÉE */}
                <div className="top-bar" style={{
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    background: 'white',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    {/* GAUCHE : Retour */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => router.push("/timetable/preview")}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '0 16px', height: '42px', borderRadius: '10px',
                                border: '1.5px solid #e2e8f0', background: 'white',
                                color: '#475569', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s', fontSize: '0.82rem'
                            }}
                        >
                            <ArrowLeft size={16} /> Retour
                        </button>
                    </div>

                    {/* MILIEU : Actions Système */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleReset}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '0 16px', height: '42px', borderRadius: '10px',
                                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                color: '#1e3a8a', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s', fontSize: '0.82rem'
                            }}
                        >
                            <RotateCcw size={16} /> Réinitialiser
                        </button>
                        <button
                            onClick={() => {
                                const allHard: string[] = [];
                                const allWarn: string[] = [];
                                assignments.forEach(asgn => {
                                    const res = getConflicts(asgn, asgn.slot_id);
                                    res.hard.forEach(e => { if (!allHard.includes(e)) allHard.push(e); });
                                    res.warnings.forEach(w => { if (!allWarn.includes(w)) allWarn.push(w); });
                                });

                                if (allHard.length > 0 || allWarn.length > 0) {
                                    setValidationResult({ hard: allHard, warnings: allWarn });
                                    setShowValidationModal(true);
                                } else {
                                    setShowSaveModal(true);
                                }
                            }}
                            disabled={isSaving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '0 16px', height: '42px', borderRadius: '10px',
                                border: 'none', background: '#10b981',
                                color: 'white', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s', fontSize: '0.82rem',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                opacity: isSaving ? 0.6 : 1
                            }}
                        >
                            {isSaving ? <Clock className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            Enregistrer la Version Finale
                        </button>
                    </div>

                    {/* DROITE : Sélecteur de Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            style={{
                                height: '42px', padding: '0 12px', borderRadius: '10px',
                                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                fontSize: '0.82rem', fontWeight: 700, color: '#1e293b',
                                outline: 'none', cursor: 'pointer', minWidth: '180px'
                            }}
                        >
                            {sections.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 3. GRILLE DE DRAG & DROP */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {auditResult && (
                        <div className="audit-top-bar" style={{
                            display: 'flex', gap: '24px', background: 'white', marginBottom: '24px',
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

                    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 1000 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '85px', padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' }}>HEURE</th>
                                    {DAYS_ORDER.map(d => (
                                        <th key={d} style={{ padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#475569', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', textTransform: 'uppercase', textAlign: 'center' }}>
                                            {d}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueHours.map(time => (
                                    <tr key={time}>
                                        <td style={{ textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '2px solid #cbd5e1', padding: '15px', fontWeight: 800, color: '#1e293b', fontSize: '0.8rem' }}>
                                            {time}
                                        </td>
                                        {DAYS_ORDER.map(day => {
                                            const slot = timeslots.find(ts => ts.day.trim().toLowerCase() === day.trim().toLowerCase() && ts.start_time.startsWith(time));
                                            const confs = activeAssignment && slot ? getConflicts(activeAssignment, slot.id) : null;
                                            let status = 'default';
                                            if (confs) {
                                                if (confs.hard.length > 0) status = 'hard';
                                                else if (confs.warnings.length > 0) status = 'warning';
                                            }

                                            return (
                                                <DroppableCell key={`${day}-${time}`} id={`cell|${day}|${time}`} status={status}>
                                                    {getCoursesAt(day, time).map(c => (
                                                        <DraggableCourse
                                                            key={c.id} assignment={c} {...resolveCard(c)}
                                                            conflicts={getConflicts(c, c.slot_id)}
                                                            onContextMenu={(e: React.MouseEvent, asgn: Assignment) => {
                                                                if (e) e.preventDefault();
                                                                openEdit(asgn);
                                                            }}
                                                        />
                                                    ))}
                                                </DroppableCell>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeAssignment && <div style={{ width: 150 }}><CourseCard {...resolveCard(activeAssignment)} isOverlay /></div>}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* MODALE D'ÉDITION ÉLÉGANTE */}
            {editingAsgn && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                }} onClick={() => setEditingAsgn(null)}>
                    <div style={{
                        background: 'white', padding: '32px', borderRadius: '24px',
                        width: '100%', maxWidth: '420px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                            {resolveCard(editingAsgn).modName}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
                            Modifier les ressources pour ce créneau
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Salle</label>
                            <select
                                value={editData.roomId ?? ''}
                                onChange={e => setEditData(d => ({ ...d, roomId: e.target.value ? Number(e.target.value) : null }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                            >
                                <option value=''>— Aucune salle —</option>
                                {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type}) • {r.capacity} pl.</option>)}
                                {editingAsgn.room_id && !availableRooms.find(r => r.id === editingAsgn.room_id) && (
                                    <option value={editingAsgn.room_id}>⚠️ {resolveCard(editingAsgn).roomName} (Actuelle)</option>
                                )}
                            </select>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Enseignant</label>
                            <select
                                value={editData.teacherId ?? ''}
                                onChange={e => setEditData(d => ({ ...d, teacherId: e.target.value ? Number(e.target.value) : null }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                            >
                                <option value=''>— Même enseignant —</option>
                                {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div
                            onClick={() => setEditData(d => ({ ...d, isLocked: !d.isLocked }))}
                            style={{
                                marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 18px', borderRadius: '16px', background: editData.isLocked ? '#fefce8' : '#f8fafc',
                                border: editData.isLocked ? '1.5px solid #fde047' : '1.5px solid #e2e8f0',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: editData.isLocked ? '#facc15' : '#e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: editData.isLocked ? 'white' : '#64748b'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Séance Fixée</div>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Cocher pour geler ce créneau</div>
                                </div>
                            </div>
                            <div style={{
                                width: '40px', height: '22px', borderRadius: '20px',
                                background: editData.isLocked ? '#22c55e' : '#cbd5e1',
                                position: 'relative', transition: 'all 0.3s'
                            }}>
                                <div style={{
                                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                                    position: 'absolute', top: '3px', left: editData.isLocked ? '21px' : '3px',
                                    transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setEditingAsgn(null)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', background: 'white',
                                    color: '#64748b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                style={{
                                    flex: 1.5, padding: '12px', borderRadius: '12px',
                                    border: 'none', background: '#3b82f6',
                                    color: 'white', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                {saving ? 'Enregistrement...' : '✓ Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE DE VALIDATION (BLOQUANTE OU WARNING) */}
            {showValidationModal && validationResult && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 3000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: 'white', padding: '40px', borderRadius: '32px',
                            width: '100%', maxWidth: '500px', textAlign: 'center',
                            boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)',
                        }}
                    >
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: validationResult.hard.length > 0 ? '#fee2e2' : '#fef3c7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            {validationResult.hard.length > 0
                                ? <XCircle size={40} color="#ef4444" />
                                : <AlertTriangle size={40} color="#f59e0b" />
                            }
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px' }}>
                            {validationResult.hard.length > 0 ? "Action Requise" : "Avertissement"}
                        </h2>

                        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
                            {validationResult.hard.length > 0
                                ? `Le planning contient ${validationResult.hard.length} conflit(s) majeur(s). Merci de les corriger avant de sauvegarder.`
                                : `Le planning est valide, mais contient ${validationResult.warnings.length} avertissement(s) pédagogique(s).`
                            }
                        </p>

                        <div style={{
                            background: '#f8fafc', padding: '16px', borderRadius: '16px',
                            textAlign: 'left', marginBottom: '32px', maxHeight: '150px', overflowY: 'auto'
                        }}>
                            {validationResult.hard.map((e, i) => (
                                <div key={i} style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>• {e}</div>
                            ))}
                            {validationResult.warnings.map((e, i) => (
                                <div key={i} style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>• {e}</div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button
                                onClick={() => setShowValidationModal(false)}
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid #e2e8f0',
                                    background: 'white', fontWeight: 800, cursor: 'pointer'
                                }}
                            >
                                {validationResult.hard.length > 0 ? "Retour à l'édition" : "Annuler"}
                            </button>

                            {validationResult.hard.length === 0 && (
                                <button
                                    onClick={() => {
                                        setShowValidationModal(false);
                                        setShowSaveModal(true);
                                    }}
                                    style={{
                                        flex: 1.2, padding: '14px', borderRadius: '14px', border: 'none',
                                        background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer',
                                        boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                                    }}
                                >
                                    Continuer & Nommer
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODALE DE SAUVEGARDE FINALE */}
            {showSaveModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, padding: '20px'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '450px',
                        padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px', height: '64px', background: '#ecfdf5', borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <FileText size={32} color="#10b981" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Enregistrer la version</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>
                                Donnez un nom pour identifier votre emploi du temps final.
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', marginLeft: '4px' }}>
                                Nom de la version
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={saveName}
                                onChange={e => setSaveName(e.target.value)}
                                placeholder="Ex: Premier Semestre - Final"
                                style={{
                                    width: '100%', height: '50px', padding: '0 20px', borderRadius: '14px',
                                    border: '2px solid #f1f5f9', background: '#f8fafc',
                                    fontSize: '1rem', color: '#1e293b', fontWeight: 600, outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowSaveModal(false)}
                                style={{
                                    flex: 1, height: '50px', borderRadius: '14px', border: '1.5px solid #e2e8f0',
                                    background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    setIsSaving(true);
                                    try {
                                        await saveManualSession(saveName, editId, 0, auditResult?.score || 0, algoType || "manual");
                                        setShowSaveModal(false);
                                        window.location.href = "/reports";
                                    } catch (e: any) {
                                        alert(e.message || "Erreur lors de la sauvegarde");
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                style={{
                                    flex: 2, height: '50px', borderRadius: '14px', border: 'none',
                                    background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                Confirmer & Archiver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
