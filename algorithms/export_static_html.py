import json
import requests
import os

API_BASE = "http://localhost:8000"

def generate_static_report():
    print("--- Génération du Rapport HTML Statique ---")
    
    try:
        # 1. Récupérer les données nécessaires
        print("Chargement des données depuis l'API...")
        sections = requests.get(f"{API_BASE}/sections").json()
        teachers = requests.get(f"{API_BASE}/teachers").json()
        modules = requests.get(f"{API_BASE}/modules").json()
        module_parts = requests.get(f"{API_BASE}/module-parts").json()
        timeslots = requests.get(f"{API_BASE}/timeslots").json()
        
        # Charger le planning généré
        with open("../backend/generated_timetable.json", "r", encoding="utf-8") as f:
            assignments = json.load(f)
            
        print(f"Planning chargé : {len(assignments)} séances trouvées.")

        # Préparer les dictionnaires pour accès rapide
        t_dict = {t['id']: t['name'] for t in teachers}
        m_dict = {m['id']: m['name'] for m in modules}
        mp_dict = {mp['id']: {"module": m_dict.get(mp['module_id'], "Inconnu"), "type": mp['type']} for mp in module_parts}
        
        # Grouper par section
        sections_data = {}
        for s in sections:
            sections_data[s['id']] = {
                "name": s['name'],
                "assignments": []
            }
            
        for a in assignments:
            sid = a.get('section_id')
            if sid in sections_data:
                # Enrichir l'assignation avec les noms
                mp_info = mp_dict.get(a['module_part_id'], {"module": "Module", "type": "CM"})
                a['module_name'] = mp_info['module']
                a['type'] = mp_info['type']
                a['teacher_name'] = t_dict.get(a['teacher_id'], "PROF")
                sections_data[sid]['assignments'].append(a)

        # Générer le HTML
        html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FSTG Marrakech - Rapport Emploi du Temps</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #1e40af;
            --secondary: #3b82f6;
            --bg: #f8fafc;
            --card-bg: rgba(255, 255, 255, 0.9);
            --border: #e2e8f0;
            --text: #1e293b;
            --cm: #3b82f6;
            --td: #10b981;
            --tp: #f59e0b;
        }}
        body {{
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            color: var(--text);
            margin: 0;
            min-height: 100vh;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        header {{
            text-align: center;
            margin-bottom: 40px;
        }}
        h1 {{
            font-size: 2.5rem;
            color: var(--primary);
            margin-bottom: 10px;
        }}
        .badge {{
            background: var(--primary);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .controls {{
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 30px;
            background: var(--card-bg);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            backdrop-filter: blur(8px);
        }}
        .btn {{
            padding: 10px 20px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
        }}
        .btn.active {{
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }}
        .timetable-container {{
            display: none;
            background: var(--card-bg);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.7);
        }}
        .timetable-container.active {{
            display: block;
        }}
        table {{
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px;
        }}
        th {{
            padding: 15px;
            text-align: center;
            font-size: 0.8rem;
            text-transform: uppercase;
            color: #64748b;
        }}
        .time-col {{
            width: 100px;
            font-weight: 700;
            color: var(--primary);
            background: rgba(30, 64, 175, 0.05);
            border-radius: 8px;
            text-align: center;
        }}
        .slot {{
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 12px;
            height: 100px;
            position: relative;
            transition: transform 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .slot:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .module-name {{
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }}
        .details {{
            font-size: 0.75rem;
            color: #64748b;
        }}
        .tag {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 700;
            margin-top: 5px;
            color: white;
        }}
        .tag.CM {{ background: var(--cm); }}
        .tag.TD {{ background: var(--td); }}
        .tag.TP {{ background: var(--tp); }}

        @media (max-width: 768px) {{
            table, thead, tbody, th, td, tr {{ display: block; }}
            .time-col {{ width: 100%; margin-bottom: 5px; padding: 5px 0; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <span class="badge">Session Printemps 2025</span>
            <h1>FSTG Marrakech</h1>
            <p>Système de Planification Intelligente - Rapport Final</p>
        </header>

        <div class="controls" id="section-tabs">
            {''.join([f'<button class="btn" onclick="showSection({sid})">{data["name"]}</button>' for sid, data in sections_data.items() if data['assignments']])}
        </div>

        <div id="timetables">
"""
        days = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]
        hours = ["08:30:00", "10:35:00", "14:30:00", "16:35:00"]

        for sid, data in sections_data.items():
            if not data['assignments']: continue
            
            html_content += f"""
            <div id="section-{sid}" class="timetable-container" data-sid="{sid}">
                <h2 style="text-align:center; color:var(--primary)">Section : {data['name']}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Heure</th>
                            {''.join([f'<th>{day}</th>' for day in days])}
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for hour in hours:
                html_content += f"""
                <tr>
                    <td class="time-col">{hour[:5]}</td>
                """
                for day in days:
                    # Trouver l'assignation pour ce créneau
                    found = next((a for a in data['assignments'] if a['timeslot']['day'] == day and a['timeslot']['start_time'] == hour), None)
                    
                    if found:
                        color_class = found['type']
                        html_content += f"""
                        <td>
                            <div class="slot">
                                <div class="module-name">{found['module_name']}</div>
                                <div class="details">👨‍🏫 {found['teacher_name']}</div>
                                <div class="details">📍 {found['room']['name']}</div>
                                <span class="tag {color_class}">{found['type']}</span>
                            </div>
                        </td>
                        """
                    else:
                        html_content += "<td></td>"
                html_content += "</tr>"
                
            html_content += """
                    </tbody>
                </table>
            </div>
            """

        html_content += """
        </div>
    </div>

    <script>
        function showSection(sid) {
            // Cacher tous les plannings
            document.querySelectorAll('.timetable-container').forEach(el => el.classList.remove('active'));
            // Dé-sélectionner tous les boutons
            document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
            
            // Afficher le bon planning
            const target = document.getElementById('section-' + sid);
            if(target) target.classList.add('active');
            
            // Activer le bon bouton
            event.currentTarget.classList.add('active');
        }

        // Activer la première section par défaut
        window.onload = () => {
             const firstBtn = document.querySelector('.btn');
             if(firstBtn) firstBtn.click();
        };
    </script>
</body>
</html>
"""
        
        # Sauvegarder le fichier
        output_path = "Rapport_Final_PFE_Emploi_du_Temps.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        print(f"\n=======================================================")
        print(f" SUCCÈS : Rapport généré avec succès !")
        print(f" Fichier : {output_path}")
        print(f"=======================================================")
        print(f"INFO : Vous pouvez maintenant envoyer ce fichier par email.")
        print(f"Le prof verra toutes les sections proprement.")

    except Exception as e:
        print(f"ERREUR FATALE : {str(e)}")

if __name__ == "__main__":
    generate_static_report()
