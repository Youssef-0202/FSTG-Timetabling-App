import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filiere = searchParams.get("filiere");
    const type = searchParams.get("type") || "A"; // A ou B

    if (!filiere) {
        return NextResponse.json({ error: "Filiere name is required" }, { status: 400 });
    }

    // Chemin vers les fichiers générés par le script Python
    const backendDir = path.join(process.cwd(), "..", "backend", "output_maquettes");
    const prefix = type === "B" ? "MAQUETTE_B_PROFS_" : "MAQUETTE_A_AFFECTATION_";
    const filename = `${prefix}${filiere}.xlsx`;
    const filepath = path.join(backendDir, filename);

    // Lancer systématiquement la génération pour avoir les toutes dernières données
    await new Promise<void>((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "..", "backend", "maquette_generator.py");
        exec(`python "${scriptPath}" --filiere "${filiere}"`, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    // Vérifier si le fichier existe après génération
    if (!fs.existsSync(filepath)) {
        return NextResponse.json({ error: `Maquette non trouvée pour ${filiere}` }, { status: 404 });
    }

    // Lire et retourner le fichier
    const fileBuffer = fs.readFileSync(filepath);
    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
