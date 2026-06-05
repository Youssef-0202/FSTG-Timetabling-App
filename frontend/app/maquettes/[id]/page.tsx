"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import {
    ArrowLeft, FileText, Send, Upload, CheckCircle2,
    BarChart3, Users, BookOpen, Calendar, Download, Eye, Mail, Plus, FileSpreadsheet, Loader2, ArrowRight, X, AlertCircle
} from "lucide-react";
import { getFilieres, getTeachers, getModules, Filiere, Teacher, Module } from "@/lib/api";
import TimetablePreviewBlock from "@/components/TimetablePreviewBlock";

export default function FiliereDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [filiere, setFiliere] = useState<Filiere | null>(null);
    const [chef, setChef] = useState<Teacher | null>(null);
    const [stats, setStats] = useState<{ nb_modules: number; effectif_estime: number | null; nb_sections: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

    // Import states
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoMessage, setInfoMessage] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRefValue = useRef<HTMLInputElement>(null);

    const showInfo = (msg: string) => { setInfoMessage(msg); setShowInfoModal(true); };

    useEffect(() => {
        setMounted(true);
        const load = async () => {
            try {
                const [fs, ts] = await Promise.all([getFilieres(), getTeachers()]);
                const f = fs.find(item => item.id === Number(id));
                if (f) {
                    setFiliere(f);
                    setChef(ts.find(t => t.id === f.chef_id) || null);
                    // Récupérer les stats réelles via la route Next.js (évite CORS)
                    const statsRes = await fetch(`/api/filiere-stats/${id}`);
                    if (statsRes.ok) setStats(await statsRes.json());
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    const handleDownload = async (type: "A" | "B") => {
        if (!filiere) return;
        setDownloading(type);
        try {
            const res = await fetch(`/api/download-maquette?filiere=${filiere.name}&type=${type}`);
            if (!res.ok) throw new Error("Fichier non disponible");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${type === "A" ? "MAQUETTE_A" : "MAQUETTE_B"}_${filiere.name}.xlsx`;
            a.click();
            setDownloadSuccess(type);
            setTimeout(() => setDownloadSuccess(null), 3000);
        } catch (err) {
            alert(`❌ Erreur : Fichier non trouvé.`);
        } finally { setDownloading(null); }
    };

    const handleFileChange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            // On passe filiere_id pour valider que l'Excel appartient bien à CETTE filière
            const res = await fetch(`/api/import-maquette?preview=true&filiere_id=${id}`, { method: 'POST', body: formData });
            const data = await res.json();
            setImportResult(data);
            if (data.success && data.details?.length > 0) setShowModal(true);
            else if (data.success) showInfo("✅ Données à jour ! Aucun changement à appliquer. La base de données est déjà synchronisée avec ce fichier Excel.");
            else showInfo("❌ Erreur : " + (data.errors?.join(", ") || "Erreur inconnue"));
        } catch (err: any) { showInfo("❌ Erreur d'analyse du fichier."); }
        finally { setImporting(false); if (fileInputRefValue.current) fileInputRefValue.current.value = ""; }
    };

    const confirmImport = async () => {
        if (!pendingFile) return;
        setImporting(true);
        setShowModal(false);
        const formData = new FormData();
        formData.append('file', pendingFile);
        try {
            const res = await fetch(`/api/import-maquette?filiere_id=${id}`, { method: 'POST', body: formData });
            const data = await res.json();
            setImportResult(data);
            setPendingFile(null);
            if (data.success) {
                const added = data.assignments_created || 0;
                const deleted = data.assignments_deleted || 0;
                showInfo(`✅ Synchronisation réussie ! ${added} ajout(s) et ${deleted} suppression(s) appliqués.`);
            }
        } catch (err) { console.error(err); }
        finally { setImporting(false); }
    };

    if (!mounted) return null;
    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-navy">Chargement...</div>;
    if (!filiere) return <div className="p-10 font-bold">Filière introuvable</div>;

    const COLORS = ["#1a6fba", "#1a9e7a", "#e8a020", "#3dbde4", "#8b5cf6", "#0b1f4b"];
    const avatar = (name: string) => ({ initials: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), color: COLORS[name.length % COLORS.length] });

    return (
        <div className="page-container" style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <button onClick={() => router.back()} className="btn btn-outline" style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', width: 42, height: 42, padding: 0, background: 'white' }}><ArrowLeft size={18} /></button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0b1f4b', margin: 0, letterSpacing: '-0.5px' }}>{filiere.name}</h1>
                        <span style={{ backgroundColor: '#0b1f4b', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px', borderRadius: '6px' }}>{filiere.type}</span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>Dossier de coordination pédagogique</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {[
                            { label: "Modules", val: stats !== null ? stats.nb_modules : "...", icon: BookOpen, col: "#1a6fba" },
                            { label: "Effectif", val: stats !== null ? (stats.effectif_estime ? `~${stats.effectif_estime}` : "N/A") : "...", icon: Users, col: "#1a9e7a" },
                            { label: "Sections", val: stats !== null ? stats.nb_sections : "...", icon: Calendar, col: "#e8a020" }
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}><div style={{ padding: '8px', background: `${s.col}15`, color: s.col, borderRadius: '10px' }}><s.icon size={18} /></div><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</span></div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#0b1f4b' }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    <section style={{ background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0b1f4b', display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={20} /> Emplois du Temps (Cohortes)</h3></div>
                        <div style={{ padding: '20px 25px', display: 'flex', gap: '15px' }}><TimetablePreviewBlock filiere={filiere} /></div>
                    </section>

                    <section style={{ background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0b1f4b', display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={20} /> Maquettes disponibles</h3></div>
                        <div style={{ padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[{ type: "A", label: "Maquette A — Affectations", col: "#1a6fba", icon: FileSpreadsheet }, { type: "B", label: "Maquette B — Répertoire Profs", col: "#1a9e7a", icon: Users }].map(m => (
                                <div key={m.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderRadius: '16px', border: '1.5px solid #f1f5f9', background: '#fafafa' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><div style={{ padding: '12px', background: `${m.col}12`, color: m.col, borderRadius: '14px' }}><m.icon size={22} /></div><div><div style={{ fontWeight: 800, color: '#0b1f4b' }}>{m.label}</div></div></div>
                                    <button onClick={() => handleDownload(m.type as "A" | "B")} className="btn btn-primary" style={{ background: m.col, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.8rem' }}>
                                        {downloadSuccess === m.type ? <CheckCircle2 size={15} /> : <Download size={15} />} {downloadSuccess === m.type ? "Téléchargé" : "Télécharger"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ borderRadius: '24px', background: 'linear-gradient(135deg, #0b1f4b 0%, #1a3a7a 100%)', color: 'white', padding: '30px', textAlign: 'center', boxShadow: '0 10px 25px rgba(11, 31, 75, 0.1)' }}>
                        {chef && <><div style={{ width: 70, height: 70, borderRadius: '20px', margin: '0 auto 15px', backgroundColor: avatar(chef.name).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, boxShadow: '0 8px 15px rgba(0,0,0,0.2)' }}>{avatar(chef.name).initials}</div><h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>Pr. {chef.name}</h4><p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{chef.email}</p></>}
                        <button className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: '20px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '0.8rem' }}><Mail size={14} style={{ marginRight: '8px' }} /> Envoyer un message</button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                        <h4 style={{ margin: '0 0 5px', fontSize: '0.9rem', fontWeight: 900, color: '#0b1f4b' }}>Réception du retour</h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '15px' }}>Importez la maquette remplie par le chef</p>
                        {!importing && !importResult ? (
                            <div onClick={() => fileInputRefValue.current?.click()} style={{ border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '35px 20px', textAlign: 'center', cursor: 'pointer', background: '#fcfcfc', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = "#0b1f4b"} onMouseOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                                <Upload size={28} style={{ color: '#94a3b8', marginBottom: '10px' }} /><div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0b1f4b' }}>Cliquer pour uploader</div>
                                <input type="file" ref={fileInputRefValue} style={{ display: 'none' }} onChange={handleFileChange} accept=".xlsx" />
                            </div>
                        ) : importing ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={30} className="animate-spin mx-auto mb-2" style={{ color: '#0b1f4b' }} /><div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0b1f4b' }}>Analyse intelligente...</div></div>
                        ) : (
                            <div style={{ padding: '15px', borderRadius: '16px', background: importResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${importResult.success ? '#bbf7d0' : '#fecaca'}` }}>
                                <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: importResult.success ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}>{importResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {importResult.success ? 'Import réussi' : 'Erreur'}</h5>
                                <button className="btn btn-outline" style={{ width: '100%', marginTop: '10px', fontSize: '0.75rem', fontWeight: 700 }} onClick={() => setImportResult(null)}>Nouveau fichier</button>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* --- MODAL STYLE PREMIUM "CONFIRM IMPORT" --- */}
            <AnimatePresence>
                {showModal && importResult && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 31, 75, 0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            style={{ background: 'white', width: '100%', maxWidth: '750px', borderRadius: '32px', boxShadow: '0 40px 100px rgba(11, 31, 75, 0.12)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

                            <div style={{ padding: '40px 40px 0', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', background: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', boxShadow: '0 15px 30px rgba(16, 185, 129, 0.12)' }}>
                                    <Upload size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.7rem', fontWeight: 950, color: '#0b1f4b', margin: '0 0 8px' }}>Analyser la Maquette</h2>
                                <p style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500, margin: '0 auto 30px' }}>
                                    Nous avons détecté <b style={{ color: '#10b981' }}>{importResult.details.length} changements</b>. Voulez-vous les appliquer ?
                                </p>
                            </div>

                            <div style={{ padding: '0 40px 30px', flex: 1, overflowY: 'auto' }}>
                                <div style={{ background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                        <thead style={{ background: 'rgba(11, 31, 75, 0.02)' }}>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>Module / Section</th>
                                                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>Ancien</th>
                                                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>Nouveau</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importResult.details.map((d: any, i: number) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '15px 20px' }}>
                                                        <div style={{ fontWeight: 800, color: '#0b1f4b' }}>{d.module}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{d.section}</div>
                                                    </td>
                                                    <td style={{ padding: '15px 20px' }}>
                                                        <span style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.6 }}>{d.old || "VIDE"}</span>
                                                    </td>
                                                    <td style={{ padding: '15px 20px' }}>
                                                        <div style={{ color: '#10b981', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <ArrowRight size={14} /> {d.new}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ padding: '0 40px 40px', display: 'flex', gap: '16px' }}>
                                <button onClick={() => { setShowModal(false); setPendingFile(null); }}
                                    style={{ flex: 1, padding: '18px', borderRadius: '20px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#64748b', transition: 'all 0.2s', cursor: 'pointer' }}>
                                    Annuler
                                </button>
                                <button onClick={confirmImport}
                                    style={{ flex: 2, padding: '18px', borderRadius: '20px', border: 'none', background: '#0b1f4b', color: 'white', fontWeight: 900, fontSize: '1rem', boxShadow: '0 10px 25px rgba(11, 31, 75, 0.2)', cursor: 'pointer' }}>
                                    Confirmer l&apos;import
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- MODAL INFO PREMIUM (Succès / Erreur) --- */}
            <AnimatePresence>
                {showInfoModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,31,75,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25 }}
                            style={{ background: 'white', width: '90%', maxWidth: '420px', borderRadius: '32px', boxShadow: '0 30px 60px rgba(11,31,75,0.15)', padding: '50px 40px', textAlign: 'center' }}>

                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: infoMessage.startsWith('✅') ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', boxShadow: infoMessage.startsWith('✅') ? '0 12px 25px rgba(16,185,129,0.1)' : '0 12px 25px rgba(239,68,68,0.1)' }}>
                                {infoMessage.startsWith('✅') ? <CheckCircle2 size={40} color="#10b981" /> : <AlertCircle size={40} color="#ef4444" />}
                            </div>

                            <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0b1f4b', margin: '0 0 12px' }}>
                                {infoMessage.startsWith('✅') ? 'Opération réussie' : 'Attention'}
                            </h3>

                            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#64748b', lineHeight: 1.6, margin: '0 0 35px' }}>
                                {infoMessage.replace('✅ ', '').replace('❌ ', '')}
                            </p>

                            <button onClick={() => setShowInfoModal(false)}
                                style={{ width: '100%', padding: '18px', borderRadius: '18px', border: 'none', background: infoMessage.startsWith('✅') ? '#10b981' : '#0b1f4b', color: 'white', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                                Continuer
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style jsx>{` .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
        </div>
    );
}
