"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Info, Settings2, ShieldCheck, Database, Calendar,
    X, CheckCircle2, AlertCircle, Loader2, Save,
    ChevronRight, Lock
} from 'lucide-react';
import {
    getStats, getSections, getTDGroups,
    getSectionSanctuarizations, updateSectionSanctuarizations
} from '@/lib/api';

interface PreRunDashboardProps {
    onConfirm: () => void;
    onClose: () => void;
    algoName: string;
}

const DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

export default function PreRunDashboard({ onConfirm, onClose, algoName }: PreRunDashboardProps) {
    const [stats, setStats] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [groups, setGroups] = useState<any[]>([]);
    const [sanctuarizations, setSanctuarizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [s, sec] = await Promise.all([getStats(), getSections()]);
            setStats(s);
            setSections(sec);
            if (sec.length > 0) handleSelectSection(sec[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSection = async (section: any) => {
        setSelectedSection(section);
        try {
            const [g, rules] = await Promise.all([
                getTDGroups(),
                getSectionSanctuarizations(section.id)
            ]);
            setGroups(g.filter((gr: any) => gr.section_id === section.id));
            setSanctuarizations(rules);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleRule = (groupId: number, day: string, isMorning: boolean) => {
        const exists = sanctuarizations.find(r => r.group_id === groupId && r.day === day && r.is_morning === isMorning);
        if (exists) {
            setSanctuarizations(sanctuarizations.filter(r => r !== exists));
        } else {
            setSanctuarizations([...sanctuarizations, { group_id: groupId, day, is_morning: isMorning }]);
        }
    };

    const handleSaveRules = async () => {
        if (!selectedSection) return;
        setSaving(true);
        try {
            await updateSectionSanctuarizations(selectedSection.id, sanctuarizations);
            alert("Configuration sanctuarisée avec succès !");
        } catch (e) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    style={{
                        width: '100%', maxWidth: '1200px', height: '85vh', background: 'white',
                        borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* HEADER */}
                    <div style={{ padding: '30px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                <Settings2 size={24} color="#6366f1" />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                                    Cockpit de Pilotage : <span style={{ color: '#6366f1' }}>{algoName}</span>
                                </h2>
                            </div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Configuration des contraintes et validation des données avant lancement</p>
                        </div>
                        <button onClick={onClose} style={{ padding: '10px', borderRadius: '12px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* LEFT PANEL : STATS & SECTIONS */}
                        <div style={{ width: '350px', borderRight: '1px solid #f1f5f9', background: '#f8fafc', padding: '30px', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>Intégrité des Données</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <StatItem icon={<Calendar size={16} />} label="Séances à placer" value={stats?.total_assignments} />
                                    <StatItem icon={<Info size={16} />} label="Enseignants" value={stats?.total_teachers} />
                                    <StatItem icon={<Database size={16} />} label="Salles dispo." value={stats?.total_rooms} />
                                    <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #bbf7d0' }}>
                                        <CheckCircle2 size={18} color="#16a34a" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Physiquement Faisable</span>
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>Sections</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sections.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSelectSection(s)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '14px', borderRadius: '14px', border: 'none',
                                            background: selectedSection?.id === s.id ? '#6366f1' : 'white',
                                            color: selectedSection?.id === s.id ? 'white' : '#1e293b',
                                            cursor: 'pointer', transition: '0.2s', textAlign: 'left',
                                            boxShadow: selectedSection?.id === s.id ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none'
                                        }}
                                    >
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{s.name}</span>
                                        <ChevronRight size={16} opacity={selectedSection?.id === s.id ? 1 : 0.3} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* MAIN AREA : TP RULES */}
                        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Sanctuarisation des TP</h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Cochez les demi-journées réservées pour chaque groupe de {selectedSection?.name}</p>
                                </div>
                                <button
                                    onClick={handleSaveRules}
                                    disabled={saving}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                                        borderRadius: '12px', border: 'none', background: '#1e293b',
                                        color: 'white', fontWeight: 800, cursor: 'pointer'
                                    }}
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Appliquer
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Groupe</th>
                                            {DAYS.map(d => (
                                                <th key={d} colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, borderBottom: '2px solid #f1f5f9' }}>{d}</th>
                                            ))}
                                        </tr>
                                        <tr>
                                            <th></th>
                                            {DAYS.map(d => (
                                                <React.Fragment key={d}>
                                                    <th style={{ fontSize: '0.6rem', color: '#94a3b8' }}>M</th>
                                                    <th style={{ fontSize: '0.6rem', color: '#94a3b8' }}>A</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map(g => (
                                            <tr key={g.id}>
                                                <td style={{ padding: '12px', fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{g.name}</td>
                                                {DAYS.map(d => (
                                                    <React.Fragment key={d}>
                                                        <Cell
                                                            active={!!sanctuarizations.find(r => r.group_id === g.id && r.day === d && r.is_morning === true)}
                                                            onClick={() => toggleRule(g.id, d, true)}
                                                        />
                                                        <Cell
                                                            active={!!sanctuarizations.find(r => r.group_id === g.id && r.day === d && r.is_morning === false)}
                                                            onClick={() => toggleRule(g.id, d, false)}
                                                        />
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '40px', padding: '24px', background: '#fffbeb', borderRadius: '20px', border: '1px solid #fef3c7', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '12px' }}>
                                    <AlertCircle size={24} color="#d97706" />
                                </div>
                                <div>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#92400e' }}>Conseils de Paramétrage</h5>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#b45309', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.6 }}>
                                        <li>Cocher une case interdit à l'IA de placer des cours CM, TD ou TP sur cette demi-journée entière.</li>
                                        <li>Le moteur privilégiera les créneaux restants pour remplir l'emploi du temps.</li>
                                        <li>Assurez-vous de laisser suffisamment de créneaux libres pour les cours magistraux !</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div style={{ padding: '30px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: '#f8fafc' }}>
                        <button onClick={onClose} style={{ padding: '14px 28px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}>Annuler</button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '14px 40px', borderRadius: '14px', border: 'none',
                                background: '#6366f1', color: 'white', fontWeight: 900,
                                cursor: 'pointer', fontSize: '1rem',
                                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}
                        >
                            DÉMARRER L'OPTIMISATION <ChevronRight size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function StatItem({ icon, label, value }: any) {
    return (
        <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#6366f1' }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{value || 0}</div>
            </div>
        </div>
    );
}

function Cell({ active, onClick }: any) {
    return (
        <td
            onClick={onClick}
            style={{
                width: '30px', height: '30px', cursor: 'pointer', transition: '0.2s',
                background: active ? '#ef4444' : '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '6px',
                position: 'relative'
            }}
        >
            {active && <Lock size={12} color="white" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
        </td>
    );
}
