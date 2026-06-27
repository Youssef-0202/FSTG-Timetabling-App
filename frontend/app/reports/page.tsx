"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, Clock, CheckCircle, AlertCircle, FileText,
    ArrowLeft, Layout, FileSpreadsheet, Trash2, ShieldAlert,
    BarChart3, Download, Search, Filter, Star, Check
} from "lucide-react";
import { getTimetableResults, deleteTimetableResult, TimetableResult } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

// Interface déplacée vers api.ts

export default function ReportsPage() {
    const router = useRouter();
    const [results, setResults] = useState<TimetableResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadData = React.useCallback(() => {
        setLoading(true);
        getTimetableResults()
            .then(data => {
                setResults(data.filter(r => r.is_validated === true));
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSetMaster = async (id: number) => {
        try {
            const response = await fetch(`/api/v1/timetable-results/${id}/set-master`, { method: 'POST' });
            if (response.ok) {
                notify("Ce planning est désormais la référence officielle pour les TP.", "success");
                loadData();
            } else {
                notify("Erreur lors de la définition du Master.", "error");
            }
        } catch (e) {
            notify("Erreur de connexion serveur.", "error");
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteTimetableResult(deletingId);
            setDeletingId(null);
            notify("Version supprimée avec succès.", "success");
            loadData();
        } catch (e) {
            notify("Erreur lors de la suppression.", "error");
        }
    };

    const [showNotify, setShowNotify] = useState(false);
    const [notifyMsg, setNotifyMsg] = useState("");
    const [notifyType, setNotifyType] = useState<"success" | "error">("success");
    const notify = (msg: string, type: "success" | "error") => {
        setNotifyMsg(msg); setNotifyType(type); setShowNotify(true);
    };

    const filtered = results.filter(r =>
        (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
        r.algo_type.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <Clock className="animate-spin" size={40} color="#1e3a8a" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 700, color: '#1e3a8a' }}>Chargement des archives...</p>
            </div>
        </div>
    );

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
            {/* SUB-HEADER */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', padding: "40px 40px 80px", color: 'white' }}>
                <div style={{ maxWidth: "1400px", margin: "0 auto", display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "2.2rem", fontWeight: 900, letterSpacing: '-0.025em' }}>
                            Rapports & Archives
                        </h1>
                        <p style={{ opacity: 0.8, fontSize: '1rem', marginTop: '8px' }}>
                            Consultez et exportez vos versions finales validées.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Rechercher une version..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    height: '42px', padding: '0 16px 0 40px', borderRadius: '12px',
                                    border: 'none', background: 'rgba(255,255,255,0.1)',
                                    color: 'white', fontSize: '0.9rem', outline: 'none',
                                    backdropFilter: 'blur(10px)', width: '280px'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main style={{ maxWidth: "1400px", margin: "-40px auto 40px", padding: "0 40px" }}>
                {filtered.length === 0 ? (
                    <div style={{ background: 'white', padding: '100px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <FileText size={64} color="#e2e8f0" style={{ margin: '0 auto 20px' }} />
                        <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>Aucune version validée trouvée</h3>
                        <p style={{ color: '#64748b' }}>Utilisez le bouton "Valider" dans la prévisualisation pour archiver un résultat.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                        {filtered.map(res => (
                            <div key={res.id} style={{
                                background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0',
                                overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                                transition: 'transform 0.2s', cursor: 'pointer'
                            }}>
                                {/* Card Header */}
                                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{ padding: '6px 12px', borderRadius: '8px', background: res.is_master_reference ? '#fef3c7' : '#eff6ff', color: res.is_master_reference ? '#92400e' : '#1e40af', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', border: res.is_master_reference ? '1px solid #f59e0b' : 'none' }}>
                                                {res.is_master_reference && <Star size={12} fill="#f59e0b" />}
                                                {res.is_master_reference ? 'MASTER REFERENCE' : `Source: ${res.algo_type.toUpperCase()}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {!res.is_master_reference && (
                                                <button onClick={(e) => { e.stopPropagation(); handleSetMaster(res.id); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                                    <Star size={18} />
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                                                <CheckCircle size={16} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Validé</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeletingId(res.id); }}
                                                style={{
                                                    background: 'transparent', border: 'none', color: '#94a3b8',
                                                    cursor: 'pointer', padding: '4px', transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                                        {res.name || `Session #${res.id}`}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} /> {new Date(res.created_at).toLocaleDateString('fr-FR')}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} /> {new Date(res.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: '24px', background: '#fafafa' }}>
                                    <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            Indice de Satisfaction
                                        </span>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {Math.max(0, 100 - Math.round(res.score_soft / 4))}%
                                        </div>
                                        <p style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                            Score Meta : {Math.round(res.score_soft)} (Pénalités)
                                        </p>
                                        <div style={{ marginTop: '8px', fontSize: '0.7rem', fontWeight: 700, color: res.score_hard === 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {res.score_hard === 0 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                            {res.score_hard === 0 ? "Aucun conflit majeur" : `${res.score_hard} Conflits`}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div style={{ padding: '20px 24px', display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const response = await fetch(`/api/v1/commit-preview?result_id=${res.id}`, { method: 'POST' });
                                                if (response.ok) {
                                                    router.push(`/timetable/interactive?edit_id=${res.id}`);
                                                } else {
                                                    alert("Erreur lors du chargement de la version historique.");
                                                }
                                            } catch (e) {
                                                alert("Erreur de connexion serveur.");
                                            }
                                        }}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                                            background: 'white', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Layout size={16} /> Visualiser
                                    </button>
                                    <button
                                        onClick={() => window.open(`/api/v1/export-excel?id=${res.id}`, "_blank")}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                                            background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '0.85rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                                        }}
                                    >
                                        <Download size={16} /> Excel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
            <AnimatePresence>
                {deletingId && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: 'white', padding: '40px', borderRadius: '32px',
                                width: '100%', maxWidth: '400px', textAlign: 'center',
                                boxShadow: '0 30px 60px -12px rgba(0,0,0,0.3)',
                            }}
                        >
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%', background: '#fee2e2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                            }}>
                                <ShieldAlert size={32} color="#ef4444" />
                            </div>

                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Supprimer ?</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '32px' }}>
                                Cette action est définitive. Toute la version sélectionnée sera effacée de l'historique.
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setDeletingId(null)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDelete}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Supprimer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- NOTIFICATION PREMIUM --- */}
            <AnimatePresence>
                {showNotify && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,31,75,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'white', width: '90%', maxWidth: '380px', borderRadius: '32px', boxShadow: '0 30px 60px rgba(11,31,75,0.15)', padding: '50px 40px', textAlign: 'center' }}>
                            <div style={{ width: 70, height: 70, borderRadius: '50%', background: notifyType === 'success' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                {notifyType === 'success' ? <Check size={35} color="#10b981" /> : <AlertCircle size={35} color="#ef4444" />}
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0b1f4b', margin: '0 0 10px' }}>{notifyType === 'success' ? 'Succès' : 'Attention'}</h3>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 30px', lineHeight: 1.5 }}>{notifyMsg}</p>
                            <button onClick={() => setShowNotify(false)} style={{ width: '100%', padding: '16px', borderRadius: '15px', border: 'none', background: '#0b1f4b', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Continuer</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
