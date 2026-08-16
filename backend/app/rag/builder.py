from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore, RetrievalMode

from backend.app.core.config import settings
from backend.app.rag.qdrant_store import ensure_collection
from backend.app.rag.loader import FileLoader
from backend.app.rag.docstore import PostgresStore
from backend.app.rag.retriever import RetrieverFactory
from backend.app.rag.models import model_dense, model_sparse, model_rerank
from backend.app.rag.pipeline import RAGPipeline
from backend.app.rag.config import RETRIEVE_K, RERANK_TOP_N

qdrant_client = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY or None,
    prefer_grpc=True,
)

ensure_collection(qdrant_client, settings.QDRANT_COLLECTION)

vectorstore = QdrantVectorStore(
    client=qdrant_client,
    collection_name=settings.QDRANT_COLLECTION,
    embedding=model_dense,
    sparse_embedding=model_sparse,
    retrieval_mode=RetrievalMode.HYBRID,
    vector_name="dense",
    sparse_vector_name="sparse",
)

docstore = PostgresStore()

loader = FileLoader()

retriever_factory = RetrieverFactory(vectorstore=vectorstore, docstore=docstore)
query_retriever = retriever_factory.create(
    rerank=True, model_rerank=model_rerank, k=RETRIEVE_K, top_n=RERANK_TOP_N
)
index_retriever = retriever_factory.create(rerank=False, k=RETRIEVE_K)

pipeline = RAGPipeline(
    loader=loader,
    query_retriever=query_retriever,
    index_retriever=index_retriever,
    docstore=docstore,
    retriever_factory=retriever_factory,
    model_rerank=model_rerank,
)
