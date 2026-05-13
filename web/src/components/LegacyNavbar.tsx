"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Database,
    Cpu,
    CalendarDays,
    BarChart2,
    Bell,
    User
} from "lucide-react";

const links = [
    { href: "/dashboard", label: "Tableau de Bord", Icon: LayoutDashboard },
    { href: "/database", label: "Base de Données", Icon: Database },
    { href: "/algorithms", label: "Algorithmes", Icon: Cpu },
    { href: "/timetable", label: "Emploi du Temps", Icon: CalendarDays },
    { href: "/reports", label: "Rapports", Icon: BarChart2 },
];

export default function LegacyNavbar() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            {/* ── Topbar ── */}
            <div className="fstg-topbar">
                <div className="flex items-center gap-4">
                    <div className="bg-[var(--fstg-gold)] text-[var(--fstg-navy)] font-black px-3 py-1 rounded text-sm tracking-wider uppercase">
                        FSTG
                    </div>
                    <span className="text-white/90 text-sm font-semibold tracking-tight hidden md:block">
                        Système de Gestion des Emplois du Temps — Marrakech
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <button className="text-white/60 hover:text-[var(--fstg-gold)] transition-colors">
                        <Bell size={18} />
                    </button>
                    <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                        <div className="text-right">
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Administrator</div>
                            <div className="text-xs text-white font-bold">Admin FSTG</div>
                        </div>
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white">
                            <User size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Navbar ── */}
            <nav className="fstg-navbar sticky top-0 z-50">
                {links.map(({ href, label, Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`fstg-nav-link ${mounted && pathname === href ? "active" : ""}`}
                    >
                        <Icon size={14} /> {label}
                    </Link>
                ))}
            </nav>
        </>
    );
}
