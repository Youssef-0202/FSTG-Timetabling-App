import re
import os

# Chemins absolus
LATEX_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'rapports', 'pfe', 'rapport_final_pfe.tex'))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'knowledge'))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'pfe_report_clean.txt')

def clean_latex(latex_text):
    """
    Nettoie le texte LaTeX pour obtenir du texte brut totalement épuré.
    """
    # 1. Supprimer les commentaires LaTeX %
    text = re.sub(r'%.*?\n', '\n', latex_text)
    
    # 2. Supprimer les environnements TikZ, Gantt et tableaux complexes EN ENTIER (avec leur contenu)
    text = re.sub(r'\\begin\{tikzpicture\}.*?\\end\{tikzpicture\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\\begin\{pgfgantt\}.*?\\end\{pgfgantt\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\\begin\{tabularx?\}.*?\\end\{tabularx?\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\\begin\{tabularx?\*\}.*?\\end\{tabularx?\*\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\\begin\{algorithm2e\}.*?\\end\{algorithm2e\}', '', text, flags=re.DOTALL)

    # 3. Remplacer les titres par des en-têtes textuels propres
    text = re.sub(r'\\chapter\{([^}]+)\}', r'\n\n=== CHAPITRE : \1 ===\n', text)
    text = re.sub(r'\\section\{([^}]+)\}', r'\n--- Section : \1 ---\n', text)
    text = re.sub(r'\\subsection\{([^}]+)\}', r'\n* Sous-section : \1 *\n', text)

    # 4. Supprimer les balises de début/fin d'environnements restants (MAIS en gardant leur contenu !)
    # ex: \begin{tcolorbox}[options]{autre} -> vide
    text = re.sub(r'\\begin\{[a-zA-Z*]+\}(?:\[[^\]]*\])?(?:\{[^}]*\})*', '', text)
    text = re.sub(r'\\end\{[a-zA-Z*]+\}', '', text)

    # 5. Remplacer les commandes avec arguments par leur texte interne
    # ex: \textbf{bonjour} -> bonjour, \textcolor[rgb]{0,0,0}{salut} -> salut
    text = re.sub(r'\\[a-zA-Z*]+(?:\[[^\]]*\])?\{([^}]+)\}', r'\1', text)

    # 6. Nettoyer les sauts de ligne LaTeX (ex: \\[0.4cm] ou \\)
    text = re.sub(r'\\+\[[^\]]*\]', '\n', text)
    text = re.sub(r'\\\\', '\n', text)

    # 7. Remplacer les délimiteurs mathématiques complexes
    text = text.replace('\\[', '\n').replace('\\]', '\n')
    text = text.replace('\\(', ' ').replace('\\)', ' ')
    text = text.replace('$', '')
    text = text.replace('~', ' ')
    text = text.replace('&', ' ')  # Enlever les sélecteurs de colonnes de tableaux
    
    # 8. Supprimer les commandes solitaires restantes (ex: \clearpage, \noindent...)
    text = re.sub(r'\\[a-zA-Z*]+', ' ', text)

    # 9. Supprimer les accolades isolées
    text = text.replace('{', '').replace('}', '')

    # 10. Nettoyer les lignes ligne par ligne pour enlever le bruit résiduel
    cleaned_lines = []
    # Pattern pour détecter les lignes de bruit résiduel : mesures de marges, variables, 
    # fragments de commandes, etc. Ex: "0.8cm", "-0.4cm", "f", "t", "alph", "roman"
    garbage_pattern = re.compile(
        r'^-?[\d.]+(?:cm|pt|em|mm|ex)?$'  # Ex: 0.3cm, -0.4cm, 2pt
        r'|^[a-z]$'                         # Lettres isolées : f, t, e
        r'|^(?:alph|roman|arabic|page\d+|flush(?:left|right)|center|spacing\d|minipage|flushleft|flushright|enumerate|itemize)$'
        r'|^\d+$'                           # Nombres seuls
        r'|^\*$'                            # Astérisques isolés
    )
    for line in text.split('\n'):
        cleaned_line = line.strip()
        if not cleaned_line:
            continue
        # Ignorer les lignes correspondant au pattern de bruit
        if garbage_pattern.match(cleaned_line):
            continue
        # Ignorer les lignes très courtes (< 8 caractères) qui n'ont pas de sens sémantique
        if len(cleaned_line) < 8:
            continue
        lower_line = cleaned_line.lower()
        # Ignorer les lignes contenant des noms de fichiers images/PDF ou options de style
        if any(ext in lower_line for ext in ['.png', '.jpg', '.pdf', 'width=', 'height=', 'boxrule=']):
            continue
        cleaned_lines.append(cleaned_line)

            
    text = '\n'.join(cleaned_lines)
    
    # Remplacer les paquets de sauts de ligne par un ou deux sauts maximum
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text


def parse_report():
    print(f"Lecture du rapport LaTeX : {LATEX_PATH}...")
    if not os.path.exists(LATEX_PATH):
        print(f"Erreur : Le fichier LaTeX n'existe pas au chemin : {LATEX_PATH}")
        return

    with open(LATEX_PATH, 'r', encoding='utf-8') as f:
        latex_content = f.read()

    # --- OPTIMISATION : Supprimer tout le préambule avant le corps du document ---
    if '\\begin{document}' in latex_content:
        print("Boilerplate / préambule LaTeX détecté et retiré avec succès.")
        latex_content = latex_content.split('\\begin{document}', 1)[1]

    print("Nettoyage du code LaTeX (Tikz, macros, mise en en page)...")
    clean_text = clean_latex(latex_content)


    # Assurer la création du dossier output
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Écriture du texte nettoyé vers : {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(clean_text)
        
    print(f"🎉 Nettoyage et parsing terminés ! Taille du fichier brut : {len(clean_text)//1024} Ko.")

if __name__ == "__main__":
    parse_report()
