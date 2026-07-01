import os
from openai import OpenAI
from dotenv import load_dotenv
import sql_agent        # Importe notre agent SQL 
import rag_retriever    # Importe notre retriever ChromaDB 

# Charger les clés d'environnement depuis le fichier .env (deux niveaux au-dessus du script)
_ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(dotenv_path=_ENV_PATH)

# Initialisation du client LLM 
api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

# Nom du modèle actif
MODEL_NAME = os.getenv("LLM_MODEL", "meta/llama-3.3-70b-instruct")

# --- PROMPT DU ROUTEUR D'AGENT  ---
ROUTER_SYSTEM_PROMPT = """
Tu es le routeur intelligent de DashTime. Ta tâche est de classer la question de l'utilisateur pour l'envoyer vers le bon outil.
Tu as deux outils possibles :
1. 'SQL' : Si la question demande des données brutes, temporelles, de planification, d'enseignants, de charge de travail, ou de salles de la base de données (ex: "Combien d'heures fait Ouaarab ?", "Quel cours a lieu le lundi ?", "Où enseigne Mme Nadia ?").
2. 'RAG' : Si la question demande des explications de concepts, des règles pedagogiques, des détails sur l'architecture, ou des guides d'utilisation de l'interface (ex: "C'est quoi la contrainte H11 ?", "Comment marche le drag and drop ?", "Quelles sont les phases du projet ?").

Consigne stricte : Réponds UNIQUEMENT par l'un de ces deux mots : "SQL" ou "RAG". Aucun autre mot, aucun commentaire.
"""

# --- PROMPT SQL ---
SYSTEM_PROMPT_SQL = """
Tu es le moteur de génération SQL pour DashTime. Ta seule tâche est de convertir les requêtes naturelles en SQL valides.
Tu as accès à deux vues :
1. 'v_planning_details' (planning complet) : assignment_id, module_name, module_code, course_type, teacher_name, room_name, room_capacity, day_of_week (LUNDI, MARDI, etc.), start_time, end_time, section_name, is_locked_by_admin.
2. 'v_teacher_workload' (charge de travail) : teacher_name, total_sessions, total_weekly_hours.

CONSIGNES DE SÉCURITÉ ET DE SYNTAXE :
- Génère uniquement du SQL SELECT. N'écris aucun commentaire, aucun markdown ```sql. Écris tout sur une ligne.
- IMPORTANT : Pour toutes les recherches sur des textes (noms d'enseignants, noms de modules, codes), n'utilise JAMAIS le signe '='. Utilise SYSTÉMATIQUEMENT 'ILIKE' avec les jokers '%' de chaque côté du terme recherché pour tolérer les erreurs d'orthographe (ex: teacher_name ILIKE '%ouaarab%').
"""

# --- PROMPT DETALLÉ POUR LE RAG ---
SYSTEM_PROMPT_RAG = """
Tu es DashTime Assistant, l'assistant documentaire intelligent de la FST de Marrakech.
Tu vas recevoir une question de l'administrateur et un ensemble d'extraits documentaires de confiance issus du rapport de PFE et du guide utilisateur.

Utilise uniquement ces extraits pour formuler une réponse claire, polie et structurée en français.
Si les extraits ne contiennent pas la réponse, explique que tu ne disposes pas de ces détails dans la documentation.
"""


def route_question(user_question: str) -> str:
    """
    Détermine si l'on doit utiliser la base SQL ou la base vectorielle RAG.
    Étape 0 : Pré-filtre déterministe (sans appel LLM) pour les questions SQL évidentes.
    Étape 1 : Si ambigü, on demande au LLM routeur.
    """
    # -- Pré-filtre déterministe : mots-clés appartenant clairement au domaine SQL (BDD planning) --
    q_lower = user_question.lower()
    SQL_KEYWORDS = [
        # Personnes
        "prof", "professeur", "enseignant", "teacher", "mr", "mme", "dr",
        # Lieux
        "salle", "amphi", "labo", "laboratoire", "room",
        # Temps / Planning
        "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
        "heure", "heures", "créneau", "planning", "emploi du temps",
        "cours", "séance", "session", "td", "tp", "cm",
        # Actions Data
        "combien", "liste", "donne", "affiche", "montre", "quel", "quels",
        "quand", "où", "charge", "workload", "verrouill",
    ]
    if any(kw in q_lower for kw in SQL_KEYWORDS):
        return "SQL"

    # -- Si non détecté, on délègue au LLM routeur --
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Classifie cette question : {user_question}"}
            ],
            temperature=0.0,
            timeout=15.0
        )
        decision = response.choices[0].message.content.strip().upper()
        if "SQL" in decision:
            return "SQL"
        return "RAG"
    except Exception:
        # Fallback de sécurité en cas de coupure API
        return "SQL"


def generate_sql_from_question(user_question: str) -> str:
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_SQL},
            {"role": "user", "content": f"Trouve la requête SQL SELECT pour : {user_question}"}
        ],
        temperature=0.0,
        timeout=15.0
    )
    sql = response.choices[0].message.content.strip()
    return sql


def explain_results_in_natural_language(user_question: str, sql_executed: str, db_results: list) -> str:
    system_prompt_final = """
    Tu es DashTime Assistant, l'agent conversationnel pour l'administration de la FST de Marrakech.
    Explique les résultats SQL JSON reçus de manière claire, concise et professionnelle en français.
    """
    user_content = f"Question : {user_question}\nSQL jouée : {sql_executed}\nJSON Brut : {db_results}"

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt_final},
            {"role": "user", "content": user_content}
        ],
        temperature=0.7,
        timeout=15.0
    )
    return response.choices[0].message.content.strip()


def answer_using_rag(user_question: str) -> str:
    """
    Interroge ChromaDB pour extraire le contexte sémantique, puis laisse le LLM répondre.
    """
    print("🔍 Recherche dans la base de connaissances documentaire (ChromaDB)...")
    # Récupérer les 3 chunks les plus similaires
    relevant_chunks = rag_retriever.retrieve_relevant_chunks(user_question, n_results=3)
    
    # Formater le contexte
    formatted_context = rag_retriever.build_context_for_llm(relevant_chunks)
    
    # DEBUG : afficher les chunks récupérés
    print(f"   [DEBUG] {len(relevant_chunks)} chunks recuperes :")
    for c in relevant_chunks:
        print(f"   -> Source: {c['source']} | Score: {c['score']} | Debut: {c['text'][:80]}...")
    
    print("Redaction de la reponse documentaire...")
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_RAG},
            {
                "role": "user", 
                "content": f"Contexte documentaires :\n{formatted_context}\n\nQuestion : {user_question}"
            }
        ],
        temperature=0.4,
        timeout=15.0
    )
    return response.choices[0].message.content.strip()


# --- BOUCLE DE CHAT PRINCIPALE (Sprint 3 Orchestration) ---
def start_interactive_chatbot():
    print("=" * 60)
    print("✨ BIENVENUE SUR L'ASSISTANT BASE DE DONNÉES DASHTIME (SQL ONLY) ✨")
    print(f"Modèle actif : {MODEL_NAME}")
    print("=" * 60)
    print("Tapez 'quitter' ou 'exit' pour arrêter.\n")

    while True:
        try:
            question = input("\n👤 Vous > ")
            if question.lower() in ["quitter", "exit"]:
                print("Fermeture du chatbot. À bientôt !")
                break
            
            if not question.strip():
                continue

            # Étape 1 : Routage de la question par le LLM (Sprint 3)
            print(" Analyse et aiguillage de la demande...")
            route = route_question(question)
            print(f" Direction identifiée : [{route}]")

            # Étape 2 : Exécution de la branche choisie
            if route == "SQL":
                # Pipeline SQL
                print(" Génération de la requête base de données...")
                generated_sql = generate_sql_from_question(question)
                print(f" SQL généré : {generated_sql}")
                
                agent_response = sql_agent.agent_ask_database(generated_sql)

                if agent_response["status"] == "success":
                    db_data = agent_response["data"]
                    print("Traduction des données...")
                    final_answer = explain_results_in_natural_language(question, generated_sql, db_data)
                    print(f"\n Agent > {final_answer}")
                else:
                    print(f"\n Échec de la requête : {agent_response['last_error']}")
            
            else:
                # Pipeline RAG désactivé
                print(f"\n Agent > Désolé, je suis temporairement configuré en mode SQL-Only. Je ne peux répondre qu'aux questions concernant les données de planification opérationnelles de la FSTG Marrakech (emplois du temps, enseignants, salles, charges de cours). Pour les questions conceptuelles sur le rapport ou les guides, veuillez réactiver le RAG.")

        except Exception as e:
            print(f"\n Une erreur est survenue : {e}")
            print("Veuillez vérifier votre serveur Postgres et votre configuration .env.")


if __name__ == "__main__":
    start_interactive_chatbot()
