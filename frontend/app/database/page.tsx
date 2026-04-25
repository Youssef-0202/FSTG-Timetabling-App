"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search, Plus, RefreshCw, Pencil, Trash2,
    Users, DoorOpen, GraduationCap, BookOpen, Building2, ClipboardList,
    CheckCircle2, XCircle, X, Save, Loader2, Layers, Grid, Users2, CalendarDays
} from "lucide-react";
import Select from "react-select";
import {
    getTeachers, createTeacher, updateTeacher, deleteTeacher, Teacher,
    getRooms, createRoom, updateRoom, deleteRoom, Room,
    getModules, createModule, updateModule, deleteModule, Module,
    getDepartments, createDepartment, deleteDepartment, Department,
    getAssignments, Assignment, createAssignment, AssignmentCreate, updateAssignment, deleteAssignment,
    getModuleParts, createModulePart, updateModulePart, deleteModulePart, ModulePart,
    getTimeslots, createTimeslot, updateTimeslot, deleteTimeslot, Timeslot,
    getFilieres, createFiliere, deleteFiliere, Filiere,
    getGroupeFilieres, createGroupeFiliere, deleteGroupeFiliere, updateGroupeFiliere, GroupeFiliere,
    getSections, createSection, deleteSection, Section,
    getTDGroups, createTDGroup, updateTDGroup, deleteTDGroup, TDGroup,
    getGroupeModules, createGroupeModule, updateGroupeModule, deleteGroupeModule, GroupeModule
} from "@/lib/api";

/* ── Toast hook ── */
function useToast() {
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
    const show = useCallback((msg: string, type = "") => {
        const id = Date.now();
        setToasts((t) => [...t, { id, msg, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    }, []);
    return { toasts, show };
}

/* ── Avatar util ── */
const COLORS = ["#1a6fba", "#1a9e7a", "#e8a020", "#3dbde4", "#8b5cf6", "#0b1f4b", "#d94040"];
const avatar = (name: string, idx: number) => ({
    initials: name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    color: COLORS[idx % COLORS.length],
});

type Tab = "assignments" | "departments" | "teachers" | "rooms" | "filieres" | "cohortes" | "sections" | "td_groups" | "modules" | "module_parts" | "groupe_modules" | "timeslots";

function DatabaseContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "teachers");
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterVal, setFilterVal] = useState("");

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [cohortes, setCohortes] = useState<GroupeFiliere[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [tdGroups, setTdGroups] = useState<TDGroup[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [moduleParts, setModuleParts] = useState<ModulePart[]>([]);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [groupeModules, setGroupeModules] = useState<GroupeModule[]>([]);

    const [modal, setModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Record<string, unknown> }>
        ({ open: false, mode: "add", data: {} });
    const [saving, setSaving] = useState(false);
    const [online, setOnline] = useState(true);
    const { toasts, show } = useToast();

    /* ── Load ── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, r, g_fil, sec, tdg, m, d, a, mp, ts, f, gms] = await Promise.all([
                getTeachers(), getRooms(), getGroupeFilieres(), getSections(), getTDGroups(), getModules(),
                getDepartments(), getAssignments(), getModuleParts(), getTimeslots(), getFilieres(), getGroupeModules()
            ]);
            setTeachers(t); setRooms(r); setCohortes(g_fil); setSections(sec); setTdGroups(tdg); setModules(m);
            setDepartments(d); setAssignments(a); setModuleParts(mp); setTimeslots(ts); setFilieres(f); setGroupeModules(gms);
            setOnline(true);
        } catch {
            setOnline(false);
            show("API hors ligne — données indisponibles", "error");
        } finally { setLoading(false); }
    }, [show]);

    useEffect(() => { loadData(); }, [loadData]);

    const switchTab = (t: Tab) => { setTab(t); setSearch(""); setFilterVal(""); router.replace(`/database?tab=${t}`); };

    function filtered<T>(data: T[], filterKey?: keyof T) {
        return data.filter((r) => {
            const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
            const matchFilter = !filterVal || !filterKey || String((r as any)[filterKey] || "").includes(filterVal);
            return matchSearch && matchFilter;
        });
    }

    const openAdd = () => setModal({ open: true, mode: "add", data: {} });
    const openEdit = (item: any) => {
        let editData = { ...item };
        // Si c'est un assignment, on doit extraire les IDs des groupes TD (qui sont des objets dans 'td_groups') 
        // vers la liste d'IDs 'tdgroup_ids' que le Select du modal attend.
        if (tab === "assignments") {
            const gids = (item.td_groups || []).map((g: any) => g.id);
            editData.tdgroup_ids = gids;

            // On calcule les sections à cocher (soit via les groupes, soit via le champ section_id direct)
            let sids = Array.from(new Set((item.td_groups || []).map((g: any) => g.section_id).filter(Boolean)));
            if (sids.length === 0 && item.section_id) {
                sids = [Number(item.section_id)];
            }
            editData.section_ids = sids;
        }
        setModal({ open: true, mode: "edit", data: editData });
    };
    const closeModal = () => setModal({ open: false, mode: "add", data: {} });
    const setField = (k: string, v: unknown) => setModal((m) => ({ ...m, data: { ...m.data, [k]: v } }));

    /* ── Save ── */
    const save = async () => {
        setSaving(true);
        try {
            const d = modal.data;
            if (tab === "teachers") {
                const teacherPayload: any = {
                    name: String(d.name || ""),
                    email: String(d.email || ""),
                    availabilities: d.availabilities || { unavailable_slots: [] }
                };
                modal.mode === "add"
                    ? await createTeacher(teacherPayload)
                    : await updateTeacher(Number(d.id), teacherPayload);
                setTeachers(await getTeachers());
            } else if (tab === "rooms") {
                modal.mode === "add"
                    ? await createRoom({ name: String(d.name || ""), capacity: Number(d.capacity || 0), type: String(d.type || "SALLE_TD") })
                    : await updateRoom(Number(d.id), { name: String(d.name || ""), capacity: Number(d.capacity || 0), type: String(d.type || "SALLE_TD") });
                setRooms(await getRooms());
            } else if (tab === "departments") {
                await createDepartment({ name: String(d.name || "") });
                setDepartments(await getDepartments());
            } else if (tab === "filieres") {
                await createFiliere({
                    name: String(d.name || ""),
                    type: String(d.type || "TC"),
                    dept_id: Number(d.dept_id || 1)
                });
                setFilieres(await getFilieres());
            } else if (tab === "sections") {
                await createSection({
                    name: String(d.name || ""),
                    semestre: String(d.semestre || "S1"),
                    total_capacity: Number(d.total_capacity || 0),
                    groupe_ids: d.groupe_ids ? (d.groupe_ids as number[]) : []
                });
                setSections(await getSections());
            } else if (tab === "td_groups") {
                modal.mode === "add"
                    ? await createTDGroup({
                        name: String(d.name || ""),
                        section_id: Number(d.section_id || 1),
                        size: Number(d.size || 30)
                    })
                    : await updateTDGroup(Number(d.id), {
                        name: String(d.name || ""),
                        section_id: Number(d.section_id || 1),
                        size: Number(d.size)
                    });
                setTdGroups(await getTDGroups());
            } else if (tab === "modules") {
                modal.mode === "add"
                    ? await createModule({ name: String(d.name || ""), code: String(d.code || ""), dept_id: Number(d.dept_id || 1) })
                    : await updateModule(Number(d.id), { name: String(d.name || ""), code: String(d.code || ""), dept_id: Number(d.dept_id) });
                setModules(await getModules());
            } else if (tab === "module_parts") {
                modal.mode === "add"
                    ? await createModulePart({
                        module_id: Number(d.module_id),
                        type: String(d.type || "CM"),
                        weekly_hours: Number(d.weekly_hours || 1.5),
                        required_room_type: String(d.required_room_type || "SALLE_TD")
                    })
                    : await updateModulePart(Number(d.id), {
                        module_id: Number(d.module_id),
                        type: String(d.type),
                        weekly_hours: Number(d.weekly_hours),
                        required_room_type: String(d.required_room_type)
                    });
                setModuleParts(await getModuleParts());
            } else if (tab === "groupe_modules") {
                modal.mode === "add"
                    ? await createGroupeModule({
                        module_id: Number(d.module_id),
                        effectif: Number(d.effectif),
                        groupe_ids: d.groupe_ids ? (d.groupe_ids as number[]) : []
                    })
                    : await updateGroupeModule(Number(d.id), {
                        effectif: Number(d.effectif),
                        groupe_ids: d.groupe_ids ? (d.groupe_ids as number[]) : []
                    });
                setGroupeModules(await getGroupeModules());
            } else if (tab === "timeslots") {
                modal.mode === "add"
                    ? await createTimeslot({
                        day: String(d.day || "Lundi"),
                        start_time: String(d.start_time || "08:30:00"),
                        end_time: String(d.end_time || "10:30:00")
                    })
                    : await updateTimeslot(Number(d.id), {
                        day: String(d.day),
                        start_time: String(d.start_time),
                        end_time: String(d.end_time)
                    });
                setTimeslots(await getTimeslots());
            } else if (tab === "assignments") {
                const payload: Partial<AssignmentCreate> = {
                    module_part_id: Number(d.module_part_id || 1),
                    teacher_id: Number(d.teacher_id || 1),
                    section_id: d.section_id ? Number(d.section_id) : null,
                    tdgroup_ids: d.tdgroup_ids ? (d.tdgroup_ids as number[]) : [],
                    is_locked: !!d.is_locked,
                    room_id: !!d.is_locked && d.room_id ? Number(d.room_id) : null,
                    slot_id: !!d.is_locked && d.slot_id ? Number(d.slot_id) : null,
                };
                modal.mode === "add"
                    ? await createAssignment(payload as AssignmentCreate)
                    : await updateAssignment(Number(d.id), payload);
                setAssignments(await getAssignments());
            } else if (tab === "cohortes") {
                modal.mode === "add"
                    ? await createGroupeFiliere({
                        filiere_id: Number(d.filiere_id),
                        semestre: String(d.semestre),
                        academic_year: String(d.academic_year),
                        total_students: Number(d.total_students)
                    })
                    : await updateGroupeFiliere(Number(d.id), {
                        filiere_id: Number(d.filiere_id),
                        semestre: String(d.semestre),
                        academic_year: String(d.academic_year),
                        total_students: Number(d.total_students)
                    });
                setCohortes(await getGroupeFilieres());
            }
            show(`${modal.mode === "add" ? "Ajouté" : "Modifié"} avec succès`, "success");
            closeModal();
        } catch (e: unknown) {
            show(`Erreur : ${e instanceof Error ? e.message : "Inconnue"}`, "error");
        } finally { setSaving(false); }
    };

    /* ── Delete ── */
    const del = async (id: number) => {
        if (!confirm("Confirmer la suppression ?")) return;
        try {
            if (tab === "teachers") { await deleteTeacher(id); setTeachers(await getTeachers()); }
            else if (tab === "rooms") { await deleteRoom(id); setRooms(await getRooms()); }
            else if (tab === "departments") { await deleteDepartment(id); setDepartments(await getDepartments()); }
            else if (tab === "filieres") { await deleteFiliere(id); setFilieres(await getFilieres()); }
            else if (tab === "cohortes") { await deleteGroupeFiliere(id); setCohortes(await getGroupeFilieres()); }
            else if (tab === "sections") { await deleteSection(id); setSections(await getSections()); }
            else if (tab === "td_groups") { await deleteTDGroup(id); setTdGroups(await getTDGroups()); }
            else if (tab === "modules") { await deleteModule(id); setModules(await getModules()); }
            else if (tab === "module_parts") { await deleteModulePart(id); setModuleParts(await getModuleParts()); }
            else if (tab === "timeslots") { await deleteTimeslot(id); setTimeslots(await getTimeslots()); }
            else if (tab === "groupe_modules") { await deleteGroupeModule(id); setGroupeModules(await getGroupeModules()); }
            else if (tab === "assignments") { await deleteAssignment(id); setAssignments(await getAssignments()); }
            show("Enregistrement supprimé", "error");
        } catch { show("Erreur lors de la suppression", "error"); }
    };

    const tabs: { key: Tab, label: string, count: number, Icon: any }[] = [
        { key: "assignments", label: "Affectations", count: assignments.length, Icon: ClipboardList },
        { key: "teachers", label: "Enseignants", count: teachers.length, Icon: Users },
        { key: "rooms", label: "Salles", count: rooms.length, Icon: DoorOpen },
        { key: "filieres", label: "Filières", count: filieres.length, Icon: Building2 },
        { key: "sections", label: "Sections (CM)", count: sections.length, Icon: Layers },
        { key: "td_groups", label: "Groupes TD", count: tdGroups.length, Icon: Users2 },
        { key: "cohortes", label: "Groupes (Cohortes)", count: cohortes.length, Icon: GraduationCap },
        { key: "modules", label: "Modules", count: modules.length, Icon: BookOpen },
        { key: "groupe_modules", label: "Pools Modules", count: groupeModules.length, Icon: Users },
        { key: "module_parts", label: "Composantes", count: moduleParts.length, Icon: Grid },
        { key: "timeslots", label: "Créneaux Horaires", count: timeslots.length, Icon: CalendarDays },
        { key: "departments", label: "Dépt.", count: departments.length, Icon: Building2 },
    ];

    const sectionTitles: Record<Tab, string> = {
        assignments: "Gestion des Affectations (Timetable)",
        departments: "Départements",
        teachers: "Liste des Enseignants",
        rooms: "Liste des Salles",
        filieres: "Filières de Spécialité (Cycles)",
        cohortes: "Cohortes d'Étudiants (Filières x Semestre)",
        sections: "Sections de Cours Magistraux",
        td_groups: "Groupes Pratiques (TD/TP)",
        modules: "Catalogue des Modules",
        groupe_modules: "Pools d'Inscrits par Module (GroupeModule)",
        module_parts: "Parties de Modules (CM/TD/TP)",
        timeslots: "Gestion des Créneaux Horaires (Timeslots)",
    };

    return (
        <>
            <div className="hero">
                <h1>Gestion Universitaire FSTG</h1>
                <p>Définissez l'arborescence (Cohortes → Sections → TD) pour que l'algorithme génère les bons créneaux.</p>
            </div>

            <div className="stats-row">
                {[
                    { cls: "blue", Icon: Users, val: teachers.length, label: "Enseignants", t: "teachers" as Tab },
                    { cls: "gold", Icon: DoorOpen, val: rooms.length, label: "Salles", t: "rooms" as Tab },
                    { cls: "teal", Icon: Layers, val: sections.length, label: "Sections CM", t: "sections" as Tab },
                    { cls: "sky", Icon: BookOpen, val: modules.length, label: "Modules", t: "modules" as Tab },
                ].map(({ cls, Icon, val, label, t }) => (
                    <div key={t} className={`stat-card ${cls}`} onClick={() => switchTab(t)}>
                        <div className="stat-icon"><Icon size={22} /></div>
                        <div><div className="stat-val">{val}</div><div className="stat-label">{label}</div></div>
                    </div>
                ))}
            </div>

            <div className="page-content">
                <div className="api-bar">
                    <div className={`api-dot ${online ? "" : "offline"}`}></div>
                    <b>FastAPI</b>
                    <span className="api-url">http://192.168.56.1:8000</span>
                    <button className="btn btn-outline btn-sm" onClick={loadData}>
                        <RefreshCw size={13} /> Actualiser
                    </button>
                    <span className="api-ping" style={{ color: online ? "var(--teal)" : "var(--danger)" }}>
                        {online ? <><CheckCircle2 size={13} style={{ display: "inline", marginRight: 4 }} />Connecté</> : <><XCircle size={13} style={{ display: "inline", marginRight: 4 }} />Hors ligne</>}
                    </span>
                </div>

                <div className="tab-strip" style={{ flexWrap: "wrap" }}>
                    {tabs.map(({ key, label, count, Icon }) => (
                        <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`} onClick={() => switchTab(key)}>
                            <Icon size={14} /> {label} <span className="tab-count">{count}</span>
                        </button>
                    ))}
                </div>

                <div className="toolbar">
                    <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Ajouter</button>
                    <div className="search-wrap" style={{ marginLeft: "auto" }}>
                        <Search size={14} color="var(--muted)" />
                        <input placeholder="Rechercher module ou prof..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {tab === "assignments" && (
                        <>
                            <select className="filter-select" value={filterVal} onChange={(e) => setFilterVal(e.target.value)}>
                                <option value="">Toutes les sections</option>
                                {sections.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                    <option key={s.id} value={`sec-${s.id}`}>📍 {s.name}</option>
                                ))}
                                <option value="locked">🔒 Déjà fixées</option>
                                <option value="unlocked">⏳ À assigner</option>
                            </select>
                        </>
                    )}
                    {(tab === "modules" || tab === "sections") && (
                        <select className="filter-select" value={filterVal} onChange={(e) => setFilterVal(e.target.value)}>
                            <option value="">Tous les semestres</option>
                            <option value="S2">🎓 Semestre S2</option>
                            <option value="S4">🎓 Semestre S4</option>
                        </select>
                    )}
                </div>

                <div className="section-header">
                    <div>
                        <div className="section-title">{sectionTitles[tab]}</div>
                    </div>
                </div>

                <div className="table-card">
                    {tab === "assignments" && (
                        <table>
                            <thead><tr><th>ID</th><th>Module</th><th>Enseignant</th><th>Cible (Section/TD)</th><th>Statut</th><th>Planification</th><th>Actions</th></tr></thead>
                            <tbody>
                                {loading && <tr className="loading-row"><td colSpan={7}><Loader2 size={18} style={{ animation: "spin .7s linear infinite" }} /> Chargement...</td></tr>}
                                {!loading && (assignments as Assignment[])
                                    .filter((a) => {
                                        // Filtre par statut (Locked/Unlocked)
                                        if (filterVal === "locked" && !a.is_locked) return false;
                                        if (filterVal === "unlocked" && a.is_locked) return false;
                                        // Filtre par Section spécifique
                                        if (filterVal.startsWith("sec-") && String(a.section_id) !== filterVal.replace("sec-", "")) return false;

                                        // Recherche textuelle
                                        if (!search) return true;
                                        const mPart = moduleParts.find(mp => mp.id === a.module_part_id);
                                        const mod = modules.find(m => m.id === mPart?.module_id);
                                        const teacher = teachers.find(t => t.id === a.teacher_id);
                                        return mod?.name.toLowerCase().includes(search.toLowerCase()) ||
                                            teacher?.name.toLowerCase().includes(search.toLowerCase());
                                    })
                                    .sort((a, b) => {
                                        const sA = sections.find(s => s.id === a.section_id)?.name || "";
                                        const sB = sections.find(s => s.id === b.section_id)?.name || "";
                                        return sA.localeCompare(sB);
                                    })
                                    .map((a) => {
                                        const teacher = teachers.find((t) => t.id === a.teacher_id);
                                        const room = rooms.find((r) => r.id === a.room_id);
                                        const mPart = moduleParts.find(mp => mp.id === a.module_part_id);
                                        const mod = modules.find(m => m.id === mPart?.module_id);
                                        const sec = sections.find(s => s.id === a.section_id);
                                        return (
                                            <tr key={a.id}>
                                                <td><code style={{ fontSize: "0.78rem" }}>#{a.id}</code></td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{mod?.name || "???"}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                                        <span className={`badge ${mPart?.type === "CM" ? "badge-amphi" : "badge-td"}`}>{mPart?.type}</span> ({mPart?.weekly_hours}h)
                                                    </div>
                                                </td>
                                                <td>
                                                    {teacher?.name === "PROF" ? (
                                                        <span style={{ fontStyle: "italic", color: "var(--navy)", fontWeight: 500 }}>
                                                            Pr. {mod?.name?.split(' ').slice(0, 2).join(' ')} {a.td_groups?.length > 0 ? a.td_groups[0].name : (sec?.name || "")}
                                                        </span>
                                                    ) : (
                                                        teacher?.name || "?"
                                                    )}
                                                </td>
                                                <td>
                                                    {mPart?.type !== "CM" ? (
                                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                                            {a.td_groups?.length > 0 ? a.td_groups.map(g => (
                                                                <span key={g.id} className="badge" style={{ backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", fontSize: "0.7rem" }}>
                                                                    🟢 {g.name}
                                                                </span>
                                                            )) : (
                                                                <span className="badge badge-amphi" style={{ fontSize: "0.7rem" }}>Section: {sec?.name}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="badge badge-amphi" style={{ fontSize: "0.7rem" }}>Section: {sec?.name}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {a.is_locked ? <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: "0.8rem" }}>Fixée</span> : <span style={{ color: "var(--gold)", fontWeight: 600, fontSize: "0.8rem" }}>À placer</span>}
                                                </td>
                                                <td>
                                                    {a.is_locked ? (
                                                        <div style={{ fontSize: "0.75rem" }}>
                                                            <b>{room?.name}</b><br />
                                                            {timeslots.find(ts => ts.id === a.slot_id)?.day || "Créneau ?"}
                                                        </div>
                                                    ) : <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>L'Algo décide</div>}
                                                </td>
                                                <td><div className="actions-cell">
                                                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(a as any)}><Pencil size={13} /></button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => del(a.id)}><Trash2 size={13} /></button>
                                                </div></td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    )}

                    {tab === "sections" && (
                        <table>
                            <thead><tr><th>ID</th><th>Nom Section (CM)</th><th>Semestre</th><th>Capacité Active</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && sections.filter(s => !filterVal || s.semestre.includes(filterVal)).map((s) => (
                                    <tr key={s.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{s.id}</code></td>
                                        <td><b>{s.name}</b></td>
                                        <td><span className="badge badge-cm">{s.semestre}</span></td>
                                        <td>{s.total_capacity} étudiants</td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "filieres" && (
                        <table>
                            <thead><tr><th>ID</th><th>Nom Filière</th><th>Type</th><th>Département</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && filieres.map((f) => (
                                    <tr key={f.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{f.id}</code></td>
                                        <td><b>{f.name}</b></td>
                                        <td><span className="badge badge-td">{f.type}</span></td>
                                        <td>{departments.find(d => d.id === f.dept_id)?.name || "N/A"}</td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" disabled><Pencil size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "td_groups" && (
                        <table>
                            <thead><tr><th>ID</th><th>Nom du Groupe (TD)</th><th>Effectif</th><th>Section Parente</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && tdGroups.map((g) => (
                                    <tr key={g.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{g.id}</code></td>
                                        <td><b>{g.name}</b></td>
                                        <td>{g.size} étudiants</td>
                                        <td><span className="badge badge-amphi">{sections.find(s => s.id === g.section_id)?.name || "?"}</span></td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(g as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(g.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "cohortes" && (
                        <table>
                            <thead><tr><th>ID</th><th>Filière ID</th><th>Semestre</th><th>Année</th><th>Effectif</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && cohortes.map((c) => (
                                    <tr key={c.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{c.id}</code></td>
                                        <td>{filieres.find(f => f.id === c.filiere_id)?.name || `Filiere #${c.filiere_id}`}</td>
                                        <td><span className="badge badge-cm">{c.semestre}</span></td>
                                        <td>{c.academic_year}</td>
                                        <td>{c.total_students} inscrits</td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(c as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "teachers" && (
                        <table>
                            <thead><tr><th>ID</th><th>Nom</th><th>Email</th><th>Indisponibilités</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && (teachers as Teacher[])
                                    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
                                    .map((t) => {
                                        const avail = (t.availabilities as any) || {};
                                        const unSlots = avail.unavailable_slots || [];
                                        const count = Array.isArray(unSlots) ? unSlots.length : 0;
                                        return (
                                            <tr key={t.id}>
                                                <td><code style={{ fontSize: "0.78rem" }}>#{t.id}</code></td>
                                                <td><b>{t.name}</b></td>
                                                <td style={{ color: "var(--muted)" }}>{t.email}</td>
                                                <td>
                                                    {count > 0 ? (
                                                        <span className="badge" style={{ backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fee2e2", fontSize: "0.75rem" }}>
                                                            🚫 {count} créneau{count > 1 ? 'x' : ''} bloqué{count > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>✅ Disponible</span>
                                                    )}
                                                </td>
                                                <td><div className="actions-cell">
                                                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(t as any)}><Pencil size={13} /></button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => del(t.id)}><Trash2 size={13} /></button>
                                                </div></td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    )}

                    {tab === "rooms" && (
                        <table>
                            <thead><tr><th>ID</th><th>Salle</th><th>Capacité</th><th>Type</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && rooms.map((r) => (
                                    <tr key={r.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{r.id}</code></td>
                                        <td><b>{r.name}</b></td>
                                        <td>{r.capacity} pl.</td>
                                        <td><span className="badge">{r.type}</span></td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(r as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "modules" && (
                        <table>
                            <thead><tr><th>ID</th><th>Module</th><th>Code</th><th>Dépt</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && modules.map((m) => (
                                    <tr key={m.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{m.id}</code></td>
                                        <td><b>{m.name}</b></td>
                                        <td>{m.code}</td>
                                        <td>{departments.find(d => d.id === m.dept_id)?.name}</td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(m as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(m.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "groupe_modules" && (
                        <table>
                            <thead><tr><th>ID</th><th>Module</th><th>Filières/Cohortes Rattachées</th><th>Effectif Inscrits</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && groupeModules.map((gm) => (
                                    <tr key={gm.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{gm.id}</code></td>
                                        <td><b>{modules.find(m => m.id === gm.module_id)?.name}</b></td>
                                        <td>
                                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "320px" }}>
                                                {gm.groupes && gm.groupes.length > 0 ? gm.groupes.map(gf => {
                                                    const fil = filieres.find(f => f.id === gf.filiere_id);
                                                    const label = fil ? `${fil.name}-${gf.semestre}` : `#${gf.id}`;
                                                    return (
                                                        <span key={gf.id} style={{
                                                            display: "inline-flex", alignItems: "center", gap: "3px",
                                                            padding: "2px 7px", borderRadius: "12px",
                                                            fontSize: "0.7rem", fontWeight: 600,
                                                            background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                                                            color: "white", whiteSpace: "nowrap"
                                                        }}>
                                                            {label}
                                                        </span>
                                                    );
                                                }) : <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>Aucune filière liée</span>}
                                            </div>
                                        </td>
                                        <td><span className="badge badge-amphi" style={{ fontWeight: "bold" }}>{gm.effectif} étudiants</span></td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(gm as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(gm.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "module_parts" && (
                        <table>
                            <thead><tr><th>ID</th><th>Module Parent</th><th>Type</th><th>Heures</th><th>Salle Req.</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && moduleParts.map((mp) => (
                                    <tr key={mp.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{mp.id}</code></td>
                                        <td>{modules.find(m => m.id === mp.module_id)?.name}</td>
                                        <td><span className="badge">{mp.type}</span></td>
                                        <td>{mp.weekly_hours}h</td>
                                        <td>{mp.required_room_type}</td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(mp as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(mp.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "timeslots" && (
                        <table>
                            <thead><tr><th>ID</th><th>Jour</th><th>Début</th><th>Fin</th><th>Actions</th></tr></thead>
                            <tbody>
                                {!loading && timeslots.map((ts) => (
                                    <tr key={ts.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{ts.id}</code></td>
                                        <td><span className="badge" style={{ background: "var(--light-bg)", color: "var(--navy)" }}>{ts.day}</span></td>
                                        <td><span style={{ fontWeight: 600 }}>{ts.start_time}</span></td>
                                        <td><span style={{ fontWeight: 600 }}>{ts.end_time}</span></td>
                                        <td><div className="actions-cell">
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(ts as any)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(ts.id)}><Trash2 size={13} /></button>
                                        </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {tab === "departments" && (
                        <table>
                            <thead><tr><th>ID</th><th>Département</th></tr></thead>
                            <tbody>
                                {!loading && departments.map((d) => (
                                    <tr key={d.id}>
                                        <td><code style={{ fontSize: "0.78rem" }}>#{d.id}</code></td>
                                        <td><b>{d.name}</b></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {modal.open && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{modal.mode === "add" ? "Ajouter" : "Modifier"}</h3>
                            <button className="modal-close" onClick={closeModal}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {/* Les formulaires dynamiques selon le tab sélectionné */}
                            {tab === "departments" && (
                                <div className="form-group full"><label>Nom du Département</label>
                                    <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Informatique" />
                                </div>
                            )}
                            {tab === "teachers" && (
                                <>
                                    <div className="form-group full"><label>Nom Complet</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Pr. Nom Prénom" />
                                    </div>
                                    <div className="form-group full"><label>Email</label>
                                        <input type="email" value={String(modal.data.email || "")} onChange={(e) => setField("email", e.target.value)} placeholder="email@fstg-marrakech.ac.ma" />
                                    </div>
                                    <div className="form-group full">
                                        <label>Indisponibilités (Cliquez pour bloquer)</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '10px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                            {timeslots.sort((a, b) => (a.id - b.id)).map(ts => {
                                                const currentAvail = (modal.data.availabilities as any) || {};
                                                const unSlots = Array.isArray(currentAvail.unavailable_slots) ? currentAvail.unavailable_slots : [];
                                                const isBlocked = unSlots.includes(ts.id);

                                                return (
                                                    <button
                                                        key={ts.id}
                                                        type="button"
                                                        onClick={() => {
                                                            let newSlots = [...unSlots];
                                                            if (isBlocked) newSlots = newSlots.filter(id => id !== ts.id);
                                                            else newSlots.push(ts.id);
                                                            setField("availabilities", { ...currentAvail, unavailable_slots: newSlots });
                                                        }}
                                                        style={{
                                                            padding: '8px',
                                                            fontSize: '0.75rem',
                                                            borderRadius: '6px',
                                                            border: '1px solid',
                                                            borderColor: isBlocked ? '#ef4444' : 'var(--border)',
                                                            backgroundColor: isBlocked ? '#fef2f2' : 'var(--card-bg)',
                                                            color: isBlocked ? '#ef4444' : 'var(--text-primary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            fontWeight: isBlocked ? 600 : 400
                                                        }}
                                                    >
                                                        {ts.day} - {ts.start_time.substring(0, 5)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                            {tab === "rooms" && (
                                <>
                                    <div className="form-group full"><label>Nom de la Salle</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Amphi 4, Salle S10" />
                                    </div>
                                    <div className="form-group"><label>Capacité</label>
                                        <input type="number" value={String(modal.data.capacity || "")} onChange={(e) => setField("capacity", e.target.value)} />
                                    </div>
                                    <div className="form-group"><label>Type</label>
                                        <select value={String(modal.data.type || "")} onChange={(e) => setField("type", e.target.value)}>
                                            <option value="SALLE_TD">SALLE_TD</option>
                                            <option value="AMPHI">AMPHI</option>
                                            <option value="SALLE_TP">SALLE_TP</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {tab === "filieres" && (
                                <>
                                    <div className="form-group full"><label>Nom de la Filière</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: GI, GEG, MSD" />
                                    </div>
                                    <div className="form-group"><label>Type de Cycle</label>
                                        <select value={String(modal.data.type || "")} onChange={(e) => setField("type", e.target.value)}>
                                            <option value="TC">TC (Tronc Commun)</option>
                                            <option value="LST">LST (Licence ST)</option>
                                            <option value="MST">MST (Master ST)</option>
                                            <option value="CI">CI (Cycle Ingénieur)</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Département</label>
                                        <select value={String(modal.data.dept_id || "")} onChange={(e) => setField("dept_id", e.target.value)}>
                                            <option value="">Sélectionner</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            {tab === "cohortes" && (
                                <>
                                    <div className="form-group full"><label>Choix de la Filière</label>
                                        <select value={String(modal.data.filiere_id || "")} onChange={(e) => setField("filiere_id", e.target.value)}>
                                            <option value="">Sélectionner la filière parente</option>
                                            {filieres.map(f => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Semestre</label>
                                        <input value={String(modal.data.semestre || "")} onChange={(e) => setField("semestre", e.target.value)} placeholder="Ex: S1, S2, S3" />
                                    </div>
                                    <div className="form-group"><label>Année Académique</label>
                                        <input value={String(modal.data.academic_year || "2025-2026")} onChange={(e) => setField("academic_year", e.target.value)} placeholder="2025-2026" />
                                    </div>
                                    <div className="form-group full"><label>Effectif Total inscrits</label>
                                        <input type="number" value={String(modal.data.total_students || "")} onChange={(e) => setField("total_students", e.target.value)} />
                                    </div>
                                </>
                            )}
                            {tab === "sections" && (
                                <>
                                    <div className="form-group full"><label>Nom Section</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: GP-GI S1" />
                                    </div>
                                    <div className="form-group"><label>Semestre</label>
                                        <input value={String(modal.data.semestre || "")} onChange={(e) => setField("semestre", e.target.value)} placeholder="S1" />
                                    </div>
                                    <div className="form-group"><label>Capacité (Amphi)</label>
                                        <input type="number" value={String(modal.data.total_capacity || "")} onChange={(e) => setField("total_capacity", e.target.value)} />
                                    </div>
                                </>
                            )}
                            {tab === "td_groups" && (
                                <>
                                    <div className="form-group full"><label>Nom du Groupe TD</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Gr 1 S25" />
                                    </div>
                                    <div className="form-group"><label>Effectif</label>
                                        <input type="number" value={String(modal.data.size || "")} onChange={(e) => setField("size", e.target.value)} />
                                    </div>
                                    <div className="form-group full"><label>Rattaché à la Section</label>
                                        <select value={String(modal.data.section_id || "")} onChange={(e) => setField("section_id", e.target.value)}>
                                            <option value="">Sélectionner</option>
                                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            {tab === "assignments" && (
                                <>
                                    <div className="form-group full"><label>Partie de Module (Séance)</label>
                                        <select value={String(modal.data.module_part_id || "")} onChange={(e) => {
                                            const pid = e.target.value;
                                            setModal(m => ({
                                                ...m,
                                                data: {
                                                    ...m.data,
                                                    module_part_id: pid,
                                                    section_id: null,
                                                    section_ids: [],
                                                    tdgroup_ids: []
                                                }
                                            }));
                                        }} style={{ minHeight: "40px" }}>
                                            <option value="">-- Choisir une séance --</option>
                                            {modules.map(mod => {
                                                const parts = moduleParts.filter(mp => mp.module_id === mod.id);
                                                if (parts.length === 0) return null;
                                                return (
                                                    <optgroup key={mod.id} label={`${mod.name} (${mod.code})`}>
                                                        {parts.map(mp => (
                                                            <option key={mp.id} value={mp.id}>
                                                                {mp.type} ({mp.weekly_hours}H) - {mp.required_room_type}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="form-group full" style={{ marginBottom: "15px" }}>
                                        <label>Enseignant</label>
                                        <Select
                                            options={[...teachers]
                                                .sort((a, b) => {
                                                    if (a.name === "PROF") return -1;
                                                    if (b.name === "PROF") return 1;
                                                    return a.name.localeCompare(b.name);
                                                })
                                                .map(t => ({ value: t.id, label: t.name }))}
                                            value={modal.data.teacher_id ? { value: modal.data.teacher_id, label: teachers.find(t => t.id === Number(modal.data.teacher_id))?.name } : null}
                                            onChange={(selectedOption: any) => setField("teacher_id", selectedOption ? selectedOption.value : null)}
                                            placeholder="-- Choisir ou taper un nom --"
                                            isClearable
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    borderRadius: '6px',
                                                    borderColor: 'var(--border)',
                                                    minHeight: '40px',
                                                    boxShadow: 'none',
                                                    '&:hover': { borderColor: '#94a3b8' }
                                                }),
                                                menu: (base) => ({
                                                    ...base,
                                                    zIndex: 9999
                                                })
                                            }}
                                        />
                                    </div>
                                    <div className="form-group full">
                                        <label style={{ fontSize: "0.8rem", color: "var(--navy)", fontWeight: 600 }}>Périmètre de cours (Cible)</label>
                                        <div style={{ padding: "10px", border: "1px dashed var(--border)", borderRadius: "6px", fontSize: "0.85rem" }}>
                                            {(() => {
                                                const mPart = moduleParts.find(mp => mp.id === Number(modal.data.module_part_id));
                                                const isCM = mPart?.type === "CM";
                                                if (isCM) {
                                                    return (
                                                        <div className="form-group">
                                                            <label>Cibles Sections (Fusion pour CM)</label>
                                                            <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", padding: "8px", borderRadius: "4px", backgroundColor: "#fff" }}>
                                                                {sections.sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                                                                    const currentIds = Array.isArray(modal.data.section_ids) ? modal.data.section_ids : (modal.data.section_id ? [Number(modal.data.section_id)] : []);
                                                                    const checked = currentIds.includes(s.id);
                                                                    return (
                                                                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", cursor: "pointer" }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={(e) => {
                                                                                    let newIds = [...currentIds];
                                                                                    if (e.target.checked) newIds.push(s.id);
                                                                                    else newIds = newIds.filter(id => id !== s.id);

                                                                                    const allGids = tdGroups.filter(g => newIds.includes(Number(g.section_id))).map(g => g.id);

                                                                                    setModal(m => ({
                                                                                        ...m,
                                                                                        data: {
                                                                                            ...m.data,
                                                                                            section_ids: newIds,
                                                                                            section_id: newIds.length > 0 ? newIds[0] : null,
                                                                                            tdgroup_ids: allGids
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                            />
                                                                            {s.name} ({s.total_capacity} étu.)
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <>
                                                            <div className="form-group">
                                                                <label>1. Cible Section (Parent)</label>
                                                                <select value={String(modal.data.section_id || "")} onChange={(e) => {
                                                                    setField("section_id", e.target.value);
                                                                    setField("tdgroup_ids", []);
                                                                }}>
                                                                    <option value="">Sélectionner une section</option>
                                                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="form-group">
                                                                <label>2. Cible Groupes TD</label>
                                                                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", padding: "8px", borderRadius: "4px", backgroundColor: "#fff" }}>
                                                                    {tdGroups.filter(g => Number(g.section_id) === Number(modal.data.section_id)).map(g => (
                                                                        <label key={g.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", cursor: "pointer" }}>
                                                                            <input type="checkbox" checked={Array.isArray(modal.data.tdgroup_ids) && modal.data.tdgroup_ids.includes(g.id)} onChange={(e) => {
                                                                                const current = Array.isArray(modal.data.tdgroup_ids) ? [...modal.data.tdgroup_ids] : [];
                                                                                if (e.target.checked) current.push(g.id);
                                                                                else { const idx = current.indexOf(g.id); if (idx > -1) current.splice(idx, 1); }
                                                                                setField("tdgroup_ids", current);
                                                                            }} />
                                                                            {g.name} ({g.size} étu.)
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    <div className="form-group full">
                                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <input type="checkbox" checked={!!modal.data.is_locked} onChange={(e) => setField("is_locked", e.target.checked)} />
                                            TYPE 1 (FIXÉE MANUELLEMENT)
                                        </label>
                                    </div>

                                    {modal.data.is_locked && (
                                        <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "-10px", marginBottom: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                            <div className="form-group">
                                                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Salle Imposée</label>
                                                <select value={String(modal.data.room_id || "")} onChange={(e) => setField("room_id", e.target.value)}>
                                                    <option value="">-- Choisir --</option>
                                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Créneau Imposé</label>
                                                <select value={String(modal.data.slot_id || "")} onChange={(e) => setField("slot_id", e.target.value)}>
                                                    <option value="">-- Choisir --</option>
                                                    {timeslots.map(ts => <option key={ts.id} value={ts.id}>{ts.day} {ts.start_time.substring(0, 5)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {tab === "modules" && (
                                <>
                                    <div className="form-group full"><label>Nom du Module</label>
                                        <input value={String(modal.data.name || "")} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Thermodynamique" />
                                    </div>
                                    <div className="form-group"><label>Code Module</label>
                                        <input value={String(modal.data.code || "")} onChange={(e) => setField("code", e.target.value)} placeholder="Ex: INF301" />
                                    </div>
                                    <div className="form-group"><label>Département</label>
                                        <select value={String(modal.data.dept_id || "")} onChange={(e) => setField("dept_id", e.target.value)}>
                                            <option value="">Sélectionner</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            {tab === "groupe_modules" && (
                                <>
                                    <div className="form-group full"><label>Module</label>
                                        <select value={String(modal.data.module_id || "")} onChange={(e) => setField("module_id", e.target.value)} disabled={modal.mode === "edit"}>
                                            <option value="">Sélectionner un module</option>
                                            {modules.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Effectif Total Estimé</label>
                                        <input type="number" value={String(modal.data.effectif || "")} onChange={(e) => setField("effectif", e.target.value)} placeholder="Ex: 215" />
                                    </div>
                                    <div className="form-group full">
                                        <label>Cohortes (Groupes) liées</label>
                                        <div style={{ padding: "10px", border: "1px solid var(--border)", borderRadius: "6px", maxHeight: "150px", overflowY: "auto" }}>
                                            {cohortes.map(c => {
                                                const checked = Array.isArray(modal.data.groupe_ids) && modal.data.groupe_ids.includes(c.id);
                                                return (
                                                    <label key={c.id} style={{ display: "block", marginBottom: 5 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                const current = Array.isArray(modal.data.groupe_ids) ? [...modal.data.groupe_ids] : [];
                                                                if (e.target.checked) current.push(c.id);
                                                                else {
                                                                    const idx = current.indexOf(c.id);
                                                                    if (idx > -1) current.splice(idx, 1);
                                                                }
                                                                setField("groupe_ids", current);
                                                            }}
                                                        />
                                                        {filieres.find(f => f.id === c.filiere_id)?.name} - {c.semestre} ({c.academic_year})
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                            {tab === "module_parts" && (
                                <>
                                    <div className="form-group full"><label>Module Parent</label>
                                        <select value={String(modal.data.module_id || "")} onChange={(e) => setField("module_id", e.target.value)}>
                                            <option value="">Sélectionner le module</option>
                                            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Type Séance</label>
                                        <select value={String(modal.data.type || "")} onChange={(e) => setField("type", e.target.value)}>
                                            <option value="CM">CM (Cours Magistral)</option>
                                            <option value="TD">TD (Travaux Dirigés)</option>
                                            <option value="TP">TP (Travaux Pratiques)</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Heures/semaine</label>
                                        <input type="number" step="0.5" value={String(modal.data.weekly_hours || "1.5")} onChange={(e) => setField("weekly_hours", e.target.value)} />
                                    </div>
                                    <div className="form-group full"><label>Type de Salle requis</label>
                                        <select value={String(modal.data.required_room_type || "")} onChange={(e) => setField("required_room_type", e.target.value)}>
                                            <option value="AMPHI">AMPHI</option>
                                            <option value="SALLE_TD">SALLE_TD</option>
                                            <option value="SALLE_TP">SALLE_TP</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {tab === "timeslots" && (
                                <>
                                    <div className="form-group full"><label>Jour de la semaine</label>
                                        <select value={String(modal.data.day || "")} onChange={(e) => setField("day", e.target.value)}>
                                            <option value="">Sélectionner</option>
                                            <option value="Lundi">Lundi</option>
                                            <option value="Mardi">Mardi</option>
                                            <option value="Mercredi">Mercredi</option>
                                            <option value="Jeudi">Jeudi</option>
                                            <option value="Vendredi">Vendredi</option>
                                            <option value="Samedi">Samedi</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label>Heure de début</label>
                                        <input type="time" value={String(modal.data.start_time || "08:30")} onChange={(e) => setField("start_time", e.target.value)} />
                                    </div>
                                    <div className="form-group"><label>Heure de fin</label>
                                        <input type="time" value={String(modal.data.end_time || "10:25")} onChange={(e) => setField("end_time", e.target.value)} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={closeModal}>Annuler</button>
                            <button className="btn btn-primary" onClick={save}>{saving ? "En cours..." : "Valider"}</button>
                        </div>
                    </div >
                </div >
            )
            }

            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
                ))}
            </div>
        </>
    );
}

export default function DatabasePage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <DatabaseContent />
        </Suspense>
    );
}
