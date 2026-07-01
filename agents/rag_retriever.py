import chromadb
from sentence_transformers import SentenceTransformer
import os

# Chemins
CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'chroma_db'))
EMBEDDING_MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'

# Chargement une seule fois (sera réutilisé par le chatbot)
print(f"Chargement du modèle d'embeddings : {EMBEDDING_MODEL_NAME}...")
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

print(f"Connexion à ChromaDB : {CHROMA_DIR}...")
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_collection(name="dashtime_knowledge")

def retrieve_relevant_chunks(user_question: str, n_results: int = 4) -> list:
    """
    Recherche hybride fusionnee (Semantic + Keyword + Boost) pour ChromaDB.
    Garantit une excellente couverture pour les requetes de concepts (ex: contraintes souples, H11)
    meme en presence de fautes de frappe (ex: conmbien).
    """
    import re
    
    # 0. Détecter les codes de contraintes spécifiques (S1 à S8, H1 à H12)
    constraint_patterns = re.findall(r'\b([hHsS]\d{1,2})\b', user_question)
    boosted_chunks = []
    seen_texts = set()
    
    if constraint_patterns:
        try:
            # Récupérer tous les chunks du référentiel des contraintes
            constraints_docs = collection.get(where={"source": "constraints_reference.md"}, include=["documents", "metadatas"])
            if constraints_docs and constraints_docs["documents"]:
                for i, doc in enumerate(constraints_docs["documents"]):
                    for pat in constraint_patterns:
                        pat_upper = pat.upper()
                        if f"{pat_upper} -" in doc or f"{pat_upper} :" in doc or f"({pat_upper})" in doc:
                            if doc not in seen_texts:
                                boosted_chunks.append({
                                    "text": doc,
                                    "source": constraints_docs["metadatas"][i]["source"],
                                    "score": 2.0  # Priorité maximale
                                })
                                seen_texts.add(doc)
                                break
        except Exception:
            pass

    # Si on a déjà assez de chunks boostés, on peut s'arrêter
    if len(boosted_chunks) >= n_results:
        return boosted_chunks[:n_results]

    # 1. Recherche par mots-clés (Keyword Search)
    keyword_matches = []
    stop_words = {"est", "une", "les", "des", "que", "quoi", "quel", "quels",
                  "la", "le", "les", "de", "du", "en", "et", "ce", "cest",
                  "pour", "qui", "dans", "sur", "par", "avec", "son", "ses",
                  "combien", "conmbien", "quelles", "quels"}
    
    # Remplacer les fautes et normaliser les mots de la question
    cleaned_question = user_question.replace("conmbien", "combien")
    keywords = [
        w.strip("?!.,;:").lower()
        for w in cleaned_question.split()
        if len(w.strip("?!.,;:").lower()) > 1 and w.lower() not in stop_words
    ]
    
    if keywords:
        try:
            all_docs = collection.get(include=["documents", "metadatas"])
            for i, doc in enumerate(all_docs["documents"]):
                if doc not in seen_texts:
                    doc_lower = doc.lower()
                    match_count = sum(1 for kw in keywords if kw in doc_lower)
                    if match_count > 0:
                        keyword_matches.append({
                            "text": doc,
                            "source": all_docs["metadatas"][i]["source"],
                            "score": round(match_count / len(keywords), 4),
                            "match_count": match_count
                        })
            keyword_matches.sort(key=lambda x: x["score"], reverse=True)
        except Exception:
            pass

    # 2. Recherche par similarite semantique (Semantic Search)
    semantic_matches = []
    try:
        query_vector = model.encode(user_question).tolist()
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=n_results + 2,
            include=["documents", "metadatas", "distances"]
        )
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                if doc not in seen_texts:
                    dist = results["distances"][0][i]
                    semantic_matches.append({
                        "text": doc,
                        "source": results["metadatas"][0][i]["source"],
                        "score": round(1 - dist, 4)
                    })
    except Exception:
        pass

    # 3. Fusion des resultats dans l'ordre de priorite : Boost > Keywords > Semantics
    chunks = list(boosted_chunks)
    
    # Ajouter d'abord les meilleurs matches par mots-clés
    for match in keyword_matches[:2]:  # Garder les 2 meilleurs mots-clés
        if len(chunks) < n_results and match["text"] not in seen_texts:
            chunks.append({
                "text": match["text"],
                "source": match["source"],
                "score": match["score"]
            })
            seen_texts.add(match["text"])
            
    # Compléter avec la recherche sémantique
    for match in semantic_matches:
        if len(chunks) < n_results and match["text"] not in seen_texts:
            chunks.append(match)
            seen_texts.add(match["text"])
            
    # Si on n'a toujours pas assez de chunks, ajouter les autres matches de mots-clés
    for match in keyword_matches[2:]:
        if len(chunks) < n_results and match["text"] not in seen_texts:
            chunks.append({
                "text": match["text"],
                "source": match["source"],
                "score": match["score"]
            })
            seen_texts.add(match["text"])

    return chunks[:n_results]



def build_context_for_llm(chunks: list) -> str:
    """
    Transforme la liste de chunks en un bloc de contexte structuré
    prêt à être injecté dans le System Prompt du LLM.
    """
    if not chunks:
        return "Aucun contexte documentaire pertinent trouvé."
    
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(
            f"[Source: {chunk['source']} | Pertinence: {chunk['score']}]\n{chunk['text']}"
        )
    
    return "\n\n---\n\n".join(context_parts)


# --- TEST INTERACTIF ---
if __name__ == "__main__":
    print("\n" + "="*60)
    print("TEST DU MOTEUR DE RECHERCHE RAG - DashTime")
    print("="*60)
    
    test_questions = [
        "Quelles sont les contraintes hard H1 et H2 ?",
        "Comment fonctionne le Curriculum Learning dans le moteur ?",
        "Comment importer une maquette de filière dans l'interface ?"
    ]
    
    for question in test_questions:
        print(f"\n Question : {question}")
        chunks = retrieve_relevant_chunks(question, n_results=2)
        for chunk in chunks:
            print(f"  └─ [{chunk['source']}] Score: {chunk['score']}")
            print(f"     {chunk['text'][:150]}...")
