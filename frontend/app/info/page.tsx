"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Info, BookOpen, Layers, Terminal, ShieldCheck,
    Zap, HelpCircle, FileText, Settings, Share2,
    CheckCircle2, AlertTriangle, Lightbulb, Workflow
} from "lucide-react";

type InfoTab = 'workflow' | 'hard-constraints' | 'soft-constraints' | 'ai-engine' | 'guide';

export default function InfoPage() {
    const [activeTab, setActiveTab] = useState<InfoTab>('workflow');

    const TABS = [
        { id: 'workflow', label: 'Cycle de Vie', Icon: Workflow },
        { id: 'hard-constraints', label: 'Règles d\'Or (Hard)', Icon: ShieldCheck },
        { id: 'soft-constraints', label: 'Optimisation (Soft)', Icon: Zap },
        { id: 'ai-engine', label: 'Moteur IA', Icon: Terminal },
        { id: 'guide', label: 'Guide Pratique', Icon: HelpCircle },
    ];

    return (
        <div className="info-page-layout">
            <style jsx>{`
                .info-page-layout {
                    display: flex;
                    height: 100vh;
                    margin-top: 0;
                    background: var(--bg);
                }
                .sidebar-info {
                    width: 280px;
                    background: var(--white);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    padding: 85px 16px 24px;
                    gap: 12px;
                    z-index: 50;
                }
                .sidebar-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--navy);
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding-left: 10px;
                }
                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 14px;
                    border: none;
                    background: transparent;
                    color: var(--muted);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: left;
                    font-size: 0.9rem;
                }
                .tab-btn:hover {
                    background: rgba(11, 31, 75, 0.05);
                    color: var(--navy);
                }
                .tab-btn.active {
                    background: var(--navy);
                    color: var(--white);
                    box-shadow: 0 8px 16px rgba(11, 31, 75, 0.2);
                }
                .main-info-view {
                    flex: 1;
                    padding: 85px 60px 60px;
                    overflow-y: auto;
                    background: radial-gradient(at 100% 0%, rgba(232, 160, 32, 0.02) 0px, transparent 50%);
                }
                .content-card {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .section-header {
                    margin-bottom: 40px;
                }
                .section-header h1 {
                    font-size: 2.8rem;
                    font-weight: 950;
                    color: var(--navy);
                    letter-spacing: -1.5px;
                    margin-bottom: 12px;
                }
                .badge-info {
                    display: inline-block;
                    background: rgba(232, 160, 32, 0.1);
                    color: var(--gold);
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .info-block {
                    background: var(--white);
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border);
                    line-height: 1.6;
                    color: var(--text);
                }
                .info-block h2 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--navy);
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .step-list {
                    list-style: none;
                    padding: 0;
                }
                .step-item {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .step-num {
                    width: 36px;
                    height: 36px;
                    background: var(--navy);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    flex-shrink: 0;
                    font-size: 0.9rem;
                }
                .constraint-list {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .constraint-card {
                    padding: 20px;
                    border-radius: 16px;
                    background: #f8fafc;
                    border-left: 4px solid var(--navy);
                }
                .constraint-hard { border-left-color: var(--danger); }
                .constraint-soft { border-left-color: var(--teal); }

                .algorithm-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-top: 20px;
                }
                .algo-card {
                    padding: 24px;
                    border-radius: 20px;
                    background: #f1f5f9;
                    position: relative;
                    overflow: hidden;
                }
                .algo-card.rl { background: #eff6ff; border: 1px solid #3b82f633; }
            `}</style>

            <aside className="sidebar-info">
                <div className="sidebar-title">
                    <Info size={24} color="#e8a020" />
                    <span>Guide Système</span>
                </div>
                <div style={{ flex: 1 }}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id as InfoTab)}
                        >
                            <tab.Icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </aside>

            <main className="main-info-view">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        className="content-card"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'workflow' && (
                            <section>
                                <header className="section-header">
                                    <div className="badge-info">Architecture & Données</div>
                                    <h1>Le Cycle de Vie du Planning</h1>
                                </header>
                                <div className="info-block">
                                    <h2><Share2 size={22} color="#e8a020" /> De la Maquette au Master</h2>
                                    <p style={{ marginBottom: '30px', color: 'var(--muted)' }}>
                                        La plateforme Timetabling FSTG suit un flux de travail rigoureux pour garantir l'intégrité des données académiques.
                                    </p>
                                    <div className="step-list">
                                        <div className="step-item">
                                            <div className="step-num">1</div>
                                            <div>
                                                <strong>Alimentation Intelligente (Maquettes A/B)</strong>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>L'administration pré-remplit des fichiers Excel (Maquettes) qui sont enrichis par les chefs de filière avant d'être importés avec une analyse d'impact visuelle.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <div className="step-num">2</div>
                                            <div>
                                                <strong>Sanctuarisation des Ressources</strong>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>L'administrateur verrouille les créneaux dédiés aux TP pour protéger les ressources physiques (laboratoires) de toute intrusion des cours magistraux.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <div className="step-num">3</div>
                                            <div>
                                                <strong>Optimisation Algorithmique (IA)</strong>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>L'intelligence artificielle (RL-ALNS) génère plusieurs versions optimales en respectant les contraintes de disponibilité des enseignants.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <div className="step-num">4</div>
                                            <div>
                                                <strong>Affinage Manuel (Éditeur Interactif)</strong>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>L'humain reprend le contrôle pour ajuster les détails via le Drag & Drop, guidé par le feedback de conflit en temps réel.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <div className="step-num">5</div>
                                            <div>
                                                <strong>Validation Master Reference</strong>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>La meilleure version est "élue" Master. Elle devient l'autorité officielle pour l'export Excel et la coordination des filières.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'hard-constraints' && (
                            <section>
                                <header className="section-header">
                                    <div className="badge-info">Règles Inviolables</div>
                                    <h1>Contraintes Dures (Hard)</h1>
                                </header>
                                <div className="info-block">
                                    <h2 style={{ color: 'var(--danger)' }}><ShieldCheck size={22} /> Audit d'Intégrité Critique</h2>
                                    <p style={{ marginBottom: '30px', color: 'var(--muted)' }}>
                                        Ces règles ont une pénalité infinie. L'algorithme ne validera jamais une solution contenant une seule de ces violations.
                                    </p>
                                    <div className="constraint-list">
                                        <div className="constraint-card constraint-hard">
                                            <strong>Collision Enseignant</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Empêche un professeur d'être à deux endroits à la fois.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Collision Salle</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Interdit d'affecter deux modules différents à la même salle au même moment.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Capacité de Salle</strong>
                                            <p style={{ fontSize: '0.85rem' }}>L'effectif du groupe ne doit jamais dépasser la capacité physique de la salle.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Disponibilité Enseignant (H8)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Respect strict des créneaux bloqués par les professeurs.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Sanctuarisation TP (H9)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Interdiction de placer un CM/TD sur les créneaux labs.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Volume Hebdomadaire (H6)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Respect strict du volume d'heures par module (maquette).</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>CM le Samedi Interdits (H11)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Journée réservée aux TD/TP si nécessaire.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Verrouillage Manuel (H10)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Les choix administratifs priment sur l'IA.</p>
                                        </div>
                                        <div className="constraint-card constraint-hard">
                                            <strong>Conflit de Structure (H3)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Gestion des filières liées et redoublants.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'soft-constraints' && (
                            <section>
                                <header className="section-header">
                                    <div className="badge-info">Pédagogie & Confort</div>
                                    <h1>Objectifs d'Optimisation (Soft)</h1>
                                </header>
                                <div className="info-block">
                                    <h2 style={{ color: 'var(--teal)' }}><Zap size={22} /> Calcul de l'Indice de Satisfaction</h2>
                                    <p style={{ marginBottom: '30px', color: 'var(--muted)' }}>
                                        L'IA cherche à minimiser les pénalités sur ces critères pour offrir un emploi du temps "confortable" aux étudiants et professeurs.
                                    </p>
                                    <div className="constraint-list">
                                        <div className="constraint-card constraint-soft">
                                            <strong>Compacité (Anti-Trous)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Minimiser les fenêtres vides entre deux cours pour les étudiants.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Pause Déjeuner</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Garantir un créneau libre entre 12h30 et 14h30.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Rythme & Fatigue (S9)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Éviter les fins de journées (16h35) chargées.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Pédagogie CM (S3)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Cours magistraux le matin pour une meilleure concentration.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Après-midis Libres (S8)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Favoriser 2 demi-journées libres pour le travail personnel.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Compactage Prof (S5)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Réduire les temps morts pour les enseignants.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Stabilité Salles (S6)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Éviter les changements de salle pour un même module.</p>
                                        </div>
                                        <div className="constraint-card constraint-soft">
                                            <strong>Journées Hachées (S7)</strong>
                                            <p style={{ fontSize: '0.85rem' }}>Éviter de faire déplacer un étudiant pour un seul cours.</p>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(26, 158, 122, 0.05)', borderRadius: '16px', fontSize: '0.9rem', border: '1px dashed var(--teal)' }}>
                                        <strong>Le saviez-vous ?</strong> L'Indice de satisfaction affiché sur la page Stats est calculé selon une moyenne pondérée : Trous (35%), Pause (35%), Fatigue (20%) et Pédagogie (10%).
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'ai-engine' && (
                            <section>
                                <header className="section-header">
                                    <div className="badge-info">Intelligence Artificielle</div>
                                    <h1>Le Cœur Algorithmique</h1>
                                </header>
                                <div className="info-block">
                                    <h2><Lightbulb size={22} color="#e8a020" /> Nos 3 Moteurs de Résolution</h2>
                                    <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
                                        Le système intègre des approches hybrides pour résoudre le problème combinatoire NP-complet du timetabling.
                                    </p>
                                    <div className="algorithm-grid">
                                        <div className="algo-card">
                                            <strong>GA-SA (Hybride)</strong>
                                            <p style={{ fontSize: '0.85rem', marginTop: '10px' }}>Algorithmes Génétiques couplés au Recuit Simulé pour une exploration globale robuste.</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>ALNS Adaptatif</strong>
                                            <p style={{ fontSize: '0.85rem', marginTop: '10px' }}>Recherche Locale à Voisinages Variables qui "apprend" quelle heuristique est la plus efficace.</p>
                                        </div>
                                        <div className="algo-card rl" style={{ gridColumn: 'span 2' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>RL-ALNS Fusionné (Notre Innovation)</strong>
                                                <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 900 }}>RECOMMANDÉ</span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', marginTop: '10px' }}>Un agent de Reinforcement Learning (Apprentissage par Renforcement) orchestre l'ALNS pour prendre des décisions stratégiques en temps réel.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'guide' && (
                            <section>
                                <header className="section-header">
                                    <div className="badge-info">Aide Administrateur</div>
                                    <h1>Guide d'utilisation Rapide</h1>
                                </header>
                                <div className="info-block">
                                    <h2><CheckCircle2 size={22} color="#1a9e7a" /> Gestes Essentiels</h2>
                                    <div className="step-list" style={{ marginTop: '20px' }}>
                                        <div className="step-item">
                                            <Terminal size={18} style={{ marginTop: '3px' }} />
                                            <div>
                                                <strong>Le "Point de Conflit"</strong>
                                                <p style={{ fontSize: '0.85rem' }}>Dans l'éditeur, survolez un créneau : s'il devient ROUGE, le système vous interdit le dépôt pour cause de collision dure.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <Layers size={18} style={{ marginTop: '3px' }} />
                                            <div>
                                                <strong>Le Panier (Bucket)</strong>
                                                <p style={{ fontSize: '0.85rem' }}>Les séances non encore placées apparaissent dans le panier en bas de l'éditeur. Glissez-les dans la grille pour les activer.</p>
                                            </div>
                                        </div>
                                        <div className="step-item">
                                            <Settings size={18} style={{ marginTop: '3px' }} />
                                            <div>
                                                <strong>Sauvegarde Manuelle</strong>
                                                <p style={{ fontSize: '0.85rem' }}>Chaque modification manuelle doit être enregistrée via le bouton "Enregistrer la Session" pour créer une nouvelle version dans vos archives.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
