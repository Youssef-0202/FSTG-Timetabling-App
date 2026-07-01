"""
chat_server.py — Serveur FastAPI DashTime
Expose l'agent hybride (SQL + RAG) via HTTP pour le frontend Next.js.

Lancer : uvicorn chat_server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import sys
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Charger le .env depuis la racine du projet ──────────────────────────────
_ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(dotenv_path=_ENV_PATH)

# ── Importer les modules de l'agent (dans le même dossier) ──────────────────
sys.path.insert(0, os.path.dirname(__file__))
import sql_agent
import rag_retriever
from openai import OpenAI

# ── Client LLM ──────────────────────────────────────────────────────────────
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL")
)
MODEL_NAME = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

# ── Prompts (copie de chatbot_llm.py) ───────────────────────────────────────
ROUTER_SYSTEM_PROMPT = """
Tu es le routeur intelligent de DashTime.
1. 'SQL' : Questions sur données de planification (profs, salles, cours, heures, planning).
2. 'RAG' : Questions conceptuelles (contraintes, algorithmes, rapport, guides).
Réponds UNIQUEMENT par "SQL" ou "RAG". Aucun autre mot.
"""

SYSTEM_PROMPT_SQL = """
Tu es le moteur de génération SQL pour DashTime. Convertis les requêtes naturelles en SQL valide.
Vues disponibles :
1. 'v_planning_details' : assignment_id, module_name, module_code, course_type (TD ou CM),
   teacher_name, room_name, room_capacity, day_of_week (LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI),
   start_time, end_time, section_name, is_locked_by_admin. (Attention: start_time et end_time sont de type TIME).
2. 'v_teacher_workload' : teacher_name, total_sessions, total_weekly_hours.

REGLES :
- Génère uniquement du SELECT. Pas de markdown, pas de commentaires. Une seule ligne.
- Utilise TOUJOURS ILIKE avec '%terme%' pour les recherches textuelles (ex: teacher_name ILIKE '%ouarab%').
- CRITIQUE : Si tu dois faire un ILIKE sur `start_time` ou `end_time`, tu dois les caster en TEXT pour éviter l'erreur operator does not exist: time without time zone ~~* unknown (ex: start_time::text ILIKE '%08:30%').
"""

SYSTEM_PROMPT_RAG = """
Tu es DashTime Assistant, l'assistant documentaire de la FSTG Marrakech.
Réponds uniquement à partir des extraits documentaires fournis, en français, de façon claire et structurée.
"""

# ── Pré-filtre SQL déterministe ──────────────────────────────────────────────
SQL_KEYWORDS = [
    "prof", "professeur", "enseignant", "teacher", "mr", "mme", "dr",
    "salle", "amphi", "labo", "laboratoire", "room",
    "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
    "heure", "heures", "créneau", "planning", "emploi du temps",
    "cours", "séance", "session", "td", "tp", "cm",
    "combien", "liste", "donne", "affiche", "montre", "quel", "quels",
    "quand", "où", "charge", "workload", "verrouill",
]


# ── Application FastAPI ──────────────────────────────────────────────────────
app = FastAPI(
    title="DashTime Chat API",
    description="API de l'assistant hybride SQL & RAG pour DashTime - FSTG Marrakech",
    version="1.0.0"
)

# CORS : autoriser le frontend Next.js (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schémas Pydantic ─────────────────────────────────────────────────────────
class MessageDict(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: list[MessageDict] = []

class ChatResponse(BaseModel):
    answer: str
    route: str          # "SQL" ou "RAG"
    sql_query: str | None = None
    duration_ms: int | None = None


# ── Fonctions internes ───────────────────────────────────────────────────────
def format_history(history: list[MessageDict]) -> list:
    """Transforme l'historique Pydantic en format OpenAI standard."""
    return [{"role": msg.role, "content": msg.content} for msg in history]

def route_question(req: ChatRequest) -> str:
    """Pré-filtre déterministe puis LLM routeur avec contexte."""
    q = req.question.lower()
    if any(kw in q for kw in SQL_KEYWORDS):
        return "SQL"
    
    messages = [{"role": "system", "content": ROUTER_SYSTEM_PROMPT}]
    messages.extend(format_history(req.history[-4:])) # On garde les 4 derniers messages
    messages.append({"role": "user", "content": f"Classifie (réponds uniquement SQL ou RAG) : {req.question}"})

    try:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.0,
            timeout=15.0
        )
        decision = resp.choices[0].message.content.strip().upper()
        return "SQL" if "SQL" in decision else "RAG"
    except Exception:
        return "SQL"


def generate_sql(req: ChatRequest) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT_SQL}]
    messages.extend(format_history(req.history[-4:]))
    messages.append({"role": "user", "content": f"Génère la requête SQL pour : {req.question}"})
    
    resp = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.0,
        timeout=15.0
    )
    return resp.choices[0].message.content.strip()


def explain_sql_results(req: ChatRequest, sql: str, data: list) -> str:
    messages = [{"role": "system", "content": "Tu es DashTime Assistant. Explique les résultats SQL en français, de façon claire et professionnelle en lien avec la conversation."}]
    messages.extend(format_history(req.history[-2:]))
    messages.append({"role": "user", "content": f"Question: {req.question}\nSQL généré: {sql}\nDonnées récupérées: {data}"})
    
    resp = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.7,
        timeout=15.0
    )
    return resp.choices[0].message.content.strip()


def answer_with_rag(req: ChatRequest) -> str:
    chunks = rag_retriever.retrieve_relevant_chunks(req.question, n_results=4)
    context = rag_retriever.build_context_for_llm(chunks)
    
    messages = [{"role": "system", "content": SYSTEM_PROMPT_RAG}]
    messages.extend(format_history(req.history[-4:]))
    messages.append({"role": "user", "content": f"Contexte extrait :\n{context}\n\nQuestion : {req.question}"})
    
    resp = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.4,
        timeout=15.0
    )
    return resp.choices[0].message.content.strip()


# ── Routes FastAPI ───────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    """Vérification de santé du serveur."""
    return {"status": "ok", "service": "DashTime Chat API", "model": MODEL_NAME}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Point d'entrée principal du chatbot.
    Reçoit une question et un historique, la route vers SQL ou RAG, et retourne la réponse.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La question ne peut pas être vide.")

    start = time.time()
    route = route_question(req)
    sql_used = None

    try:
        if route == "SQL":
            sql_used = generate_sql(req)
            db_result = sql_agent.agent_ask_database(sql_used)

            if db_result["status"] == "success":
                answer = explain_sql_results(req, sql_used, db_result["data"])
            else:
                answer = f"La requête n'a pas pu être exécutée : {db_result.get('last_error', 'Erreur inconnue')}"
        else:
            answer = answer_with_rag(req)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne de l'agent : {str(e)}")

    duration = int((time.time() - start) * 1000)

    return ChatResponse(
        answer=answer,
        route=route,
        sql_query=sql_used,
        duration_ms=duration
    )
