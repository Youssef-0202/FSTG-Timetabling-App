"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ShieldCheck,
  Zap,
  Layout
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20">
              M
            </div>
            <div>
              <div className="font-black text-white leading-none tracking-tighter text-lg uppercase">Timetabling</div>
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">FST Marrakech</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/dashboard">Overview</NavLink>
            <NavLink href="/algorithms">Algorithms</NavLink>
            <NavLink href="/reports">Reports</NavLink>
            <Link href="/dashboard" className="px-6 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5">
              Accéder
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-44 pb-32 overflow-hidden px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[500px] bg-purple-500/5 blur-[100px] rounded-full -z-10 animate-pulse" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-inner"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60">PFE 2026 • MST FSTG</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9]"
          >
            L&apos;IA au service de <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-200 to-purple-400">
              l&apos;excellence académique
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium leading-relaxed"
          >
            Gérez vos ressources pédagogiques avec une précision algorithmique.
            ILS-ALNS, GA-SA et Reinforcement Learning pour des emplois du temps sans conflits.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-500 hover:scale-105 transition-all shadow-2xl shadow-indigo-600/20 group">
              Lancer le Dashboard
              <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={16} />
            </Link>
            <Link href="/database" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all backdrop-blur-xl">
              Explorer les Données
            </Link>
          </motion.div>
        </div>

        {/* ── Visual Preview ── */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="max-w-6xl mx-auto mt-24 relative p-2 rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 group"
        >
          <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 aspect-video md:aspect-[21/9]">
            <img
              src="/pfe_timetable_landing_hero.png"
              alt="Dashboard Preview"
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />

            {/* Floating UI Elements Overlay */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
              <div className="bg-black/40 backdrop-blur-lg border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Zap className="text-indigo-400" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Running Solver</div>
                    <div className="text-sm font-black text-white">ILS-ALNS Optimized</div>
                  </div>
                </div>
              </div>
              <div className="flex -space-x-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] bg-slate-800" />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-[#020617] bg-indigo-600 flex items-center justify-center text-[10px] font-bold">+231</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Analytics Overlay ── */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 border-y border-white/5 py-16">
          <Stat label="Taux d'Occupation" val="94.2%" />
          <Stat label="Contraintes Soft" val="Minimisées" />
          <Stat label="Comfort Prof" val="+18.4%" />
          <Stat label="Solution ALNS" val="Stable" />
        </div>
      </section>

      {/* ── Feature Bento ── */}
      <section className="max-w-7xl mx-auto px-6 pb-44">
        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400 mb-16 text-center">Propulsé par la Recherche</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureBox
            icon={<Cpu className="text-indigo-400" />}
            title="Moteur ILS-ALNS"
            desc="Large Neighborhood Search adaptatif pour une résolution rapide des conflits."
            className="md:col-span-2"
          />
          <FeatureBox
            icon={<ShieldCheck className="text-emerald-400" />}
            title="Validation Soft"
            desc="Vérification en temps réel des contraintes métiers FSTG."
          />
          <FeatureBox
            icon={<Database className="text-purple-400" />}
            title="Dagster ETL"
            desc="Data pipeline robuste pour l'import de données académiques."
          />
          <FeatureBox
            icon={<Layout className="text-amber-400" />}
            title="Visualisation 2.0"
            desc="Interface interactive premium pour ajustements manuels."
            className="md:col-span-2"
          />
        </div>
      </section>
    </div>
  );
}

function NavLink({ href, children }: any) {
  return (
    <Link href={href} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest leading-none">
      {children}
    </Link>
  );
}

function Stat({ label, val }: any) {
  return (
    <div className="text-center md:text-left">
      <div className="text-3xl font-black text-white tracking-tighter mb-1">{val}</div>
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
}

function FeatureBox({ icon, title, desc, className }: any) {
  return (
    <div className={`p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.04] group ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">{desc}</p>
    </div>
  );
}
