"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Download, Upload, Send, CheckCircle2, AlertCircle,
    Clock, FileSpreadsheet, Search, Filter, Mail, Info, FileText
} from "lucide-react";
import { getFilieres, getTeachers, Filiere, Teacher } from "@/lib/api";

// Simulation de données de tracking (puisque pas encore en DB)
interface MaquetteStats {
    id: number;
    status: "NOT_SENT" | "PENDING" | "RECEIVED";
    lastSent?: string;
    receivedAt?: string;
}

export default function MaquettesPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [showImportModal, setShowImportModal] = useState<number | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = async (filiereName: string, type: "A" | "B") => {
        const key = `${filiereName}-${type}`;
        setDownloading(key);
        try {
            const res = await fetch(`/api/download-maquette?filiere=${filiereName}&type=${type}`);
            if (!res.ok) throw new Error("Fichier non disponible");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `MAQUETTE_${type}_${filiereName}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(`Erreur téléchargement : Générez d'abord les maquettes via le script Python.`);
        } finally {
            setDownloading(null);
        }
    };

    // Données simulées pour l'UI
    const [tracking, setTracking] = useState<Record<number, MaquetteStats>>({
        1: { id: 1, status: "RECEIVED", lastSent: "2026-05-10", receivedAt: "2026-05-14" },
        2: { id: 2, status: "PENDING", lastSent: "2026-05-12" },
    });

    useEffect(() => {
        setMounted(true);
        const load = async () => {
            try {
                console.log("Fetching maquettes data...");
                const [fData, tData] = await Promise.all([getFilieres(), getTeachers()]);
                setFilieres(fData || []);
                setTeachers(tData || []);
                console.log("Data loaded successfully");
            } catch (err: any) {
                console.error("Loading error:", err);
                setError(err.message || "Erreur de connexion au serveur");
            }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const getStatusInfo = (filiereId: number) => {
        const track = tracking[filiereId] || { id: filiereId, status: "NOT_SENT" };
        switch (track.status) {
            case "RECEIVED": return { label: "Reçu", color: "#10b981", icon: CheckCircle2, bg: "#ecfdf5" };
            case "PENDING": return { label: "En attente", color: "#f59e0b", icon: Clock, bg: "#fffbeb" };
            default: return { label: "Non envoyé", color: "#64748b", icon: AlertCircle, bg: "#f8fafc" };
        }
    };

    const stats = {
        total: filieres.length,
        pending: Object.values(tracking).filter(t => t.status === "PENDING").length,
        received: Object.values(tracking).filter(t => t.status === "RECEIVED").length,
    };

    return (
        <div className="page-container" style={{ padding: '30px', marginTop: '35px', minHeight: '100vh' }}>
            {!mounted || loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--navy)', fontWeight: 800 }}>
                    <div className="loader" style={{ marginBottom: '20px' }}>Chargement...</div>
                    {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', background: '#fef2f2', padding: '10px 20px', borderRadius: '10px', border: '1px solid #fee2e2' }}>{error}</div>}
                </div>
            ) : (
                <>
                    {/* Header / KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
                            <div className="stat-header">
                                <FileSpreadsheet className="stat-icon" size={24} style={{ color: 'var(--navy)' }} />
                                <span className="stat-label">Total Filières</span>
                            </div>
                            <div className="stat-value">{stats.total}</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
                            <div className="stat-header">
                                <Clock className="stat-icon" size={24} style={{ color: '#f59e0b' }} />
                                <span className="stat-label">En attente</span>
                            </div>
                            <div className="stat-value">{stats.pending}</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
                            <div className="stat-header">
                                <CheckCircle2 className="stat-icon" size={24} style={{ color: '#10b981' }} />
                                <span className="stat-label">Maquettes Reçues</span>
                            </div>
                            <div className="stat-value">{stats.received}</div>
                        </motion.div>
                    </div>

                    {/* Main Content */}
                    <div className="card" style={{ padding: '35px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(11, 31, 75, 0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', color: 'var(--navy)', fontWeight: 900, letterSpacing: '-0.5px' }}>
                                    Coordination des Filières
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '12px', maxWidth: '600px', lineHeight: '1.6' }}>
                                    Plateforme de collecte des besoins pédagogiques. Gérez l&apos;envoi des maquettes pré-remplies
                                    aux chefs de filière et suivez l&apos;intégration des données en temps réel.
                                </p>
                            </div>
                            <div className="search-wrapper">
                                <Search size={18} className="search-icon" />
                                <input
                                    className="premium-search"
                                    placeholder="Rechercher une filière ou un chef..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>FILIÈRE</th>
                                    <th>CHEF DE FILIÈRE</th>
                                    <th>STATUT</th>
                                    <th>DERNIER ENVOI</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filieres
                                    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
                                    .map((f, idx) => {
                                        const chef = teachers.find(t => t.id === f.chef_id);
                                        const status = getStatusInfo(f.id);
                                        const lastSent = tracking[f.id]?.lastSent;

                                        return (
                                            <motion.tr
                                                key={f.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.03 }}
                                                onClick={() => router.push(`/maquettes/${f.id}`)}
                                                style={{ cursor: 'pointer' }}
                                                className="row-hover"
                                            >
                                                <td>
                                                    <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{f.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{f.type}</div>
                                                </td>
                                                <td>
                                                    {chef ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                                                                {chef.name.substring(0, 1)}
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pr. {chef.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: '#ef4444', fontStyle: 'italic' }}>Aucun chef assigné</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '4px 10px', borderRadius: '20px',
                                                        backgroundColor: status.bg, color: status.color,
                                                        fontSize: '0.75rem', fontWeight: 700
                                                    }}>
                                                        <status.icon size={14} />
                                                        {status.label}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                                    {lastSent ? lastSent : '--'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            style={{ background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.8rem' }}
                                                            onClick={() => router.push(`/maquettes/${f.id}`)}
                                                        >
                                                            Gérer →
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* Simulation Modal d'Importation */}
                    <AnimatePresence>
                        {showImportModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="modal-overlay"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                    className="modal-content"
                                    style={{ maxWidth: '500px' }}
                                >
                                    <div className="modal-header">
                                        <h3>Importer la Maquette : {filieres.find(f => f.id === showImportModal)?.name}</h3>
                                    </div>
                                    <div className="modal-body">
                                        <div style={{
                                            border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px',
                                            textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--navy)'}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                            <Upload size={40} style={{ color: 'var(--navy)', marginBottom: '15px' }} />
                                            <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Glissez-déposez le fichier Excel</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '5px' }}>Supporte .xlsx et .xls (Max 10MB)</div>
                                        </div>

                                        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#eef2ff', borderRadius: '8px', display: 'flex', gap: '10px' }}>
                                            <Info size={18} style={{ color: '#4338ca', flexShrink: 0 }} />
                                            <p style={{ fontSize: '0.75rem', color: '#4338ca' }}>
                                                L&apos;importation analysera automatiquement les modules, professeurs et vœux horaires pour cette filière.
                                                <b> Aucune donnée ne sera modifiée avant votre validation finale.</b>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-outline" onClick={() => setShowImportModal(null)}>Annuler</button>
                                        <button className="btn btn-primary" disabled>Lancer l&apos;Analyse...</button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </>
            )}

            <style jsx>{`
                .stat-card {
                    background: white;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(11, 31, 75, 0.04);
                    border: 1px solid rgba(0,0,0,0.02);
                }
                .stat-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                }
                .stat-label {
                    font-size: 0.85rem;
                    color: var(--muted);
                    font-weight: 600;
                }
                .stat-value {
                    font-size: 2rem;
                    font-weight: 900;
                    color: var(--navy);
                }
                .modern-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 8px;
                }
                .modern-table th {
                    padding: 12px 15px;
                    text-align: left;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .modern-table td {
                    padding: 15px;
                    background: #fff;
                    border-top: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                }
                .modern-table td:first-child { border-left: 1px solid #f1f5f9; border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
                .modern-table td:last-child { border-right: 1px solid #f1f5f9; border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
                
                .search-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 350px;
                }
                .search-icon {
                    position: absolute;
                    left: 16px;
                    color: var(--muted);
                    pointer-events: none;
                }
                .premium-search {
                    width: 100%;
                    padding: 14px 14px 14px 48px;
                    border-radius: 14px;
                    border: 2px solid #f1f5f9;
                    background: #f8fafc;
                    font-size: 0.9rem;
                    color: var(--navy);
                    transition: all 0.3s ease;
                    outline: none;
                }
                .premium-search:focus {
                    border-color: var(--navy);
                    background: white;
                    box-shadow: 0 8px 25px rgba(11, 31, 75, 0.08);
                }

                .btn-sm { padding: 8px; }
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(11, 31, 75, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white; width: 100%;
                    border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .modal-header { padding: 25px; border-bottom: 1px solid #f1f5f9; }
                .modal-header h3 { font-weight: 800; color: var(--navy); }
                .modal-body { padding: 25px; }
                .modal-footer { padding: 20px 25px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 12px; }
            `}</style>
        </div>
    );
}
