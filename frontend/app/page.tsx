"use client";
import { useEffect, useState } from "react";
import { getStats, DashboardStats } from "@/lib/api";
import Link from "next/link";
import {
  Users, DoorOpen, GraduationCap, BookOpen,
  Database, Cpu, CalendarDays, CheckCircle2, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [online, setOnline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getStats()
      .then((s) => {
        setStats(s);
        setOnline(true);
      })
      .catch((err) => {
        setOnline(false);
      });
  }, []);

  if (!mounted) return <div className="hero"><h1>Chargement...</h1></div>;

  const cards = [
    { cls: "blue", Icon: Users, val: stats?.total_teachers ?? "—", label: "CORPS ENSEIGNANT", href: "/database?tab=teachers" },
    { cls: "gold", Icon: DoorOpen, val: stats?.total_rooms ?? "—", label: "RESSOURCES SALLES", href: "/database?tab=rooms" },
    { cls: "teal", Icon: GraduationCap, val: stats?.total_sections ?? "—", label: "SECTIONS & COHORTES", href: "/database?tab=sections" },
    { cls: "sky", Icon: BookOpen, val: stats?.total_modules ?? "—", label: "UNITÉS D'ENSEIGNEMENT", href: "/database?tab=modules" },
  ];

  const quickLinks = [
    { href: "/database", Icon: Database, label: "GÉRER", desc: "Base de données" },
    { href: "/algorithms", Icon: Cpu, label: "LANCER", desc: "Moteurs IA" },
    { href: "/timetable/preview", Icon: CalendarDays, label: "VISUALISER", desc: "Planning" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="sub-header" style={{ padding: "130px 20px 90px" }}>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Système de Planification Stratégique
        </motion.h1>
        <p>
          Intelligence Artificielle & Optimisation
          <span style={{ margin: "0 12px", opacity: 0.2 }}>|</span>
          <span style={{ color: online ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: '0.75rem' }}>
            ● {online ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
          </span>
        </p>
      </div>

      <div className="stats-row">
        {cards.map(({ cls, Icon, val, label, href }, i) => (
          <Link href={href} key={label} style={{ textDecoration: "none" }}>
            <motion.div
              className={`stat-card ${cls}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i + 0.4 }}
              whileHover={{ y: -8, boxShadow: "0 12px 35px rgba(11,31,75,0.18)" }}
            >
              <div className="stat-icon"><Icon size={24} strokeWidth={2.5} /></div>
              <div>
                <div className="stat-val">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, marginTop: 20 }}>
          {/* Accès Rapide */}
          <div className="table-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ color: "var(--navy)", fontSize: "1.1rem", fontWeight: 800 }}>Accès Rapide</h3>
              <div className="badge badge-cm" style={{ fontSize: '0.65rem' }}>ACTIONS PRIORITAIRES</div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {quickLinks.map(({ href, Icon, label, desc }) => (
                <Link key={href} href={href} style={{ textDecoration: "none", flex: 1 }}>
                  <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: "var(--white)" }}
                    style={{
                      padding: "24px 16px", borderRadius: 16, border: "2px solid var(--border)",
                      background: "var(--bg)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
                      transition: "all 0.3s"
                    }}
                  >
                    <div style={{ padding: 12, background: 'rgba(11,31,75,0.05)', borderRadius: '12px' }}>
                      <Icon size={22} color="var(--navy)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "var(--navy)" }}>{label}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 500, marginTop: 2 }}>{desc}</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Santé des données */}
          <div className="table-card" style={{ padding: 32, borderTop: "6px solid var(--navy)" }}>
            <h3 style={{ marginBottom: 24, color: "var(--navy)", fontSize: "1.1rem", fontWeight: 800 }}>État du Système</h3>
            <table style={{ width: "100%" }}>
              <tbody>
                {[
                  { label: "Stabilité du Moteur", val: online ? "Stable & Connecté" : "Moteur Hors Ligne", color: online ? "var(--teal)" : "var(--danger)" },
                  { label: "Intégrité Globale", val: stats && stats.hard_violations === 0 ? "Solution Valide" : `${stats?.hard_violations} Conflits`, color: (stats?.hard_violations ?? 0) === 0 ? "var(--teal)" : "var(--danger)" },
                  { label: "Couverture Planning", val: stats ? `${stats.total_assignments} Séances Placées` : "—" },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 0", fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                      {row.label}
                    </td>
                    <td style={{ padding: "16px 0", fontSize: "0.85rem", fontWeight: 800, textAlign: 'right', color: row.color }}>
                      {row.val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
