"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Database, Cpu, CalendarDays,
    BarChart2, ShieldCheck, Bell, LogOut,
} from "lucide-react";

const links = [
    { href: "/", label: "Tableau de Bord", Icon: LayoutDashboard },
    { href: "/database", label: "Base de Données", Icon: Database },
    { href: "/algorithms", label: "Algorithmes", Icon: Cpu },
    { href: "/timetable", label: "Emploi du Temps", Icon: CalendarDays },
    { href: "/reports", label: "Rapports", Icon: BarChart2 },
];

export default function Navbar() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            {/* ── Topbar ── */}
            <div className="topbar">
                <div className="topbar-left">
                    <span className="topbar-title">FSTG (Marrakech) — Système de Gestion des Emplois du Temps</span>
                </div>
            </div>
            {/* ── Navbar ── */}
            <nav className="navbar">
                {links.map(({ href, label, Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`nav-link ${mounted && pathname === href ? "active" : ""}`}
                    >
                        <Icon size={15} /> {label}
                    </Link>
                ))}
            </nav>
        </>
    );
}
