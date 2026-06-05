import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    let tempFilePath = "";
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ success: false, errors: ["Aucun fichier reçu"] }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const isPreview = searchParams.get('preview') === 'true';
        const filiereId = searchParams.get('filiere_id') || '';

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // CHEMIN ABSOLU pour éviter les erreurs de CWD
        const backendDir = "c:\\Users\\HP\\OneDrive\\Bureau\\pfe\\_Project_PFE\\backend";
        const uploadDir = path.join(backendDir, 'temp_uploads');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Nom de fichier SANS espaces ni caractères spéciaux pour docker cp
        const safeFilename = `maquette_${Date.now()}.xlsx`;
        tempFilePath = path.join(uploadDir, safeFilename);
        fs.writeFileSync(tempFilePath, buffer);

        const filiereArg = filiereId ? `--filiere_id ${filiereId}` : '';
        const containerFilePath = `/app/temp_uploads/${path.basename(tempFilePath)}`;
        
        // ÉTAPE 1: Copier le fichier Excel depuis Windows vers le container Docker
        await execPromise(`docker cp "${tempFilePath}" fstm_timetable_backend:${containerFilePath}`);
        
        // ÉTAPE 2: Lancer le script Python DANS le container avec le fichier copié
        const command = isPreview 
            ? `docker exec fstm_timetable_backend python maquette_parser.py --preview ${filiereArg} "${containerFilePath}"` 
            : `docker exec fstm_timetable_backend python maquette_parser.py ${filiereArg} "${containerFilePath}"`;
        
        const env = { ...process.env };
        
        try {
            const { stdout, stderr } = await execPromise(command, { cwd: backendDir, env });
            
            // Nettoyage: supprimer le fichier sur Windows ET dans le container
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            await execPromise(`docker exec fstm_timetable_backend rm -f "${containerFilePath}"`).catch(() => {});

            const rawOutput = stdout.trim();
            const jsonStartInx = rawOutput.indexOf('{');
            if (jsonStartInx === -1) {
                return NextResponse.json({ success: false, errors: ["Réponse backend invalide (pas de JSON)", rawOutput, stderr] });
            }
            
            const pureJsonString = rawOutput.substring(jsonStartInx);
            const jsonResponse = JSON.parse(pureJsonString);
            return NextResponse.json(jsonResponse);

        } catch (execErr: any) {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            console.error("Python Execution Error:", execErr);
            return NextResponse.json({ 
                success: false, 
                errors: ["Le script Python a échoué", execErr.message, execErr.stderr] 
            });
        }

    } catch (error: any) {
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        console.error("API Route Error:", error);
        return NextResponse.json({ success: false, errors: [error.message] }, { status: 500 });
    }
}
