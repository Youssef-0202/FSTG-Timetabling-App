"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPreviewSchedule, getTeachers, getRooms, getModules, getModuleParts, getTimeslots, getSections, getTDGroups, auditSection } from "@/lib/api";
import { ArrowLeft, Loader2, Printer, CheckCircle, AlertTriangle, Download } from 'lucide-react';
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
    const sectionTdGroups = tdGroups.filter((g: any) => String(g.section_id) === String(sectionId));

    // Calcul des créneaux libres pour les groupes sélectionnés
    const availableTpSlots: Record<string, boolean> = {};
    if (tpMode && selectedTpGroups.length > 0) {
        const uniqueHours = Array.from(new Set(timeslots.map((t: any) => t.start_time.substring(0, 5)))).sort() as string[];
        const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

        uniqueHours.forEach(hour => {
            DAYS_ORDER.forEach(day => {
                const tsKey = `${day.toLowerCase()}-${hour}`;

                // Recherche des cours assignés à ce slot pour la section ou les groupes
                const hasConflict = assignments.some(a => {
                    const ts = timeslots.find((t: any) => t.id === a.slot_id);
                    if (!ts) return false;
                    if (ts.day.toLowerCase() !== day.toLowerCase() || !ts.start_time.startsWith(hour)) return false;

                    const mp = moduleParts.find((p: any) => p.id === a.module_part_id);
                    const isCM = mp?.type?.toLowerCase() === 'cm';

                    // Si c'est un CM de toute la section, ça bloque tous les groupes.
                    if (isCM && String(a.section_id) === String(sectionId)) return true;

                    // Si c'est un TD/TP, vérifier s'il concerne l'un des groupes sélectionnés
                    if (a.td_groups && selectedTpGroups.some(gId => a.td_groups.includes(gId) || a.td_groups.some((tg: any) => typeof tg === 'object' && tg.id === gId))) {
                        return true;
                    }
                    return false;
                });

                availableTpSlots[tsKey] = !hasConflict;
            });
        });
    }

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
                <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: 'var(--navy)', marginBottom: '20px' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>Extraction algorithmique RL-ALNS en cours...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header Barre de retour */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                            padding: '12px 20px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy)',
                            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={e => e.currentTarget.style.background = 'white'}
                    >
                        <ArrowLeft size={16} /> Retour à la filière
                    </button>

                    <button
                        onClick={() => window.open(`/api/export-excel?mode=fused&section_id=${sectionId}`, "_blank")}
                        style={{
                            padding: '12px 24px', borderRadius: '10px', border: 'none',
                            background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
                        onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
                    >
                        <Download size={16} /> Exporter Excel
                    </button>
                </div>

                {/* Titre & KPI Audit */}
                <div style={{ background: 'white', borderRadius: '24px', padding: '30px', marginBottom: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--navy)', margin: '0 0 10px 0' }}>
                                Cohorte {section?.name || 'Inconnue'}
                            </h1>
                            <div style={{ display: 'flex', gap: '15px', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
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

                    {/* TOOLBAR CREATION TP */}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 800, color: 'var(--navy)', fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={tpMode}
                                    onChange={(e) => setTpMode(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                                />
                                Activer Mode TP
                            </label>
                        </div>

                        {tpMode && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)' }}>Sélectionner Groupes :</span>
                                {sectionTdGroups.map((g: any) => {
                                    const isSelected = selectedTpGroups.includes(g.id);
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedTpGroups(selectedTpGroups.filter(id => id !== g.id));
                                                } else {
                                                    setSelectedTpGroups([...selectedTpGroups, g.id]);
                                                }
                                            }}
                                            style={{
                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800,
                                                background: isSelected ? '#1e3a8a' : '#f1f5f9',
                                                color: isSelected ? 'white' : '#64748b',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 2px 5px rgba(30, 58, 138, 0.3)' : 'none'
                                            }}
                                        >
                                            {g.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* THE GRID */}
                <SectionTimetableGrid
                    assignments={assignments}
                    timeslots={timeslots}
                    moduleParts={moduleParts}
                    modules={modules}
                    teachers={teachers}
                    rooms={rooms}
                    sections={sections}
                    tdGroups={tdGroups}
                    selectedId={sectionId}
                    showFiliereAudit={true}
                    availableTpSlots={availableTpSlots}
                />
            </div>
        </div>
    );
}
