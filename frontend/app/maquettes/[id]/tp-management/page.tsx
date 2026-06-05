"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getMasterReference, getPreviewSchedule, getAssignments, getTeachers, getRooms, getModules, getModuleParts, getTimeslots, getSections, getTDGroups, createAssignment, getSectionSanctuarizations, saveTPConfig, loadTPConfig } from "@/lib/api";
import { ArrowLeft, Loader2, CheckCircle, Download, Zap, Plus, Layers, Trash2, Calendar, Users, BookOpen } from 'lucide-react';

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TP_SLOTS = [
    { name: "Matin (8h30 - 12h30)", start: "08:30" },
    { name: "Après-midi (14h30 - 18h30)", start: "14:30" }
];

export default function GlobalTPManagement() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    // Section pré-sélectionnée via query param ?section=<id>
    const sectionFromUrl = searchParams.get('section');

    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [moduleParts, setModuleParts] = useState<any[]>([]);
    const [timeslots, setTimeslots] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [tdGroups, setTdGroups] = useState<any[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // Batch Generator States
    const [batchModulePartId, setBatchModulePartId] = useState<number | ''>('');
    const [batchSectionId, setBatchSectionId] = useState<number | ''>('');
    const [sanctuRules, setSanctuRules] = useState<any[]>([]);
    const [batchGroupsPerSession, setBatchGroupsPerSession] = useState(2);
    const [groupDivisions, setGroupDivisions] = useState<Record<number, number>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedAssignmentToPlace, setSelectedAssignmentToPlace] = useState<any>(null);
    const [mergeAlternance, setMergeAlternance] = useState(true);

    useEffect(() => {
        if (batchSectionId) {
            const sectionGroups = tdGroups.filter((g: any) => Number(g.section_id) === Number(batchSectionId));
            const initialDivs: Record<number, number> = {};
            sectionGroups.forEach(g => { initialDivs[g.id] = 2; });
            setGroupDivisions(initialDivs);
        }
    }, [batchSectionId, tdGroups]);

    // Notification Premium states
    const [showNotify, setShowNotify] = useState(false);
    const [notifyMsg, setNotifyMsg] = useState("");
    const [notifyType, setNotifyType] = useState<"success" | "error">("success");

    const notify = (msg: string, type: "success" | "error" = "success") => {
        setNotifyMsg(msg);
        setNotifyType(type);
        setShowNotify(true);
    };

    // Fetch sanctuarisation rules when section changes
    useEffect(() => {
        if (batchSectionId) {
            getSectionSanctuarizations(Number(batchSectionId))
                .then((rules: any) => {
                    setSanctuRules(Array.isArray(rules) ? rules : []);
                })
                .catch(err => {
                    console.error("Error fetching sanctuarizations:", err);
                    setSanctuRules([]);
                });
        } else {
            setSanctuRules([]);
        }
    }, [batchSectionId]);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            // 1. Charger d'abord les ressources statiques
            const [t, r, m, mp, ts, sec, tdg] = await Promise.all([
                getTeachers(),
                getRooms(),
                getModules(),
                getModuleParts(),
                getTimeslots(),
                getSections(),
                getTDGroups(),
            ]);
            setTeachers(t); setRooms(r); setModules(m);
            setModuleParts(mp); setTimeslots(ts); setSections(sec); setTdGroups(tdg);

            // 2. Charger le MASTER REFERENCE (L'emploi du temps officiel ou Fallback IA)
            let masterData: any[] = [];
            try {
                const masterRes = await getMasterReference();
                masterData = masterRes.data;
                setAssignments(masterData);

                // Si ce n'est pas un master explicite (pas étoilé), on peut garder l'alerte informative
                if (!masterRes.is_master_reference) {
                    notify("Note : Aucun 'Master Reference' n'est défini. Les données du dernier run IA sont utilisées par défaut.", "success");
                }
            } catch (err) {
                console.warn("Aucune donnée disponible en base.");
                notify("Attention : Aucun emploi du temps trouvé en base de données. Veuillez lancer une génération ou valider un rapport.", "error");
                setAssignments([]);
            }

            // Auto-sélection : priorité au query param ?section= de l'URL
            if (sec.length > 0) {
                let selectedId = sec[0].id;
                if (sectionFromUrl) {
                    const match = sec.find((s: any) => String(s.id) === String(sectionFromUrl));
                    if (match) selectedId = match.id;
                }
                setBatchSectionId(selectedId);

                const savedData: any = await loadTPConfig(selectedId);
                const savedTps = Array.isArray(savedData) ? savedData : savedData?.assignments || [];

                if (savedData && !Array.isArray(savedData) && typeof savedData.merge_alternance === 'boolean') {
                    setMergeAlternance(savedData.merge_alternance);
                }

                if (savedTps && savedTps.length > 0) {
                    const baseWithoutTps = masterData.filter((asgn: any) => {
                        const mpItem = mp.find(p => p.id === asgn.module_part_id);
                        return mpItem?.type?.toLowerCase() !== 'tp';
                    });
                    setAssignments([...baseWithoutTps, ...savedTps]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchGenerate = async () => {
        if (!batchModulePartId || !batchSectionId) return;
        setIsGenerating(true);
        try {
            const mp = moduleParts.find(p => p.id === batchModulePartId);
            if (!mp) return;

            const sectionGroups = tdGroups.filter((g: any) => Number(g.section_id) === Number(batchSectionId));
            const groupsPerSession = Number(batchGroupsPerSession);

            // ÉTAPE 1 : Regroupement intelligent par affinité de sanctuarisation
            const remainingGroups = [...sectionGroups];
            const chunks: any[][] = [];

            while (remainingGroups.length > 0) {
                const baseGroup = remainingGroups.shift();
                if (!baseGroup) break;

                const currentChunk = [baseGroup];

                // Trouver les partenaires ayant les MEMES blocages (affinité maximale)
                let partners = [...remainingGroups].map(competitor => {
                    const baseBlocking = sanctuRules.filter(r => r.group_id === baseGroup.id).map(r => r.day + r.is_morning).sort().join(",");
                    const compBlocking = sanctuRules.filter(r => r.group_id === competitor.id).map(r => r.day + r.is_morning).sort().join(",");
                    const score = (baseBlocking === compBlocking && baseBlocking.length > 0) ? 100 : 0;
                    return { competitor, score };
                });

                partners.sort((a, b) => b.score - a.score);

                // Associer jusqu'à atteindre la taille désirée
                for (const p of partners) {
                    if (currentChunk.length < groupsPerSession) {
                        currentChunk.push(p.competitor);
                        const idx = remainingGroups.findIndex(rg => rg.id === p.competitor.id);
                        if (idx !== -1) remainingGroups.splice(idx, 1);
                    }
                }
                chunks.push(currentChunk);
            }

            // ÉTAPE 2 : Création des subdivisions avec gestion asymétrique
            const newAsgns: any[] = [];

            chunks.forEach(chunk => {
                // Trouver la division maximale requise pour ce groupe fusionné
                const maxDivision = Math.max(...chunk.map(g => groupDivisions[g.id] || 2));

                for (let j = 0; j < maxDivision; j++) {
                    const letter = String.fromCharCode(65 + j);

                    // Seuls les groupes ayant besoin de cette itération (j) participent
                    const participatingGroupIds = chunk
                        .filter(g => j < (groupDivisions[g.id] || 2))
                        .map(g => g.id);

                    if (participatingGroupIds.length > 0) {
                        newAsgns.push({
                            id: `temp-${Date.now()}-${Math.random()}`,
                            module_part_id: mp.id,
                            section_id: Number(batchSectionId),
                            td_groups: participatingGroupIds,
                            tp_subgroup: letter,
                            alternance: maxDivision > 1 ? "par alternance" : null,
                            slot_id: null,
                            teacher_id: 231,
                            room_id: null
                        });
                    }
                }
            });

            setAssignments([...assignments, ...newAsgns]);
            setIsDirty(true);
            notify(`Succès ! Les groupes ont été fusionnés par compatibilité avec vos critères de division spécifiques.`, "success");
        } catch (e) {
            console.error("Erreur génération:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const calculateAvailableSlots = (tp: any) => {
        const result: any = {};
        const gIds = tp.td_groups?.map((g: any) => typeof g === 'object' ? g.id : g) || [];

        DAYS.forEach(day => {
            result[day] = [0, 1].map(slotIdx => {
                const isMorning = slotIdx === 0;
                const hoursToCheck = isMorning ? ['08', '10'] : ['14', '16'];

                // 1. Détection de Conflit (CM/TD)
                const conflict = assignments.find(a => {
                    if (!a.slot_id) return false;
                    const ts = timeslots.find(t => t.id === a.slot_id);
                    if (!ts || ts.day.toLowerCase() !== day.toLowerCase()) return false;
                    if (!ts.start_time.startsWith(hoursToCheck[0]) && !ts.start_time.startsWith(hoursToCheck[1])) return false;

                    const asgnGids = a.td_groups?.map((g: any) => typeof g === 'object' ? g.id : g) || [];
                    const hasCommonGroup = gIds.some((id: any) => asgnGids.includes(id));
                    const isSectionWide = Number(a.section_id) === Number(batchSectionId) && (!a.td_groups || a.td_groups.length === 0);

                    const mp = moduleParts.find(p => p.id === a.module_part_id);
                    return (mp?.type?.toLowerCase() !== "tp") && (hasCommonGroup || isSectionWide);
                });

                // 2. Vérification Sanctuarisation (Est-ce le slot idéal réservé par l'user ?)
                const isSanctuarised = sanctuRules.some(r =>
                    r.day.toUpperCase() === day.toUpperCase() &&
                    r.is_morning === isMorning &&
                    gIds.includes(r.group_id)
                );

                // 3. Calcul de la Sinergy Section (Combien de groupes sont libres ?)
                const sectionGroups = tdGroups.filter(g => Number(g.section_id) === Number(batchSectionId));
                const freeCount = sectionGroups.filter(g => {
                    return !assignments.find(a => {
                        if (!a.slot_id) return false;
                        const ts = timeslots.find(t => t.id === a.slot_id);
                        if (!ts || ts.day.toLowerCase() !== day.toLowerCase()) return false;
                        if (!ts.start_time.startsWith(hoursToCheck[0]) && !ts.start_time.startsWith(hoursToCheck[1])) return false;
                        const asgnGids = a.td_groups?.map((gid: any) => typeof gid === 'object' ? gid.id : gid) || [];
                        const mp = moduleParts.find(p => p.id === a.module_part_id);
                        return (mp?.type?.toLowerCase() !== "tp") && (asgnGids.includes(g.id) || (Number(a.section_id) === Number(batchSectionId) && !a.td_groups));
                    });
                }).length;

                return {
                    available: !conflict,
                    isIdeal: isSanctuarised && !conflict,
                    synergy: freeCount / sectionGroups.length,
                    conflict: conflict
                };
            });
        });
        return result;
    };

    const calculateGlobalSectionAvailability = () => {
        if (!batchSectionId) return {};
        const result: any = {};
        const sectionGroups = tdGroups.filter(g => Number(g.section_id) === Number(batchSectionId));
        if (sectionGroups.length === 0) return {};

        DAYS.forEach(day => {
            result[day] = [0, 1].map(slotIdx => {
                const isMorning = slotIdx === 0;
                const hoursToCheck = isMorning ? ['08', '10'] : ['14', '16'];

                const freeGroups = sectionGroups.filter(g => {
                    return !assignments.find(a => {
                        if (!a.slot_id) return false;
                        const ts = timeslots.find(t => t.id === a.slot_id);
                        if (!ts || ts.day.toLowerCase() !== day.toLowerCase()) return false;
                        if (!ts.start_time.startsWith(hoursToCheck[0]) && !ts.start_time.startsWith(hoursToCheck[1])) return false;
                        const asgnGids = a.td_groups?.map((gid: any) => typeof gid === 'object' ? gid.id : gid) || [];
                        const mp = moduleParts.find(p => p.id === a.module_part_id);
                        return (mp?.type?.toLowerCase() !== "tp") && (asgnGids.includes(g.id) || (Number(a.section_id) === Number(batchSectionId) && !a.td_groups));
                    });
                });

                const synergy = freeGroups.length / sectionGroups.length;

                // Idéal si sanctuarisé pour au moins un groupe de la section
                const isIdeal = sanctuRules.some(r =>
                    r.day.toUpperCase() === day.toUpperCase() &&
                    r.is_morning === isMorning &&
                    sectionGroups.some(sg => sg.id === r.group_id)
                );

                // Noms courts des groupes libres : "1", "2", "3"...
                const freeGroupNames = freeGroups.map(g => {
                    const parts = g.name.split(" ");
                    return parts[parts.length - 1]; // Juste le numéro : "1", "2"...
                });

                return {
                    synergy,
                    isIdeal,
                    freeGroupNames,
                    isTotalFree: synergy === 1
                };
            });
        });
        return result;
    };

    const globalAvailability = calculateGlobalSectionAvailability();
    const availableSlots = selectedAssignmentToPlace ? calculateAvailableSlots(selectedAssignmentToPlace) : {};

    const handlePlaceAssignment = (day: string, slotIndex: number) => {
        if (!selectedAssignmentToPlace) return;
        const res = availableSlots[day]?.[slotIndex];
        if (!res?.available) {
            notify("Impossible : Un ou plusieurs groupes ont déjà un cours sur ce créneau ! Choisissez un autre moment.", "error");
            return;
        }

        const slot = TP_SLOTS[slotIndex];
        const tsMatch = timeslots.find(t =>
            t.day.toLowerCase() === day.toLowerCase() &&
            t.start_time.startsWith(slot.start)
        );

        if (!tsMatch) return;

        const updated = assignments.map(a => {
            if (a.id === selectedAssignmentToPlace.id) {
                return { ...a, slot_id: tsMatch.id };
            }
            return a;
        });

        setAssignments(updated);
        setSelectedAssignmentToPlace(null);
        setIsDirty(true);
    };

    const unplacedTps = assignments.filter(a => {
        const mp = moduleParts.find(p => p.id === a.module_part_id);
        return mp?.type.toLowerCase() === 'tp' && a.slot_id === null;
    });

    const handleGlobalSave = async () => {
        if (!batchSectionId) return;
        try {
            setLoading(true);
            // On ne sauvegarde que les TP (ceux qui ont un tp_subgroup ou sont de type TP)
            const tpPlanning = assignments.filter(a => {
                const mpItem = moduleParts.find(p => p.id === a.module_part_id);
                return mpItem?.type?.toLowerCase() === 'tp';
            });

            await saveTPConfig(Number(batchSectionId), tpPlanning, mergeAlternance);
            setIsDirty(false);
            notify(`Configuration TP pour ${sections.find(s => s.id === batchSectionId)?.name} sauvegardée avec succès dans la base de données.`, "success");
        } catch (e) {
            console.error(e);
            notify("Erreur lors de la sauvegarde du fichier TP. Vérifiez votre connexion.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleClearBucket = () => {
        // Garder uniquement les assignments qui sont déjà placés ou qui ne sont pas des TP
        const updated = assignments.filter(a => {
            const mp = moduleParts.find(p => p.id === a.module_part_id);
            const isTp = mp?.type.toLowerCase() === 'tp';
            return !isTp || a.slot_id !== null;
        });
        setAssignments(updated);
        setIsDirty(true);
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
            <Loader2 className="animate-spin" size={40} color="#6366f1" />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px' }}>
            <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', cursor: 'pointer' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>Gestion Globale des Travaux Pratiques</h1>
                            <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>
                                {batchSectionId
                                    ? sections.find((s: any) => s.id === batchSectionId)?.name ?? 'Chargement...'
                                    : 'Sélectionnez une section'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        {isDirty && (
                            <button onClick={handleGlobalSave} style={{ background: '#10b981', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}>
                                Sauvegarder
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (batchSectionId) {
                                    window.open(`/api/v1/export-tp-excel/${batchSectionId}?merge=${mergeAlternance}`, "_blank");
                                } else {
                                    alert("Veuillez sélectionner une section.");
                                }
                            }}
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <Download size={18} /> Export Excel TP
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>

                    {/* LEFT PANEL: BUCKET & GENERATOR */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {/* GENERATOR */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e3a8a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Zap size={18} color="#8b5cf6" /> Générateur Rapide
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>Section / Tronc Commun</span>
                                    <select
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}
                                        value={batchSectionId}
                                        onChange={(e) => setBatchSectionId(Number(e.target.value))}
                                    >
                                        <option value="">Choisir la Section...</option>
                                        {sections.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>Module de TP</span>
                                    <select
                                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}
                                        value={batchModulePartId}
                                        onChange={(e) => setBatchModulePartId(Number(e.target.value))}
                                    >
                                        <option value="">Sélectionner Module TP...</option>
                                        {moduleParts.filter(mp => mp.type.toLowerCase() === 'tp').sort((a, b) => (modules.find(m => m.id === a.module_id)?.name || "").localeCompare(modules.find(m => m.id === b.module_id)?.name || "")).map(mp => (
                                            <option key={mp.id} value={mp.id}>{modules.find(m => m.id === mp.module_id)?.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>Regrouper ensemble</span>
                                    <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }} value={batchGroupsPerSession} onChange={e => setBatchGroupsPerSession(Number(e.target.value))}>
                                        <option value={1}>1 groupe par session (Solo)</option>
                                        <option value={2}>2 groupes ensemble (Affinité)</option>
                                        <option value={3}>3 groupes ensemble (Affinité)</option>
                                        <option value={4}>4 groupes ensemble (Affinité)</option>
                                    </select>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Subdivisions par groupe</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {tdGroups.filter(g => Number(g.section_id) === Number(batchSectionId)).map(group => (
                                            <div key={group.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a' }}>{group.name}</span>
                                                <select
                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}
                                                    value={groupDivisions[group.id] || 2}
                                                    onChange={e => setGroupDivisions({ ...groupDivisions, [group.id]: Number(e.target.value) })}
                                                >
                                                    <option value={1}>Seul (1)</option>
                                                    <option value={2}>Div. en 2 (A/B)</option>
                                                    <option value={3}>Div. en 3 (A/B/C)</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                                    <input
                                        type="checkbox"
                                        id="mergeAlternance"
                                        checked={mergeAlternance}
                                        onChange={(e) => setMergeAlternance(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="mergeAlternance" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                                        Fusionner les sous-groupes d'un même module (Affichage Alternance/Quinzaine)
                                    </label>
                                </div>
                                <button onClick={handleBatchGenerate} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                                    Générer les sessions
                                </button>
                            </div>
                        </div>

                        {/* BUCKET */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Layers size={18} color="#1e3a8a" /> Panier ({unplacedTps.length})
                                </h3>
                                <button onClick={handleClearBucket} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                                    Vider
                                </button>
                            </div>
                            <div style={{ overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {unplacedTps.map(tp => {
                                    const mod = modules.find(m => m.id === moduleParts.find(p => p.id === tp.module_part_id)?.module_id);
                                    const isSelected = selectedAssignmentToPlace?.id === tp.id;
                                    const gNames = tp.td_groups?.map((gid: any) => {
                                        const g = tdGroups.find(tg => tg.id === gid);
                                        return g?.name?.split(" ").pop() + (tp.tp_subgroup || "");
                                    }).join(" & ");

                                    return (
                                        <div key={tp.id} onClick={() => setSelectedAssignmentToPlace(isSelected ? null : tp)} style={{ padding: '12px', borderRadius: '12px', border: isSelected ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: isSelected ? '#f5f3ff' : '#f8fafc', cursor: 'pointer' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a' }}>{mod?.name}</div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{gNames}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* MAIN: THE TP GRID */}
                    <div style={{ background: 'white', borderRadius: '32px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px rgba(0,0,0,0.04)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '100px' }}></th>
                                        {TP_SLOTS.map(s => (
                                            <th key={s.name} style={{ background: '#fef3c7', padding: '15px', borderRadius: '12px', color: '#92400e', fontWeight: 900, fontSize: '0.9rem', textAlign: 'center' }}>
                                                {s.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map(day => (
                                        <tr key={day}>
                                            <td style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', fontWeight: 900, color: '#1e3a8a', verticalAlign: 'middle', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                                {day}
                                            </td>
                                            {TP_SLOTS.map((slot, idx) => {
                                                const slotInfo = selectedAssignmentToPlace ? availableSlots[day]?.[idx] : globalAvailability[day]?.[idx];
                                                const isAvailable = !!slotInfo?.available || (!selectedAssignmentToPlace && slotInfo?.synergy > 0);
                                                const isIdeal = !!slotInfo?.isIdeal || !!slotInfo?.is_ideal;
                                                const synergy = slotInfo?.synergy || 0;
                                                const freeGroupNames: string[] = slotInfo?.freeGroupNames || [];

                                                const slotMatches = assignments.filter(a => {
                                                    const mp = moduleParts.find(p => p.id === a.module_part_id);
                                                    if (mp?.type.toLowerCase() !== 'tp') return false;
                                                    const ts = timeslots.find(t => t.id === a.slot_id);
                                                    if (ts?.day.toLowerCase() !== day.toLowerCase()) return false;

                                                    const hour = parseInt(ts?.start_time.split(":")[0]);
                                                    if (idx === 0) return hour >= 8 && hour < 13;
                                                    return hour >= 14 && hour < 19;
                                                });

                                                const blockedGroupsNames = sanctuRules
                                                    .filter(r =>
                                                        r.day.toUpperCase() === day.toUpperCase() &&
                                                        r.is_morning === (idx === 0)
                                                    )
                                                    .map(r => {
                                                        const g = tdGroups.find((tg: any) => tg.id === r.group_id);
                                                        return g ? g.name.split(" ").slice(-2).join(" ") : null;
                                                    })
                                                    .filter(Boolean);

                                                // Logique de couleur dynamique améliorée
                                                let bgColor = 'white';
                                                let borderColor = '#ced4da';
                                                let borderStyle = 'dashed';

                                                if (isIdeal) {
                                                    bgColor = '#fffbeb';
                                                    borderColor = '#fbbf24';
                                                    borderStyle = 'solid';
                                                } else if (selectedAssignmentToPlace && isAvailable) {
                                                    bgColor = '#f0fdf4'; // VERT ÉMERAUDE pour les choix possibles
                                                    borderColor = '#22c55e';
                                                    borderStyle = 'solid';
                                                } else if (!selectedAssignmentToPlace && synergy === 1) {
                                                    bgColor = '#f0fdf4';
                                                    borderColor = '#22c55e';
                                                } else if (!selectedAssignmentToPlace && synergy > 0.5) {
                                                    bgColor = '#eff6ff';
                                                    borderColor = '#3b82f6';
                                                } else if (selectedAssignmentToPlace && !isAvailable) {
                                                    bgColor = '#f1f5f9';
                                                    borderStyle = 'solid';
                                                }

                                                return (
                                                    <td key={idx}
                                                        onClick={() => handlePlaceAssignment(day, idx)}
                                                        style={{
                                                            minHeight: '140px',
                                                            background: bgColor,
                                                            border: `${isIdeal ? '3px' : '1px'} ${borderStyle} ${borderColor}`,
                                                            borderRadius: '16px', padding: '10px', verticalAlign: 'top',
                                                            cursor: selectedAssignmentToPlace ? (isAvailable ? 'crosshair' : 'not-allowed') : 'default',
                                                            boxShadow: isIdeal ? '0 0 15px rgba(251, 191, 36, 0.2)' : 'none',
                                                            opacity: selectedAssignmentToPlace && !isAvailable ? 0.6 : 1,
                                                            transition: 'all 0.2s',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {isIdeal && (
                                                            <div style={{ position: 'absolute', top: -10, right: 10, background: '#fbbf24', color: 'white', fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', zIndex: 10 }}>
                                                                IDEAL
                                                            </div>
                                                        )}

                                                        {freeGroupNames.length > 0 && (
                                                            <div style={{
                                                                padding: '8px 12px',
                                                                background: synergy === 1 ? 'linear-gradient(135, #22c55e, #10b981)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                                borderRadius: '14px',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 900,
                                                                color: 'white',
                                                                lineHeight: 1.4,
                                                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                                                border: 'none',
                                                                marginBottom: '10px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', boxShadow: '0 0 5px white' }}></div>
                                                                    <span style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>
                                                                        {synergy === 1 ? 'SECTION LIBRE' : 'GROUPES LIBRES'}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem' }}>Gr {freeGroupNames.join(', ')}</div>
                                                            </div>
                                                        )}

                                                        {blockedGroupsNames.length > 0 && (
                                                            <div style={{ padding: '4px 8px', background: '#fecaca', border: '1px solid #ef4444', color: '#b91c1c', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, marginBottom: '8px', textAlign: 'center' }}>
                                                                🔒 RESERVÉ : {blockedGroupsNames.join(", ")}
                                                            </div>
                                                        )}
                                                        {selectedAssignmentToPlace && !isAvailable && (
                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem', fontWeight: 800, textAlign: 'center', pointerEvents: 'none' }}>
                                                                GROUPE OCCUPÉ (CM/TD)
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {(() => {
                                                                // Regrouper les assignments selon le paramètre 'mergeAlternance'
                                                                const groupedByModule: Record<string, any[]> = {};
                                                                slotMatches.forEach(asgn => {
                                                                    const mp = moduleParts.find(p => p.id === asgn.module_part_id);
                                                                    if (mp?.module_id) {
                                                                        const key = mergeAlternance ? mp.module_id.toString() : asgn.id.toString();
                                                                        if (!groupedByModule[key]) groupedByModule[key] = [];
                                                                        groupedByModule[key].push(asgn);
                                                                    }
                                                                });

                                                                return Object.entries(groupedByModule).map(([renderingKey, items]) => {
                                                                    const mpItem = moduleParts.find(p => p.id === items[0].module_part_id);
                                                                    const mod = modules.find(m => m.id === mpItem?.module_id);
                                                                    const isBA = mod?.name?.toLowerCase().includes("biologie");
                                                                    const isGeo = mod?.name?.toLowerCase().includes("géo");
                                                                    const isReact = mod?.name?.toLowerCase().includes("réactive");

                                                                    const color = isBA ? "#dcfce7" : isGeo ? "#dbeafe" : isReact ? "#f3f4f6" : "#f1f5f9";
                                                                    const border = isBA ? "#22c55e" : isGeo ? "#3b82f6" : isReact ? "#64748b" : "#e2e8f0";
                                                                    const textColor = isBA ? "#166534" : isGeo ? "#1e40af" : isReact ? "#1e293b" : "#475569";

                                                                    // Détecter l'alternance vs quinzaine (UNIQUEMENT si l'affichage fusionné est actif)
                                                                    const subGroups = items.map(it => it.tp_subgroup).filter(Boolean);
                                                                    const isAlternance = mergeAlternance && items.length > 1;
                                                                    const isQuinzaine = mergeAlternance && items.length === 1 && subGroups.length > 0;
                                                                    const typeLabel = isAlternance ? " (par alternance)" : isQuinzaine ? " (par quinzaine)" : "";

                                                                    // Formater les noms de groupes
                                                                    const gNames = items.map(it => {
                                                                        const names = it.td_groups?.map((gid: any) => {
                                                                            const gr = tdGroups.find(tg => tg.id === (typeof gid === 'object' ? gid.id : gid));
                                                                            const num = gr?.name?.split(" ").pop() ?? "";
                                                                            return `Gr ${num}${it.tp_subgroup || ""}`;
                                                                        }).filter(Boolean).join(" & ");
                                                                        return names;
                                                                    }).join(" / ");

                                                                    return (
                                                                        <div key={renderingKey} style={{
                                                                            background: color, borderLeft: `4px solid ${border}`,
                                                                            padding: '10px 12px', borderRadius: '10px',
                                                                            fontSize: '0.72rem', fontWeight: 700, color: textColor,
                                                                            position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                                        }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                                                                        TP de {mod?.name || "Module"}
                                                                                    </span>
                                                                                    <span style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                                                                        {gNames}
                                                                                    </span>
                                                                                </div>
                                                                                <div style={{ fontSize: '0.6rem', opacity: 0.8, fontStyle: 'italic' }}>
                                                                                    {typeLabel}
                                                                                </div>
                                                                            </div>

                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const idsToRemove = items.map(it => it.id);
                                                                                    setAssignments(assignments.map(as => idsToRemove.includes(as.id) ? { ...as, slot_id: null } : as));
                                                                                    setIsDirty(true);
                                                                                }}
                                                                                style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            >✕</button>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- MODAL DE NOTIFICATION PREMIUM TP --- */}
            <AnimatePresence>
                {showNotify && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,31,75,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25 }}
                            style={{ background: 'white', width: '90%', maxWidth: '420px', borderRadius: '32px', boxShadow: '0 30px 60px rgba(11,31,75,0.15)', padding: '50px 40px', textAlign: 'center' }}>

                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: notifyType === 'success' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', boxShadow: notifyType === 'success' ? '0 12px 25px rgba(16,185,129,0.1)' : '0 12px 25px rgba(239,68,68,0.1)' }}>
                                {notifyType === 'success' ? <CheckCircle size={40} color="#10b981" /> : <Layers size={40} color="#ef4444" />}
                            </div>

                            <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0b1f4b', margin: '0 0 12px' }}>
                                {notifyType === 'success' ? 'Action réussie' : 'Attention'}
                            </h3>

                            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#64748b', lineHeight: 1.6, margin: '0 0 35px' }}>
                                {notifyMsg}
                            </p>

                            <button onClick={() => setShowNotify(false)}
                                style={{ width: '100%', padding: '18px', borderRadius: '18px', border: 'none', background: notifyType === 'success' ? '#10b981' : '#0b1f4b', color: 'white', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                                {notifyType === 'success' ? 'C\'est compris' : 'Fermer'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

import { motion, AnimatePresence } from "framer-motion";
