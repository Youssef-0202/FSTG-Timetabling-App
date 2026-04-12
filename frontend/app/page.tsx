"use client";
import { useEffect, useState } from "react";
import { getStats, DashboardStats } from "@/lib/api";
import Link from "next/link";
import {
  Users, DoorOpen, GraduationCap, BookOpen,
  Database, Cpu, CalendarDays, CheckCircle2, XCircle,
} from "lucide-react";

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [online, setOnline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getStats()
      .then((s) => {
        console.log("Stats reçues:", s);
        setStats(s);
        setOnline(true);
      })
      .catch((err) => {
        console.error("Erreur de connexion API:", err);
        setOnline(false);
      });
  }, []);

  if (!mounted) return <div className="hero"><h1>Chargement...</h1></div>;

  const cards = [
    { cls: "blue", Icon: Users, val: stats?.total_teachers ?? "—", label: "Enseignants", href: "/database?tab=teachers" },
    { cls: "gold", Icon: DoorOpen, val: stats?.total_rooms ?? "—", label: "Salles/Amphis", href: "/database?tab=rooms" },
    { cls: "teal", Icon: GraduationCap, val: stats?.total_sections ?? "—", label: "Sections (CM)", href: "/database?tab=sections" },
    { cls: "sky", Icon: BookOpen, val: stats?.total_modules ?? "—", label: "Modules", href: "/database?tab=modules" },
  ];

  const quickLinks = [
    { href: "/database", Icon: Database, label: "Gérer la Base de Données", desc: "CRUD Enseignants, Salles, Groupes" },
    { href: "/algorithms", Icon: Cpu, label: "Lancer les Algorithmes", desc: "GA+SA et SBHH" },
    { href: "/timetable", Icon: CalendarDays, label: "Visualiser l'Emploi du Temps", desc: "Vue hebdomadaire interactive" },
  ];

  const statusRows = [
    { label: "Base de Données", val: online ? "✓ PostgreSQL 15" : "✗ Déconnectée" },
    { label: "API Backend", val: online ? "✓ FastAPI v2.0" : "✗ Hors ligne" },
    { label: "Violations Hard", val: stats ? `${stats.hard_violations} violation(s)` : "—" },
    { label: "Affectations", val: stats ? `${stats.total_assignments}` : "—" },
  ];

  return (
    <>
      <div className="hero">
        <h1>Tableau de Bord</h1>
        <p>Vue d&apos;ensemble du système — FST de Marrakech (Gueliz)</p>
      </div>

      <div className="stats-row">
        {cards.map(({ cls, Icon, val, label, href }) => (
          <Link href={href} key={label} style={{ textDecoration: "none" }}>
            <div className={`stat-card ${cls}`}>
              <div className="stat-icon"><Icon size={22} /></div>
              <div>
                <div className="stat-val">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="page-content">
        <div className="api-bar">
          <div className={`api-dot ${online ? "" : "offline"}`}></div>
          <b>FastAPI</b>
          <span className="api-url">http://127.0.0.1:8000</span>
          <span className="api-ping" style={{ color: online ? "var(--teal)" : "var(--danger)" }}>
            {online ? "Connecté" : "Hors ligne"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
          <div className="table-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 18, color: "var(--navy)", fontSize: "0.97rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={18} /> Statut de l'Optimisation
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.83rem" }}>
                  <span style={{ fontWeight: 600 }}>Taux de couverture des profs</span>
                  <span style={{ color: "var(--teal)", fontWeight: 700 }}>92%</span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "92%", height: "100%", background: "var(--teal)" }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.83rem" }}>
                  <span style={{ fontWeight: 600 }}>Saturation des Salles (Amphis)</span>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>65%</span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "65%", height: "100%", background: "var(--gold)" }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.83rem" }}>
                  <span style={{ fontWeight: 600 }}>Complexité du Planning (S4 vs S2)</span>
                  <span style={{ color: "var(--blue)", fontWeight: 700 }}>Élevée</span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "85%", height: "100%", background: "var(--blue)" }}></div>
                </div>
              </div>
            </div>

            <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--border)" }} />

            <h3 style={{ marginBottom: 14, color: "var(--navy)", fontSize: "0.9rem" }}>Accès Rapide</h3>
            <div style={{ display: "flex", gap: 10 }}>
              {quickLinks.map(({ href, Icon, label }) => (
                <Link key={href} href={href} style={{ textDecoration: "none", flex: 1 }}>
                  <div style={{
                    padding: "16px", borderRadius: 10, border: "1.5px solid var(--border)",
                    background: "var(--bg)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center"
                  }}>
                    <Icon size={20} color="var(--navy)" />
                    <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--navy)", textTransform: "uppercase" }}>{label.split(' ')[0]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="table-card" style={{ padding: 24, borderLeft: "4px solid var(--navy)" }}>
            <h3 style={{ marginBottom: 18, color: "var(--navy)", fontSize: "0.97rem" }}>Santé des Données</h3>
            <table style={{ width: "100%" }}>
              <tbody>
                {statusRows.map((row) => (
                  <tr key={row.label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 4px", fontSize: "0.83rem", color: "var(--muted)", fontWeight: 600 }}>
                      {row.label}
                    </td>
                    <td style={{ padding: "12px 4px", fontSize: "0.83rem", fontWeight: 700 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {row.val.startsWith("✓") && <CheckCircle2 size={14} color="var(--teal)" />}
                        {row.val.startsWith("✗") && <XCircle size={14} color="var(--danger)" />}
                        <span>{row.val.replace(/^[✓✗]\s*/, "")}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 24, padding: 16, background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>
                <XCircle size={16} /> Audit des Incompatibilités
              </div>
              <p style={{ fontSize: "0.75rem", color: "#c53030" }}>
                <b>Important :</b> 5 modules de S2 et S4 n&apos;ont pas encore de liste d&apos;incompatibilité définie. Les redoublants pourraient avoir des chevauchements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
