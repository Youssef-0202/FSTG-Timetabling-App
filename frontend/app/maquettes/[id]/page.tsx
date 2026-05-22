"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft, FileText, Send, Upload, CheckCircle2,
    BarChart3, Users, BookOpen, Calendar, Download, Eye, Mail, Plus, FileSpreadsheet, Loader2
} from "lucide-react";
import { getFilieres, getTeachers, getModules, Filiere, Teacher, Module } from "@/lib/api";
import TimetablePreviewBlock from "@/components/TimetablePreviewBlock";

export default function FiliereDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [filiere, setFiliere] = useState<Filiere | null>(null);
    const [chef, setChef] = useState<Teacher | null>(null);
    const [moduleCount, setModuleCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

    // Import states
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const fileInputRefValue = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        const load = async () => {
            try {
                const [fs, ts, ms] = await Promise.all([getFilieres(), getTeachers(), getModules()]);
                const f = fs.find(item => item.id === Number(id));
                if (f) {
                    setFiliere(f);
                    setChef(ts.find(t => t.id === f.chef_id) || null);
                    // Pour simuler précisément les 14 modules MSD sans DB connect, 
                    // on retourne 14 pour MSD, sinon on estime. Le vrai chiffre est dans le Excel.
                    setModuleCount(f.name === "MSD" ? 14 : ms.filter(m => m.dept_id === f.dept_id).length);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    const handleDownload = async (type: "A" | "B") => {
        if (!filiere) return;
        const key = type;
        setDownloading(key);
        setDownloadSuccess(null);
        try {
            const res = await fetch(`/api/download-maquette?filiere=${filiere.name}&type=${type}`);
            if (!res.ok) throw new Error("Fichier non disponible");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const prefix = type === "A" ? "MAQUETTE_A_AFFECTATION" : "MAQUETTE_B_PROFS";
            a.download = `${prefix}_${filiere.name}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            setDownloadSuccess(key);
            setTimeout(() => setDownloadSuccess(null), 3000);
        } catch (err) {
            alert(`❌ Fichier non trouvé. Lancez d'abord le script Python : python maquette_generator.py`);
        } finally {
            setDownloading(null);
        }
    };

    const handleFileChange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/import-maquette', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setImportResult(data);
        } catch (err: any) {
            setImportResult({ success: false, errors: [err.message] });
        } finally {
            setImporting(false);
            if (fileInputRefValue?.current) fileInputRefValue.current.value = "";
        }
    };

    if (!mounted) return null;
    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
            <div style={{ color: 'var(--navy)', fontWeight: 800 }}>Chargement...</div>
        </div>
    );
    if (!filiere) return <div style={{ padding: 50 }}>Filière introuvable</div>;

    const COLORS = ["#1a6fba", "#1a9e7a", "#e8a020", "#3dbde4", "#8b5cf6", "#0b1f4b", "#d94040"];
    const avatar = (name: string) => {
        const initials = name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        const color = COLORS[name.length % COLORS.length];
        return { initials, color };
    };

    // Les vraies maquettes disponibles pour cette filière
    const maquettes = [
        {
            type: "A" as const,
            name: `MAQUETTE_A_AFFECTATION_${filiere.name}.xlsx`,
            label: "Maquette A — Affectations",
            description: "Modules & Enseignants à affecter",
            color: "#1a6fba",
            icon: FileSpreadsheet,
        },
        {
            type: "B" as const,
            name: `MAQUETTE_B_PROFS_${filiere.name}.xlsx`,
            label: "Maquette B — Répertoire Profs",
            description: "Contacts, Email, GSM & Vœux",
            color: "#1a9e7a",
            icon: Users,
        },
    ];

    return (
        <div className="page-container" style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <button
                    onClick={() => router.back()}
                    className="btn btn-outline"
                    style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', width: 42, height: 42, padding: 0, background: 'white' }}
                >
                    <ArrowLeft size={18} color="var(--navy)" />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--navy)', letterSpacing: '-0.8px', margin: 0 }}>
                            {filiere.name}
                        </h1>
                        <span style={{ backgroundColor: 'var(--navy)', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                            {filiere.type}
                        </span>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500, marginTop: '2px' }}>
                        Dossier de coordination pédagogique
                    </p>
                </div>
                <button className="btn btn-outline" style={{ background: 'white' }}>
                    <BarChart3 size={16} style={{ marginRight: '8px' }} /> Statistiques
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '30px' }}>
                {/* Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* KPI Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {[
                            { label: "Modules", val: moduleCount !== null ? moduleCount : "...", icon: BookOpen, col: "#1a6fba" },
                            { label: "Effectif", val: "~250", icon: Users, col: "#1a9e7a" },
                            { label: "Année", val: "26/27", icon: Calendar, col: "#e8a020" }
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                style={{ background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                    <div style={{ padding: '8px', background: `${s.col}15`, color: s.col, borderRadius: '10px' }}>
                                        <s.icon size={18} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{s.label}</span>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--navy)' }}>{s.val}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Aperçu Emploi du Temps par Section (Redirection) */}
                    <section style={{ background: 'white', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calendar size={20} /> Emplois du Temps (Cohortes)
                            </h3>
                        </div>
                        <div style={{ padding: '20px 25px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <TimetablePreviewBlock filiere={filiere} />
                        </div>
                    </section>

                    {/* Maquettes disponibles */}
                    <section style={{ background: 'white', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                        <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} /> Maquettes disponibles
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                                {maquettes.length} fichiers générés
                            </span>
                        </div>
                        <div style={{ padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {maquettes.map((m) => (
                                <motion.div key={m.type}
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '18px 20px', borderRadius: '16px', border: '1.5px solid #f1f5f9',
                                        background: downloadSuccess === m.type ? '#f0fdf4' : '#fafafa',
                                        transition: 'all 0.3s'
                                    }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ padding: '12px', background: `${m.color}12`, color: m.color, borderRadius: '14px' }}>
                                            <m.icon size={22} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>{m.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '3px' }}>{m.description}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>{m.name}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        {downloadSuccess === m.type && (
                                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <CheckCircle2 size={14} /> Téléchargé
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDownload(m.type)}
                                            disabled={downloading === m.type}
                                            className="btn btn-primary"
                                            style={{
                                                background: m.color, padding: '10px 18px', fontSize: '0.82rem',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                opacity: downloading === m.type ? 0.7 : 1,
                                                transition: 'all 0.2s'
                                            }}>
                                            {downloading === m.type
                                                ? <><span style={{ fontSize: '0.7rem' }}>⏳</span> Chargement...</>
                                                : <><Download size={15} /> Télécharger</>
                                            }
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {/* Chef Card */}
                    <div style={{ borderRadius: '24px', background: 'linear-gradient(135deg, #0b1f4b 0%, #1a3a7a 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>
                            Chef de Filière Assigné
                        </p>
                        {chef ? (
                            <>
                                <div style={{
                                    width: 70, height: 70, borderRadius: '20px', margin: '0 auto 15px',
                                    backgroundColor: avatar(chef.name).color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem', fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                }}>
                                    {avatar(chef.name).initials}
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Pr. {chef.name}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '5px' }}>{chef.email}</p>
                            </>
                        ) : (
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '20px 0' }}>Aucun chef configuré</div>
                        )}
                        <hr style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
                        <button className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <Mail size={14} style={{ marginRight: '8px' }} /> Envoyer un message
                        </button>
                    </div>

                    {/* Import Zone */}
                    <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', padding: '25px' }}>
                        <h4 style={{ margin: '0 0 5px', fontSize: '0.9rem', fontWeight: 900, color: 'var(--navy)' }}>Réception du retour</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '15px' }}>
                            Importez la maquette remplie par le chef
                        </p>

                        <input
                            type="file"
                            accept=".xlsx"
                            style={{ display: 'none' }}
                            ref={fileInputRefValue}
                            onChange={handleFileChange}
                        />

                        {importing ? (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <div style={{ marginBottom: '10px' }}><Loader2 size={30} style={{ animation: "spin 1s linear infinite", margin: '0 auto', color: 'var(--navy)' }} /></div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)' }}>Analyse en cours...</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Comparaison intelligente avec la DB</div>
                            </div>
                        ) : importResult ? (
                            <div style={{ padding: '15px', borderRadius: '16px', background: importResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${importResult.success ? '#bbf7d0' : '#fecaca'}` }}>
                                <h5 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: importResult.success ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {importResult.success ? <CheckCircle2 size={16} /> : "❌"}
                                    {importResult.success ? 'Import réussi' : 'Erreur d\'import'}
                                </h5>

                                {importResult.success && (
                                    <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.75rem', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <li><b>{importResult.rows_processed}</b> lignes analysées</li>
                                        <li><b>{importResult.rows_ignored}</b> sans changements</li>
                                        <li><b>{importResult.assignments_created}</b> affectations créées</li>
                                        <li><b>{importResult.assignments_deleted}</b> affectations supprimées</li>
                                        {importResult.teachers_created?.length > 0 && (
                                            <li><b>{importResult.teachers_created.length}</b> nouveaux profs : {importResult.teachers_created.join(', ')}</li>
                                        )}
                                    </ul>
                                )}

                                {!importResult.success && importResult.errors && (
                                    <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: '10px' }}>
                                        {importResult.errors.map((e: string, i: number) => <div key={i}>• {e}</div>)}
                                    </div>
                                )}

                                <button className="btn btn-outline" style={{ width: '100%', marginTop: '15px', fontSize: '0.75rem' }} onClick={() => setImportResult(null)}>
                                    Nouvel import
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '30px',
                                    textAlign: 'center', background: '#fcfcfc', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                    onClick={() => fileInputRefValue?.current?.click()}
                                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--navy)')}
                                    onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                                >
                                    <Upload size={28} style={{ color: 'var(--muted)', marginBottom: '10px' }} />
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--navy)' }}>Cliquer pour uploader</div>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '4px' }}>Format .xlsx uniquement</p>
                                </div>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
