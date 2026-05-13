import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const baseDir = path.resolve(process.cwd(), '..');
        
        const paths = {
            ga_sa: path.join(baseDir, 'algorithms', 'ga_sa_hybrid', 'v2', 'logs', 'last_run_report.txt'),
            alns: path.join(baseDir, 'algorithms', 'ILS-ALNS', 'logs', 'last_run_report.txt'),
            rl: path.join(baseDir, 'algorithms', 'rl_controller', 'logs', 'last_run_report.txt')
        };
        
        const reports: Record<string, string> = {
            ga_sa: "Rapport introuvable.",
            alns: "Rapport introuvable.",
            rl: "Rapport introuvable."
        };

        for (const [algo, file] of Object.entries(paths)) {
            if (fs.existsSync(file)) {
                reports[algo] = fs.readFileSync(file, 'utf-8');
            }
        }
        
        return NextResponse.json(reports);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
