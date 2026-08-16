from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import FastEmbedSparse
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

from backend.app.rag.config import DENSE_MODEL, SPARSE_MODEL, RERANKING_MODEL

model_dense = HuggingFaceEmbeddings(model_name=DENSE_MODEL)
model_sparse = FastEmbedSparse(model_name=SPARSE_MODEL)
model_rerank = HuggingFaceCrossEncoder(model_name=RERANKING_MODEL)
