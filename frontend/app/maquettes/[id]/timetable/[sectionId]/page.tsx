"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPreviewSchedule, getTeachers, getRooms, getModules, getModuleParts, getTimeslots, getSections, getTDGroups, auditSection, createAssignment, updateAssignment, saveAssignments } from "@/lib/api";
import { ArrowLeft, ArrowRight, Loader2, Printer, CheckCircle, AlertTriangle, Download, Zap, Plus, Layers, Trash2 } from 'lucide-react';
import SectionTimetableGrid from "@/components/SectionTimetableGrid";

export default function CohortTimetablePreview() {
    const { id, sectionId } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [moduleParts, setModuleParts] = useState<any[]>([]);
    const [timeslots, setTimeslots] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [tdGroups, setTdGroups] = useState<any[]>([]);

    // Audit KPI states
    const [audit, setAudit] = useState<any>(null);

    // Mode Création TP
    const [tpMode, setTpMode] = useState(false);
    const [selectedTpGroups, setSelectedTpGroups] = useState<number[]>([]);

    // Batch Generator States
    const [batchModulePartId, setBatchModulePartId] = useState<number | ''>('');
    const [batchDivision, setBatchDivision] = useState(3); // A, B, C
    const [batchGroupsPerSession, setBatchGroupsPerSession] = useState(2); // Gr 1 & 2 together
    const [batchAlternance, setBatchAlternance] = useState('par alternance');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // THE USER REQUESTED RL-ALNS RESULTS
                const [a, t, r, m, mp, ts, sec, tdg, auditRes] = await Promise.all([
                    getPreviewSchedule("fused"),
                    getTeachers(),
                    getRooms(),
                    getModules(),
                    getModuleParts(),
                    getTimeslots(),
                    getSections(),
                    getTDGroups(),
                    auditSection(Number(sectionId), "fused").catch(() => null)
                ]);
                setAssignments(a); setTeachers(t); setRooms(r); setModules(m);
                setModuleParts(mp); setTimeslots(ts); setSections(sec); setTdGroups(tdg);
                setAudit(auditRes);
            } catch (e) {
                console.error("Erreur chargement", e);
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, [sectionId]);

    const section = sections.find((s: any) => String(s.id) === String(sectionId));
    const sectionTdGroups = tdGroups.filter((g: any) => String(g.section_id) === String(sectionId))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const [isDirty, setIsDirty] = useState(false);
    const [selectedAssignmentToPlace, setSelectedAssignmentToPlace] = useState<any>(null);

    // Filtrer les TP non placés (Brouillon)
    const unplacedTps = assignments.filter(a => !a.slot_id);

    // Fonction pour vider le brouillon (tout ce qui n'est pas placé)
    const handleClearDraft = () => {
        if (unplacedTps.length === 0) return;
        if (confirm("Voulez-vous vraiment vider tout le panier des séances non placées ?")) {
            setAssignments(assignments.filter(a => a.slot_id !== null));
            setIsDirty(true);
        }
    };

    // Logic Batch Generation - DRAFT MODE
    const handleBatchGenerate = () => {
        if (!batchModulePartId) return alert("Sélectionnez un module TP");

        // Sécurité : On demande si on veut vider le panier existant avant de générer le nouveau
        const currentDraftCount = assignments.filter(a => !a.slot_id).length;
        let baseAssignments = assignments;

        if (currentDraftCount > 0) {
            // Nettoyage automatique du brouillon précédent pour éviter les doublons
            baseAssignments = assignments.filter(a => a.slot_id !== null);
        }

        const divisionLabels = batchDivision === 3 ? ["A", "B", "C"] : ["A", "B"];
        const newBatch: any[] = [];
        const timestamp = Date.now();

        for (let i = 0; i < sectionTdGroups.length; i += batchGroupsPerSession) {
            const groupsInThisSession = sectionTdGroups.slice(i, i + batchGroupsPerSession);
            const gObjects = groupsInThisSession;

            for (const label of divisionLabels) {
                const tempId = `temp_${timestamp}_${i}_${label}`;
                newBatch.push({
                    id: tempId,
                    module_part_id: Number(batchModulePartId),
                    teacher_id: 231,
                    section_id: Number(sectionId),
                    td_groups: gObjects,
                    is_locked: true,
                    tp_subgroup: label,
                    alternance: batchAlternance,
                    slot_id: null,
                    room_id: null
                });
            }
        }

        setAssignments([...baseAssignments, ...newBatch]);
        setIsDirty(true);
    };

    // Fonction de placement manuel LOCALE
    const handlePlaceAssignment = (day: string, hour: string) => {
        if (!selectedAssignmentToPlace) return;

        const ts = timeslots.find((t: any) => t.day.toLowerCase() === day.toLowerCase() && t.start_time.startsWith(hour));
        if (!ts) return;

        const updated = assignments.map(a => {
            if (a.id === selectedAssignmentToPlace.id) {
                return { ...a, slot_id: ts.id };
            }
            return a;
        });

        setAssignments(updated);
        setSelectedAssignmentToPlace(null);
        setIsDirty(true);
    };

    // Sauvegarde Globale en Base de Données
    const handleGlobalSave = async () => {
        try {
            setLoading(true);
            const payload = assignments.map(a => ({
                module_part_id: a.module_part_id,
                teacher_id: a.teacher_id,
                room_id: a.room_id,
                slot_id: a.slot_id,
                section_id: a.section_id,
                is_locked: a.is_locked,
                tp_subgroup: a.tp_subgroup,
                alternance: a.alternance,
                tdgroup_ids: a.td_groups?.map((g: any) => (typeof g === 'object' ? g.id : g)) || []
            }));

            await saveAssignments(payload as any);
            setIsDirty(false);
            alert("Planning validé et enregistré en base de données avec succès !");
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'enregistrement final.");
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les module parts de type TP
    const tpModuleParts = moduleParts.filter(mp => mp.type.toLowerCase() === 'tp');

    // Fonction pour calculer les créneaux disponibles pour une séance de TP donnée (Highlight intelligent)
    const calculateAvailableSlots = (tp: any) => {
        const slots: Record<string, boolean> = {};
        const groups = tp.td_groups || [];
        const groupIds = groups.map((g: any) => typeof g === 'object' ? g.id : g);

        timeslots.forEach((ts: any) => {
            const tsKey = `${ts.day.toLowerCase()}-${ts.start_time.substring(0, 5)}`;

            // Un créneau est libre si aucun des groupes n'a de cours, 
            // OU si le cours existant est un TP en alternance opposée (A vs B)
            const isBusy = assignments.some(a => {
                if (a.slot_id !== ts.id) return false;

                const mp = moduleParts.find(p => p.id === a.module_part_id);
                const isCM = mp?.type === 'CM';

                // Si c'est un CM de toute la section, c'est bloqué pour tout le monde
                if (isCM && String(a.section_id) === String(sectionId)) return true;

                // On vérifie si l'un de nos groupes est concerné
                const hasSameGroup = a.td_groups?.some((g: any) => groupIds.includes(typeof g === 'object' ? g.id : g));

                if (hasSameGroup) {
                    // SI c'est le même groupe, on vérifie si on est en alternance
                    // Si la séance déjà placée est "A" et la nouvelle est "B" (ou inversement), on laisse passer
                    if (a.tp_subgroup && tp.tp_subgroup && a.tp_subgroup !== tp.tp_subgroup) {
                        return false; // Pas bloqué, c'est l'alternance !
                    }
                    return true; // Bloqué car c'est le même groupe sur un cours normal ou sous-groupe identique
                }
                return false;
            });

            if (!isBusy) slots[tsKey] = true;
        });
        return slots;
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: '#1e3a8a', marginBottom: '20px' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a' }}>Chargement de l'interface de gestion...</div>
            </div>
        );
    }

    // Fonction pour retirer un TP de la grille (le remettre dans le panier)
    const handleDeleteAssignment = (assignmentId: any) => {
        const updated = assignments.map(a => {
            if (a.id === assignmentId) {
                return { ...a, slot_id: null }; // Dé-placer
            }
            return a;
        });
        setAssignments(updated);
        setIsDirty(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header Barre de retour */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 20px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={16} /> Retour
                    </button>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        {isDirty && (
                            <>
                                <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', border: 'none', fontWeight: 700 }}>
                                    Annuler
                                </button>
                                <button onClick={handleGlobalSave} style={{ padding: '12px 24px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                                    Valider le planning
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => window.open(`/api/export-excel?mode=fused&section_id=${sectionId}`, "_blank")}
                            style={{
                                padding: '12px 24px', borderRadius: '10px', border: 'none',
                                background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
                            onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
                        >
                            <Download size={16} /> Exporter Excel
                        </button>
                    </div>
                </div>

                {/* Titre & KPI Audit */}
                <div style={{ background: 'white', borderRadius: '24px', padding: '30px', marginBottom: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--navy)', margin: '0 0 10px 0' }}>
                                Cohorte {section?.name || 'Inconnue'}
                            </h1>
                            <div style={{ display: 'flex', gap: '15px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                                <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>Source: RL-ALNS Engine</span>
                                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} /> Synchronisé
                                </span>
                            </div>
                        </div>

                        {/* Audit Score (Design du preview) */}
                        {audit && (
                            <div style={{ background: '#f8fafc', padding: '15px 25px', borderRadius: '16px', display: 'flex', gap: '40px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Score Global</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, color: audit.score > 70 ? '#10b981' : audit.score > 40 ? '#f59e0b' : '#ef4444' }}>
                                        {Math.round(audit.score)}%
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {Object.entries(audit.details || {}).slice(0, 3).map(([key, value]: any) => {
                                        const isCrit = value < 40;
                                        return (
                                            <div key={key} style={{ minWidth: '100px' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{key}</div>
                                                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${value}%`, height: '100%', background: isCrit ? '#ef4444' : '#10b981' }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOUTON VERS GESTION GLOBALE TP */}
                <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    padding: '30px',
                    borderRadius: '24px',
                    marginBottom: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                    color: 'white'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 5px 0' }}>Gestion Spécifique des Travaux Pratiques</h2>
                        <p style={{ margin: 0, opacity: 0.9, fontWeight: 600, fontSize: '0.9rem' }}>
                            Configurez l'alternance (A/B), les rotations et les créneaux de 4h sur une grille dédiée au Tronc Commun.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push(`/maquettes/${id}/tp-management?section=${sectionId}`)}
                        style={{
                            background: 'white', color: '#6366f1', border: 'none',
                            padding: '15px 30px', borderRadius: '14px', fontWeight: 900,
                            fontSize: '0.95rem', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                    >
                        Ouvrir la gestion des TP <ArrowRight size={18} />
                    </button>
                </div>

                {/* THE GRID (Cours & TD Classiques) */}
                <SectionTimetableGrid
                    assignments={assignments}
                    timeslots={timeslots}
                    modules={modules}
                    moduleParts={moduleParts}
                    teachers={teachers}
                    rooms={rooms}
                    sections={sections}
                    tdGroups={tdGroups}
                    selectedId={sectionId}
                    showFiliereAudit={true}
                />
            </div>
        </div>
    );
}
