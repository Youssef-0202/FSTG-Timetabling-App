import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const algo = body.algo;

        if (!['ga_sa', 'alns', 'rl'].includes(algo)) {
            return NextResponse.json({ error: "Algorithme inconnu" }, { status: 400 });
        }

        // process.cwd() = frontend
        // on remonte à la racine _Project_PFE
        const baseDir = path.resolve(process.cwd(), '..');
        
        let scriptPath = '';
        if (algo === 'ga_sa') {
            scriptPath = path.join(baseDir, 'algorithms', 'ga_sa_hybrid', 'v2', 'main_solver.py');
        } else if (algo === 'alns') {
            scriptPath = path.join(baseDir, 'algorithms', 'ILS-ALNS', 'main_alns.py');
        } else if (algo === 'rl') {
            scriptPath = path.join(baseDir, 'algorithms', 'rl_controller', 'main_rl.py');
        }
        
        // Sous Windows, 'start cmd.exe /k python "chemin"' est la bonne syntaxe.
        // On évite les doubles guillemets superflus qui cassent le chemin
        const cmd = `start "Agent IA" cmd.exe /k python "${scriptPath}"`;
        
        console.log("Lancement de:", cmd);
        
        exec(cmd, (error) => {
            if (error) {
                console.error(`Exec error: ${error}`);
            }
        });

        return NextResponse.json({ message: "Algorithme lancé dans un nouveau terminal interactif sous Windows." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
