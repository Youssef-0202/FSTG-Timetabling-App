"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard, Database, Cpu, CalendarDays,
    BarChart2, ShieldCheck, Bell
} from "lucide-react";

const links = [
    { href: "/", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/database", label: "Données", Icon: Database },
    { href: "/algorithms", label: "Solveurs", Icon: Cpu },
    { href: "/timetable/preview", label: "Planning", Icon: CalendarDays },
    { href: "/reports", label: "Rapports", Icon: BarChart2 },
];

export default function Navbar() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="header-wrapper">
            <nav className="nav-menu">
                {links.map(({ href, label, Icon }) => {
                    const isActive = mounted && pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-link ${isActive ? "active" : ""}`}
                        >
                            <motion.div
                                initial={false}
                                animate={{ scale: isActive ? 1.05 : 1 }}
                                whileHover={{ scale: 1.05, y: -2 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                <Icon size={18} strokeWidth={2.5} />
                                <span>{label}</span>
                            </motion.div>
                        </Link>
                    )
                })}
            </nav>
        </header>
    );
}
