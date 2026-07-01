import os
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer

# Chemins absolus
KNOWLEDGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'knowledge'))
CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'chroma_db'))

# Modèle d'embeddings multilingue (supporte le français, l'arabe, l'anglais, etc.)
EMBEDDING_MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'

def split_text_into_chunks(text: str, chunk_size: int = 1500, overlap: int = 250) -> list:
    """
    Decoupeur logique base sur les paragraphes (\n\n ou \n).
    Garantit que chaque chunk a une taille coherente inferieure a chunk_size.
    """
    # Si le texte contient des doubles sauts de ligne publics, on les utilise, sinon saut simple
    if "\n\n" in text:
        paragraphs = text.split("\n\n")
    else:
        paragraphs = text.split("\n")
        
    chunks = []
    current_chunk = []
    current_length = 0
    
    for para in paragraphs:
        para_stripped = para.strip()
        if not para_stripped:
            continue
            
        # Si un seul paragraphe depasse la limite
        if len(para_stripped) > chunk_size:
            # Si on a du texte accumule, on le valide
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
                current_length = 0
            
            # Decoupage par caractere du gros bloc de force
            start = 0
            while start < len(para_stripped):
                chunks.append(para_stripped[start:start + chunk_size])
                start += (chunk_size - overlap)
            continue
            
        if current_length + len(para_stripped) + 2 > chunk_size:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Simuler un chevauchement avec le dernier element
                current_chunk = [current_chunk[-1], para_stripped] if len(current_chunk) > 1 else [para_stripped]
            else:
                current_chunk = [para_stripped]
            current_length = sum(len(p) for p in current_chunk) + 2
        else:
            current_chunk.append(para_stripped)
            current_length += len(para_stripped) + 2
            
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks

def index_all_documents():
    print(f"Chargement du modèle d'embeddings : {EMBEDDING_MODEL_NAME}...")
    # Charger le modèle sentence-transformers localement
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    # Initialisation de ChromaDB (Persistant sur le disque)
    print(f"Initialisation de la base vectorielle ChromaDB dans : {CHROMA_DIR}...")
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Supprimer l'ancienne collection pour faire une mise à jour propre
    try:
        chroma_client.delete_collection(name="dashtime_knowledge")
        print("🗑️ Ancienne collection vectorielle supprimée pour reconstruction propre.")
    except Exception:
        pass
        
    # Créer la collection pour les documents de DashTime
    collection = chroma_client.get_or_create_collection(
        name="dashtime_knowledge"
    )


    # Parcourir les fichiers dans le dossier knowledge
    print(f"Lecture des documents sources dans : {KNOWLEDGE_DIR}...")
    if not os.path.exists(KNOWLEDGE_DIR):
        print(f"Erreur : Le dossier {KNOWLEDGE_DIR} n'existe pas.")
        return

    documents_to_add = []
    embeddings_to_add = []
    metadatas_to_add = []
    ids_to_add = []
    
    chunk_counter = 0

    for file_name in os.listdir(KNOWLEDGE_DIR):
        if file_name.endswith('.txt') or file_name.endswith('.md'):
            file_path = os.path.join(KNOWLEDGE_DIR, file_name)
            print(f"Indexation du fichier : {file_name}...")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Découpage du fichier en chunks
            chunks = split_text_into_chunks(content)
            print(f"-> Découpé en {len(chunks)} chunks.")
            
            for i, chunk in enumerate(chunks):
                chunk_counter += 1
                # Calcul de l'embedding du chunk
                vector = model.encode(chunk).tolist()
                
                # Stackage pour insertion en lot (batch)
                documents_to_add.append(chunk)
                embeddings_to_add.append(vector)
                metadatas_to_add.append({
                    "source": file_name,
                    "chunk_index": i
                })
                ids_to_add.append(f"{file_name}_chunk_{i}")

    # Insertion dans ChromaDB
    if documents_to_add:
        print(f"Enregistrement de {len(documents_to_add)} chunks dans la base vectorielle...")
        collection.add(
            documents=documents_to_add,
            embeddings=embeddings_to_add,
            metadatas=metadatas_to_add,
            ids=ids_to_add
        )
        print("🎉 Tous les documents ont été encodés et indexés dans ChromaDB avec succès !")
    else:
        print("Aucun document trouvé à indexer.")

if __name__ == "__main__":
    index_all_documents()
