import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ success: false, errors: ["Aucun fichier reçu"] }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const backendDir = path.join(process.cwd(), '..', 'backend');
        const uploadDir = path.join(backendDir, 'temp_uploads');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const tempFilePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
        fs.writeFileSync(tempFilePath, buffer);

        const command = `python maquette_parser.py "${tempFilePath}"`;
        
        // On passe explicitly localhost en env var car Node s'exécute sur le Host
        const env = { 
            ...process.env, 
            DATABASE_URL: "postgresql://user_pfe:password_pfe@127.0.0.1:5432/fstm_timetable" 
        };
        
        const { stdout, stderr } = await execPromise(command, { cwd: backendDir, env });
        
        // Nettoyage asynchrone sécurisé du tmp file
        try { fs.unlinkSync(tempFilePath); } catch (e) {}

        let jsonResponse: any = {};
        try {
            const rawOutput = stdout.trim();
            // On cherche le JSON pour éviter les print parasites des libs python occasionnelles
            const jsonStartInx = rawOutput.indexOf('{');
            const pureJsonString = jsonStartInx !== -1 ? rawOutput.substring(jsonStartInx) : rawOutput;
            jsonResponse = JSON.parse(pureJsonString);
        } catch (e) {
            console.error("Failed to parse python output", stdout, stderr);
            return NextResponse.json({ success: false, errors: ["Erreur lors du parsing JSON du backend", stderr] });
        }
        
        return NextResponse.json(jsonResponse);

    } catch (error: any) {
        return NextResponse.json({ success: false, errors: [error.message] }, { status: 500 });
    }
}
