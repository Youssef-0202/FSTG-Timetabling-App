import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const dbId = searchParams.get('id');
        
        let scriptPath, outputPath;
        
        if (dbId) {
            scriptPath = "c:\\Users\\HP\\OneDrive\\Bureau\\pfe\\_Project_PFE\\backend\\export_excel_db.py";
            outputPath = `c:\\Users\\HP\\OneDrive\\Bureau\\pfe\\_Project_PFE\\backend\\export_result_${dbId}.xlsx`;
            await execAsync(`python "${scriptPath}" ${dbId}`);
        } else {
            const safeMode = mode || 'ga_sa';
            scriptPath = "c:\\Users\\HP\\OneDrive\\Bureau\\pfe\\_Project_PFE\\algorithms\\ga_sa_hybrid\\v2\\export_excel.py";
            const fileSuffix = ["alns", "rl"].includes(safeMode) ? `_${safeMode.toUpperCase()}` : "";
            outputPath = `c:\\Users\\HP\\OneDrive\\Bureau\\pfe\\_Project_PFE\\algorithms\\ga_sa_hybrid\\v2\\logs\\FSTG_EXCEL_PREMIUM${fileSuffix}.xlsx`;
            await execAsync(`python "${scriptPath}" ${safeMode}`);
        }
        
        // Read the generated Excel file
        if (!fs.existsSync(outputPath)) {
            return NextResponse.json({ error: `File not generated` }, { status: 500 });
        }
        
        const fileBuffer = fs.readFileSync(outputPath);
        
        // Return file as response
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename=Emploi_du_temps_FSTG_${dbId ? 'Archive' : 'Actuel'}.xlsx`,
            },
        });
    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
