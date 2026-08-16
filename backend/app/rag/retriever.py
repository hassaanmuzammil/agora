from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers import ParentDocumentRetriever, ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

from backend.app.rag.config import (
    PARENT_CHUNK_SIZE,
    PARENT_CHUNK_OVERLAP,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)


class RetrieverFactory:
    def __init__(self, vectorstore, docstore):
        self.vectorstore = vectorstore
        self.docstore = docstore

    def create(
        self,
        rerank: bool = True,
        model_rerank: HuggingFaceCrossEncoder = None,
        k: int = 20,
        top_n: int = 3,
        qdrant_filter=None,
    ):
        parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=PARENT_CHUNK_SIZE,
            chunk_overlap=PARENT_CHUNK_OVERLAP,
        )
        child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        search_kwargs = {"k": k}
        if qdrant_filter is not None:
            search_kwargs["filter"] = qdrant_filter

        base_retriever = ParentDocumentRetriever(
            vectorstore=self.vectorstore,
            docstore=self.docstore,
            parent_splitter=parent_splitter,
            child_splitter=child_splitter,
            search_kwargs=search_kwargs,
        )

        if rerank and model_rerank:
            return ContextualCompressionRetriever(
                base_compressor=CrossEncoderReranker(model=model_rerank, top_n=top_n),
                base_retriever=base_retriever,
            )
        return base_retriever
