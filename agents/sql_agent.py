import psycopg2
import re

import os

# Connexion avec l'utilisateur sécurisé EN LECTURE SEULE (Support Docker et Local)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
AGENT_USER = os.getenv("DB_USER", "agent_pfe")
AGENT_PASSWORD = os.getenv("DB_PASSWORD", "agent_password")
DB_DBNAME = os.getenv("DB_NAME", "fstm_timetable")

# Mots-clés SQL interdits pour bloquer les écritures ou destructions (Concept 3)
FORBIDDEN_KEYWORDS = [
    "drop", "delete", "insert", "update", "truncate", 
    "alter", "grant", "revoke", "create"
]

def sanitize_and_validate_sql(sql_query: str) -> str:
    """
     Valide la requête SQL générée par l'IA et lui ajoute des limites.
    """
    # 1. Nettoyage de la chaîne
    cleaned_query = sql_query.strip().lower()

    # 2. Vérification des mots-clés interdits (Guardrails)
    for word in FORBIDDEN_KEYWORDS:
        # Regex pour matcher le mot complet (ex: pour éviter d'interdire "drop" dans "droplet")
        if re.search(rf"\b{word}\b", cleaned_query):
            raise PermissionError(f"Sécurité : Mot-clé interdit '{word}' détecté dans la requête SQL.")

    # 3. Forcer la clause LIMIT si elle n'est pas présente (Optimisation)
    if "limit" not in cleaned_query:
        # Si la requête se finit par un point-virgule, on l'enlève pour ajouter le LIMIT
        sql_query = sql_query.strip().rstrip(';')
        sql_query = f"{sql_query} LIMIT 100;"
        print("Sécurité : Limite de 100 lignes ajoutée d'office à la requête.")

    return sql_query

def execute_sql_query(sql_query: str) -> list:
    """
    Exécute la requête avec l'utilisateur read-only et applique un timeout.
    """
    # Valider le SQL d'abord
    safe_query = sanitize_and_validate_sql(sql_query)

    conn = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=AGENT_USER,
            password=AGENT_PASSWORD,
            dbname=DB_DBNAME,
            connect_timeout=3
        )
        cursor = conn.cursor()

        # Configurer un timeout d'exécution de 2000 ms (2 secondes) pour éviter les requêtes bloquantes
        cursor.execute("SET statement_timeout = 2000;")

        print(f"Exécution sous Postgres (agent_pfe)... \nSQL : {safe_query}")
        cursor.execute(safe_query)
        
        # Récupération des résultats
        results = cursor.fetchall()
        
        # Récupérer les noms des colonnes
        column_names = [desc[0] for desc in cursor.description]
        
        formatted_results = [dict(zip(column_names, row)) for row in results]
        return formatted_results

    except psycopg2.Error as e:
        # On remonte l'erreur SQL pour alimenter la boucle de self-correction
        raise e
    finally:
        if conn:
            cursor.close()
            conn.close()

# SQL Agent avec Boucle de Self-Correction (Concept 2 - ReAct Loop)
def agent_ask_database(initial_sql_query: str, max_retries: int = 3) -> dict:
    """
    Boucle d'auto-correction (Concept 2) : 
    Tente de lancer le SQL. Si une erreur de nom de colonne ou de syntaxe survient,
    elle simule le fait de renvoyer l'erreur à l'IA pour qu'elle corrige son code.
    """
    current_query = initial_sql_query
    attempts = 0

    while attempts < max_retries:
        attempts += 1
        try:
            print(f"\n--- Tentative {attempts} ---")
            results = execute_sql_query(current_query)
            return {
                "status": "success",
                "attempts": attempts,
                "data": results
            }
        except (psycopg2.Error, PermissionError) as e:
            error_message = str(e)
            print(f"❌ Erreur détectée : {error_message}")
            
            if attempts >= max_retries:
                return {
                    "status": "error",
                    "attempts": attempts,
                    "message": "Nombre maximal d'essais atteint sans succès.",
                    "last_error": error_message
                }

            print("🔄 Auto-correction active : Simulation du réajustement de la requête par l'IA...")
            # Simulation de l'auto-correction
            # Exemple : Si l'IA s'est trompée de colonne 'times' au lieu de 'start_time'
            if "column" in error_message.lower() and "times" in current_query.lower():
                current_query = current_query.replace("times", "start_time")
                print(f"💡 Correction appliquée automatiquement : {current_query}")
            else:
                # Si on ne sait pas corriger par simple regex, en situation réelle on repasse l'erreur au LLM
                print("L'erreur est trop complexe. En production, le LLM recevrait ce prompt :")
                print(f">> \"Ta requête précédente a échoué avec l'erreur : {error_message}. Réécris-la.\"")
                # Pour le test, on retourne le dictionnaire d'erreur
                return {
                    "status": "error",
                    "attempts": attempts,
                    "message": "Erreur SQL non corrigible automatiquement par regex.",
                    "last_error": error_message
                }


if __name__ == "__main__":
    # 1. TEST SECURITE : Tentative d'écriture (Doit lever une exception de guardrails)
    print("=== Test 1 : Interdire une injection SQL d'écriture ===")
    try:
        agent_ask_database("DROP VIEW v_planning_details;")
    except Exception as e:
        print(f"Guardrail OK : {e}")

    # 2. TEST AUTO-CORRECTION (Simulation) : L'IA génère le mot 'times' au lieu de 'start_time'
    print("\n=== Test 2 : Auto-correction d'un mauvais nom de colonne ===")
    bad_sql = "SELECT module_name, times FROM v_planning_details LIMIT 2;"
    response = agent_ask_database(bad_sql)
    print(f"Résultat final : {response}")
