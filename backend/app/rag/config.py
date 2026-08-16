ALLOWED_EXTENSIONS = [".pdf"]

EMBEDDING_SIZE = 384
DENSE_MODEL = "all-MiniLM-L6-v2"
SPARSE_MODEL = "Qdrant/bm25"
RERANKING_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

PARENT_CHUNK_SIZE = 2000
PARENT_CHUNK_OVERLAP = 100
CHUNK_SIZE = 400
CHUNK_OVERLAP = 50

RETRIEVE_K = 20
RERANK_TOP_N = 3

# How many prior turns to feed into query rewriting, as plain text (not sent
# to the vectorstore, just used to make the query self-contained).
QUERY_REWRITE_HISTORY_TURNS = 5
