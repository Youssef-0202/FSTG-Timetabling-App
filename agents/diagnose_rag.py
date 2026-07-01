import chromadb, os, sys
from sentence_transformers import SentenceTransformer

sys.stdout.reconfigure(encoding='utf-8')

CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'chroma_db'))
c = chromadb.PersistentClient(path=CHROMA_DIR)
col = c.get_collection('dashtime_knowledge')
print('Collection count:', col.count())

m = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

queries = [
    "conmbien des contraintes souple ?"
]

for query in queries:
    print(f"\n{'='*60}")
    print(f"QUERY: {query}")
    v = m.encode(query).tolist()
    r = col.query(query_embeddings=[v], n_results=5, include=['documents', 'distances', 'metadatas'])
    for i, doc in enumerate(r['documents'][0]):
        dist = r['distances'][0][i]
        meta = r['metadatas'][0][i]
        print(f"\n  Dist: {dist:.4f} | {meta['source']} chunk {meta['chunk_index']}")
        print(f"  >> {doc[:250].replace(chr(10), ' ')}")

