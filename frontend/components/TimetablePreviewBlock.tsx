"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSections } from "@/lib/api";
import { Loader2, ArrowRight } from 'lucide-react';

export default function TimetablePreviewBlock({ filiere }: { filiere: any }) {
    const router = useRouter();
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSections().then(sec => {
            const mySections = sec.filter(s =>
                s.groupes?.some((g: any) => g.filiere_id === filiere.id)
            );
            // Sort by semester 
            mySections.sort((a, b) => a.name.localeCompare(b.name));
            setSections(mySections);
            setLoading(false);
        });
    }, [filiere.id]);

    if (loading) {
        return (
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: 'var(--navy)' }} />
            </div>
        );
    }

    if (sections.length === 0) {
        return <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Aucune cohorte configurée.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {sections.map(s => (
                <div
                    key={s.id}
                    onClick={() => router.push(`/maquettes/${filiere.id}/timetable/${s.id}`)}
                    style={{
                        padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                        transition: 'all 0.2s', color: 'var(--navy)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--navy)'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--navy)'; }}
                >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{s.name}</div>
                    <ArrowRight size={18} />
                </div>
            ))}
        </div>
    );
}
