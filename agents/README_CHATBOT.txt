════════════════════════════════════════════════════════════════
  DashTime — Architecture du Chatbot IA (Agents)
  Auteur : PFE FSTG Marrakech | Date : Juillet 2026
════════════════════════════════════════════════════════════════

FICHIERS PRINCIPAUX DU DOSSIER /agents/
────────────────────────────────────────
  chat_server.py          → Serveur FastAPI (port 8005) — Point d'entrée HTTP
  sql_agent.py            → Exécution SQL sécurisée sur PostgreSQL
  rag_retriever.py        → Recherche vectorielle ChromaDB (désactivé en prod)
  chatbot_llm.py          → Script CLI interactif (terminal, pour dev/test)
  create_semantic_views.py → Crée les vues PostgreSQL v_planning_details
                             et v_teacher_workload depuis le master planning
  index_knowledge.py      → Indexe les documents dans ChromaDB (RAG)
  chroma_db/              → Base vectorielle locale (RAG)
  knowledge/              → Documents sources pour l'indexation (RAG)


════════════════════════════════════════════════════════════════
  LES 2 MODES DE RÉPONSE
════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  MODE 1 : SQL  ✅  ACTIF EN PRODUCTION                      │
└─────────────────────────────────────────────────────────────┘
Objectif : Répondre aux questions sur les données réelles du planning
           (enseignants, salles, horaires, modules, groupes...)

DÉCLENCHEMENT :
  1. Pré-filtre déterministe — si la question contient des mots-clés
     comme "prof", "salle", "heure", "combien", "lundi", "cours",
     "td", "cm", "planning"... → Route SQL directement (pas de LLM
     pour router, donc plus rapide).
  2. LLM Routeur (fallback) — si aucun mot-clé détecté, Groq/Llama
     classe la question entre "SQL" ou "RAG" avec 0 temperature.

PIPELINE SQL COMPLET :
  Question utilisateur
       ↓
  Groq LLM (llama-3.3-70b-versatile via Groq API)
       → génère un SELECT SQL pur (une ligne, pas de markdown)
       → respecte le SYSTEM_PROMPT_SQL (règles + schéma des vues)
       ↓
  sql_agent.py → sanitize_and_validate_sql()
       → Blacklist : DROP, DELETE, INSERT, UPDATE, TRUNCATE, CREATE, ALTER
       → Ajoute automatiquement LIMIT 100 si absent
       → CAST TIME → TEXT pour les colonnes start_time/end_time avec ILIKE
       ↓
  PostgreSQL (utilisateur READ-ONLY : agent_pfe / agent_password)
       → Connexion timeout : 3 secondes
       → Exécution timeout (statement_timeout) : 2000ms
       → Interroge v_planning_details ou v_teacher_workload
            ↑
         Ces vues lisent timetable_results WHERE is_master_reference = TRUE
         (planning généré par le solver RL-ALNS et validé par l'admin)
       ↓
  Groq LLM → reformule les résultats bruts JSON en français naturel
       ↓
  Réponse HTTP → Frontend (badge [SQL], durée ms, bouton "Voir SQL")

VUES SEMANTIQUES POSTGRES (créées par create_semantic_views.py) :
  v_planning_details  → assignment_id, module_name, module_code,
                         course_type (CM/TD/TP), teacher_name, room_name,
                         room_capacity, day_of_week, start_time, end_time,
                         section_name, is_locked_by_admin
  v_teacher_workload  → teacher_name, total_sessions, total_weekly_hours

  ⚠ IMPORTANT : Ces vues NE lisent PAS la table "assignments" (statique).
                 Elles lisent timetable_results.data (JSONB) via
                 jsonb_array_elements() et joignent les IDs aux tables
                 relationnelles (teachers, rooms, timeslots, sections...).


┌─────────────────────────────────────────────────────────────┐
│  MODE 2 : RAG  ⛔  DÉSACTIVÉ (Prototype)                    │
└─────────────────────────────────────────────────────────────┘
Objectif initial : Répondre aux questions CONCEPTUELLES sur le rapport
                   de PFE, les algorithmes, les contraintes pédagogiques,
                   le guide utilisateur, les règles métier...

POURQUOI DÉSACTIVÉ EN PRODUCTION :
  - ChromaDB + sentence-transformers = lourds (~5s au démarrage)
  - Les chunks indexés ne couvrent pas encore suffisamment le contexte FSTG
  - 95% des questions posées sont des questions de planning (SQL)
  - Le fallback par défaut est configuré sur "SQL" pour sécurité

POUR RÉACTIVER LE RAG :
  Dans chat_server.py, fonction route_question() :
      Actuellement : return "SQL"   ← fallback si aucun mot-clé
      Changer en  : return "RAG"   ← pour questions non-planning

  Il faut aussi s'assurer que chroma_db/ est indexé :
      python agents/index_knowledge.py


════════════════════════════════════════════════════════════════
  MÉMOIRE CONVERSATIONNELLE
════════════════════════════════════════════════════════════════
Les 4 derniers messages de la conversation (alternance user/assistant)
sont injectés dans CHAQUE appel LLM (routeur, générateur SQL, explicateur).
Cela permet au bot de résoudre les pronoms contextuels sans perdre le fil :
  → "combien d'heures pour M. Ouaarab ?"
  → "donner moi les détails de ses séances ?"  ← "ses" = Ouaarab (contexte)


════════════════════════════════════════════════════════════════
  INTÉGRATION FRONTEND → BACKEND
════════════════════════════════════════════════════════════════
  [Navigateur]
  ChatBubble.tsx (composant flottant – toujours visible sur toutes pages)
       ↓ POST { message, history }
  /app/api/chat/route.ts  (proxy Next.js – port 3000)
       ↓ POST { question, history }
  chat_server.py  (FastAPI – port 8005)
       ↓
  [SQL] sql_agent.py + PostgreSQL
  [RAG] rag_retriever.py + ChromaDB


════════════════════════════════════════════════════════════════
  DÉMARRAGE DES SERVICES
════════════════════════════════════════════════════════════════
  1. PostgreSQL (Docker) :
       docker-compose up db

  2. Créer/Recréer les vues (une seule fois ou après changement de master) :
       python agents/create_semantic_views.py

  3. Serveur Chat IA :
       cd _Project_PFE/agents
       uvicorn chat_server:app --host 0.0.0.0 --port 8005 --reload

  4. Backend Planning (FastAPI) :
       cd _Project_PFE/backend
       uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  5. Frontend (Next.js) :
       cd _Project_PFE/frontend
       npm run dev

  Ou tout en un via Docker Compose :
       docker-compose up --build


════════════════════════════════════════════════════════════════
  VARIABLES D'ENVIRONNEMENT (.env à la racine /pfe/)
════════════════════════════════════════════════════════════════
  OPENAI_API_KEY=<votre clé Groq>
  OPENAI_BASE_URL=https://api.groq.com/openai/v1
  LLM_MODEL=llama-3.3-70b-versatile
  DB_HOST=localhost          (ou "db" en environnement Docker)
  DB_PORT=5432
  DB_USER=agent_pfe
  DB_PASSWORD=agent_password
  DB_NAME=fstm_timetable

════════════════════════════════════════════════════════════════


════════════════════════════════════════════════════════════════
  MIGRATION : DE chatbot_llm.py → chat_server.py
  "Du Script CLI au Microservice FastAPI"
════════════════════════════════════════════════════════════════

AVANT — chatbot_llm.py (Prototype CLI)
───────────────────────────────────────
  C'est le premier prototype du chatbot, conçu pour tester la logique
  IA en local dans un terminal Python. Il fonctionne en boucle infinie :

      while True:
          question = input("Vous > ")
          reponse = router_et_repondre(question)
          print("Agent > " + reponse)

  PROBLÈMES DE CETTE APPROCHE :
  ✗  Interface = terminal uniquement (inutilisable par un admin web)
  ✗  Process bloquant (une seule conversation à la fois)
  ✗  Non-callable depuis le frontend Next.js (pas de HTTP)
  ✗  Pas de retour structuré (on ne peut pas extraire le SQL, la durée...)
  ✗  RAG chargé par défaut même pour des questions SQL simples
  ✗  Aucune mémoire entre deux questions (la boucle repart à zéro)


APRÈS — chat_server.py (Microservice de Production)
─────────────────────────────────────────────────────
  On a enveloppé EXACTEMENT la même logique IA dans un serveur HTTP
  FastAPI. La logique ne change pas, seul le "contenant" change.

  CORRESPONDANCE DIRECTE :
  ┌──────────────────────────────┬─────────────────────────────────────┐
  │  chatbot_llm.py              │  chat_server.py                     │
  ├──────────────────────────────┼─────────────────────────────────────┤
  │  while True: input()         │  @app.post("/chat")                 │
  │  print(réponse)              │  return ChatResponse(...)           │
  │  route_question(question)    │  route_question(req) + history      │
  │  generate_sql(question)      │  generate_sql(req) + history        │
  │  execute_sql(sql)            │  sql_agent.agent_ask_database(sql)  │
  │  explain_results(data)       │  explain_sql_results(req, sql, data)│
  └──────────────────────────────┴─────────────────────────────────────┘

  LES 4 CHANGEMENTS CONCRETS EFFECTUÉS :

  1. CRÉER L'API HTTP (FastAPI)
     @app.post("/chat", response_model=ChatResponse)
     def chat(req: ChatRequest):
         ...
     → Maintenant n'importe quel client (Next.js, curl, Postman)
       peut envoyer POST /chat et recevoir du JSON.

  2. STRUCTURER LES ENTRÉES/SORTIES (Pydantic)
     class ChatRequest(BaseModel):
         question: str
         history: list[MessageDict] = []   # ← nouveau : mémoire

     class ChatResponse(BaseModel):
         answer: str        # le texte de la réponse
         route: str         # "SQL" ou "RAG"
         sql_query: str     # la requête SQL pour inspection
         duration_ms: int   # temps de traitement total en ms

     → Dans chatbot_llm.py, tout était mélangé dans des print().
       Maintenant tout est propre, typé, et exploitable par le frontend.

  3. AJOUTER LA MÉMOIRE CONVERSATIONNELLE (history)
     Le frontend envoie les 4 derniers messages avec chaque requête.
     Ils sont injectés dans le contexte LLM avant la question courante :

         messages = [{"role": "system", "content": SYSTEM_PROMPT_SQL}]
         messages.extend(format_history(req.history[-4:]))  ← contexte
         messages.append({"role": "user", "content": req.question})

     → chatbot_llm.py ne se souvenait de RIEN entre deux questions.
       Maintenant le bot comprend "ses séances" = Ouaarab (contexte).

  4. AJOUTER LE MIDDLEWARE CORS
     app.add_middleware(CORSMiddleware,
         allow_origins=["http://localhost:3000", ...], ...)

     → Nécessaire pour que le frontend (port 3000) puisse appeler
       le serveur Python (port 8005) sans blocage navigateur.


  SCHÉMA RÉSUMÉ :

  AVANT                               APRÈS
  ─────────────────────────────────────────────────────────────
  Terminal Python                     Navigateur Web
       │                                    │
       ▼                                    ▼
  chatbot_llm.py                    ChatBubble.tsx (React)
    • input() bloquant                • fetch("/api/chat")
    • print() texte brut                      │
    • 1 seul utilisateur                      ▼
    • RAG chargé par défaut      route.ts (proxy Next.js :3000)
    • Pas de mémoire                          │
                                              ▼
                                    chat_server.py (FastAPI :8005)
                                      • Même logique SQL/RAG
                                      • + JSON structuré typé
                                      • + Mémoire conversationnelle
                                      • + Timeouts & CORS
                                      • + N utilisateurs simultanés
                                      • + Dockerisé & déployable

  CONCLUSION :
  On n'a PAS réécrit la logique IA. On l'a habillée en microservice
  web professionnel, prêt pour la production et l'intégration Docker.
  chatbot_llm.py reste utile pour les tests en développement local.

════════════════════════════════════════════════════════════════

