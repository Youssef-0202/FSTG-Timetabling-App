"use client";
import React from 'react';
import { Clock, MapPin, Lock } from "lucide-react";
import { motion } from "framer-motion";

const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function SectionTimetableGrid({
    assignments, timeslots, moduleParts, modules, teachers, rooms, sections, tdGroups, selectedId,
    showFiliereAudit = false, availableTpSlots = {}, onSlotClick, onDeleteAssignment
}: any) {
    if (!assignments || assignments.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ color: 'var(--navy)' }}>Aucun cours planifié pour le moment.</h3>
            </div>
        );
    }

    const uniqueHours = Array.from(new Set(timeslots.map((t: any) => t.start_time.substring(0, 5)))).sort() as string[];

    const getCoursesAt = (day: string, startTime: string) => {
        return assignments.filter((a: any) => {
            const ts = timeslots.find((t: any) => t.id === a.slot_id);
            if (!ts) return false;
            if (ts.day.toLowerCase().trim() !== day.toLowerCase().trim()) return false;
            if (!ts.start_time.substring(0, 5).startsWith(startTime.substring(0, 5))) return false;

            // On ne garde QUE ce qui appartient à la section sélectionnée
            const isDirect = String(a.section_id) === String(selectedId);
            const isGroupLocal = a.td_groups?.some((g: any) => {
                const gid = typeof g === 'object' ? g.id : g;
                const fullGroup = tdGroups.find((tg: any) => String(tg.id) === String(gid));
                return fullGroup && String(fullGroup.section_id) === String(selectedId);
            });

            return isDirect || isGroupLocal;
        });
    };

    return (
        <div style={{ width: '100%', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', margin: 0 }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '85px', padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' }}>
                            HEURE
                        </th>
                        {DAYS_ORDER.map(day => (
                            <th key={day} style={{ padding: '16px 8px', fontSize: '0.7rem', fontWeight: 900, color: '#475569', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', textTransform: 'uppercase', textAlign: 'center' }}>
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {uniqueHours.map((time: string) => (
                        <tr key={time}>
                            <td style={{ textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                    <Clock size={14} color="#64748b" /> {time}
                                </div>
                            </td>
                            {DAYS_ORDER.map(day => {
                                const courses = getCoursesAt(day, time);
                                const tsKey = `${day.toLowerCase()}-${time}`;
                                const isAvailableTp = availableTpSlots && availableTpSlots[tsKey];

                                return (
                                    <td
                                        key={day}
                                        style={{
                                            padding: '12px',
                                            borderBottom: '1px solid #cbd5e1',
                                            borderLeft: '1px solid #cbd5e1',
                                            verticalAlign: 'top',
                                            background: isAvailableTp ? '#f5f3ff' : 'transparent',
                                            boxShadow: isAvailableTp ? 'inset 0 0 0 2px #8b5cf6' : 'none',
                                            transition: 'all 0.3s',
                                            cursor: isAvailableTp ? 'pointer' : 'default'
                                        }}
                                        onClick={() => isAvailableTp && onSlotClick && onSlotClick(day, time)}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {isAvailableTp && courses.length === 0 && (
                                                <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', padding: '10px 0' }}>
                                                    CRÉNEAU TP LIBRE
                                                </div>
                                            )}
                                            {courses.map((c: any) => {
                                                const mp = moduleParts.find((p: any) => p.id === c.module_part_id);
                                                const mod = modules.find((m: any) => m.id === mp?.module_id);
                                                const teacher = teachers.find((t: any) => t.id === c.teacher_id);
                                                const room = rooms.find((r: any) => r.id === c.room_id);
                                                const cSection = sections.find((s: any) => s.id === c.section_id);

                                                const isDirect = String(c.section_id) === String(selectedId);
                                                const isGroupLocal = c.td_groups?.some((g: any) => {
                                                    const gid = typeof g === 'object' ? g.id : g;
                                                    const found = tdGroups.find((tg: any) => String(tg.id) === String(gid));
                                                    return found && String(found.section_id) === String(selectedId);
                                                });

                                                const isTDorTP = mp?.type.toLowerCase() !== 'cm';
                                                const groupLabel = isTDorTP && c.td_groups && c.td_groups.length > 0
                                                    ? c.td_groups.map((g: any) => {
                                                        const gid = typeof g === 'object' ? g.id : g;
                                                        const found = tdGroups.find((tg: any) => String(tg.id) === String(gid));
                                                        if (!found) return "";
                                                        const parts = found.name.split(" ");
                                                        const grIndex = parts.findIndex((p: string) => p.toLowerCase() === "gr");
                                                        const baseName = grIndex !== -1 ? parts.slice(grIndex).join(" ") : found.name;
                                                        // Ajout du label TP (ex: Gr 1A)
                                                        return c.tp_subgroup ? `${baseName}${c.tp_subgroup}` : baseName;
                                                    }).filter((n: string) => n !== "").join(' & ')
                                                    : null;

                                                const isGhost = false;
                                                const ghostSectionName = "";

                                                // Logique de Détection de Conflit Intelligente (s'inspire de interactive/page.tsx)
                                                let hasHardConflict = false;
                                                const otherAsgns = assignments.filter((o: any) => o.id !== c.id && o.slot_id === c.slot_id);

                                                // H1: Collision Prof (sauf prof par défaut)
                                                const profColl = otherAsgns.find((o: any) => o.teacher_id === c.teacher_id && c.teacher_id !== 231);
                                                if (profColl) hasHardConflict = true;

                                                // H2: Collision Salle
                                                const roomColl = otherAsgns.find((o: any) => o.room_id === c.room_id && c.room_id !== null);
                                                if (roomColl) hasHardConflict = true;

                                                // H3: Collision Groupe étudiant
                                                if (c.td_groups && c.td_groups.length > 0) {
                                                    const grColl = otherAsgns.find((o: any) => {
                                                        const sameGroup = o.td_groups?.some((g1: any) => c.td_groups.some((g2: any) => (typeof g1 === 'object' ? g1.id : g1) === (typeof g2 === 'object' ? g2.id : g2)));
                                                        if (!sameGroup) return false;
                                                        // Si c'est le même groupe, ce n'est un conflit que si les sous-groupes sont identiques (ex: A et A)
                                                        // Si c'est A et B, ce n'est pas un conflit (alternance)
                                                        if (o.tp_subgroup && c.tp_subgroup && o.tp_subgroup !== c.tp_subgroup) return false;
                                                        return true;
                                                    });
                                                    if (grColl) hasHardConflict = true;
                                                }

                                                const isError = hasHardConflict && !c.tp_subgroup;
                                                const isManualTp = c.tp_subgroup || c.alternance;

                                                let cardBg = isGhost ? '#fff1f2' : '#f8fafc';
                                                let cardBorder = isGhost ? '#ef4444' : (mp?.type.toLowerCase() === 'cm' ? '#3b82f6' : (mp?.type.toLowerCase() === 'tp' ? '#8b5cf6' : '#22c55e'));
                                                let cardText = '#1e3a8a';

                                                if (isError) {
                                                    cardBg = '#fef2f2';
                                                    cardText = '#991b1b';
                                                    cardBorder = '#ef4444';
                                                } else if (!isGhost && !isManualTp) {
                                                    if (mp?.type.toLowerCase() === 'cm') { cardBg = '#eff6ff'; cardText = '#1d4ed8'; }
                                                    else if (mp?.type.toLowerCase() === 'td') { cardBg = '#ecfdf5'; cardText = '#047857'; }
                                                } else if (isManualTp) {
                                                    cardBg = '#f5f3ff'; cardText = '#6d28d9'; cardBorder = '#8b5cf6';
                                                }

                                                return (
                                                    <motion.div
                                                        key={c.id}
                                                        whileHover={{ scale: 1.03, y: -4, boxShadow: '0 12px 20px rgba(0,0,0,0.1)' }}
                                                        style={{
                                                            margin: 0, padding: '12px', borderRadius: '12px',
                                                            borderLeft: `6px solid ${cardBorder}`,
                                                            background: isGhost ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fff1f2 10px, #fff1f2 20px)' : cardBg,
                                                            pointerEvents: isGhost ? 'none' : 'auto',
                                                            position: 'relative',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s'
                                                        }}
                                                    >
                                                        {isManualTp && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onDeleteAssignment) onDeleteAssignment(c.id);
                                                                }}
                                                                style={{
                                                                    position: 'absolute', top: '5px', right: '5px',
                                                                    background: '#fee2e2', color: '#ef4444', border: 'none',
                                                                    borderRadius: '6px', width: '22px', height: '22px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer', fontSize: '0.7rem', zIndex: 10
                                                                }}
                                                                title="Retirer de la grille"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                        {c.is_locked && (
                                                            <div style={{ position: 'absolute', bottom: '8px', right: '8px', opacity: 0.8 }}>
                                                                <Lock size={12} color="#ef4444" strokeWidth={3} />
                                                            </div>
                                                        )}
                                                        {isGhost && (
                                                            <div style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 900, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 20 }}>{ghostSectionName}</div>
                                                        )}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                            <div style={{ fontWeight: 800, color: cardText, fontSize: '0.8rem', lineHeight: 1.2, flex: 1, fontFamily: 'Outfit, sans-serif' }}>
                                                                {mod?.name}
                                                            </div>
                                                            {groupLabel && (
                                                                <div style={{ background: mp?.type.toLowerCase() === 'tp' ? '#7c3aed' : '#1e293b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: 'white', marginLeft: '6px' }}>
                                                                    {groupLabel}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.65rem', fontWeight: 600 }}>
                                                            <div style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                                {teacher ? `Pr. ${teacher.name}` : '—'}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                                                                    <MapPin size={10} color="#94a3b8" /> {room?.name || '—'}
                                                                </div>
                                                                {c.alternance && (
                                                                    <div style={{ fontStyle: 'italic', color: '#8b5cf6', fontSize: '0.6rem' }}>
                                                                        {c.alternance}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
