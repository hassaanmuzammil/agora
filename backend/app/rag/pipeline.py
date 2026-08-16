from typing_extensions import TypeAlias
from qdrant_client.http.models import Filter, FieldCondition, MatchAny
from langchain_core.documents import Document
from langchain_core.runnables import Runnable

from backend.app.rag.loader import FileLoader
from backend.app.rag.docstore import PostgresStore
from backend.app.rag.config import RETRIEVE_K, RERANK_TOP_N

RetrieverInput: TypeAlias = str
RetrieverOutput: TypeAlias = list[Document]
RetrieverLike: TypeAlias = Runnable[RetrieverInput, RetrieverOutput]


class RAGPipeline:
    def __init__(
        self,
        loader: FileLoader,
        query_retriever: RetrieverLike,
        index_retriever: RetrieverLike,
        docstore: PostgresStore,
        retriever_factory=None,
        model_rerank=None,
    ):
        self.loader = loader
        self.query_retriever = query_retriever
        self.index_retriever = index_retriever
        self.docstore = docstore
        # Needed to build a fresh, per-request retriever scoped to a Qdrant
        # filter (file-level access control) — the shared query_retriever
        # above is a singleton with fixed search_kwargs, so it can't be
        # mutated per-request without racing concurrent callers.
        self.retriever_factory = retriever_factory
        self.model_rerank = model_rerank

    def load(self, file_path: str) -> list[Document]:
        return self.loader.load(file_path=file_path)

    async def index(self, documents: list[Document]) -> None:
        await self.index_retriever.aadd_documents(documents)

    async def _expand_with_neighbors(self, documents: list[Document]) -> list[Document]:
        """Expands the document list by including +-1 neighbors from docstore."""
        seen = set()
        expanded = []
        for doc in documents:
            current_key = await self.docstore.aget_key_by_value(doc)
            if current_key and current_key not in seen:
                seen.add(current_key)
                expanded.append(doc)
            for key_field in ["prev_key", "next_key"]:
                key = doc.metadata.get(key_field)
                if key and key not in seen:
                    neighbor_docs = await self.docstore.amget((key,))
                    if neighbor_docs and neighbor_docs[0]:
                        seen.add(key)
                        expanded.append(neighbor_docs[0])
        return expanded

    # Metadata keys worth surfacing to the user (page/structure info) as
    # opposed to PDF technical noise (producer, creationdate, trapped, ...).
    DISPLAY_METADATA_KEYS = ("title", "author", "subject", "total_pages", "chapter", "section")

    async def retrieve(
        self,
        query: str,
        expand_context: bool = False,
        allowed_sources: list[str] | None = None,
    ) -> list[dict]:
        # `allowed_sources` scopes retrieval to specific files (file-level
        # access control) — None means unrestricted (admin), an empty list
        # means the caller can't see anything, so skip the search entirely
        # rather than sending Qdrant a filter that can never match.
        if allowed_sources is not None and len(allowed_sources) == 0:
            return []

        if allowed_sources is not None:
            qdrant_filter = Filter(
                must=[FieldCondition(key="metadata.source", match=MatchAny(any=allowed_sources))]
            )
            retriever = self.retriever_factory.create(
                rerank=True,
                model_rerank=self.model_rerank,
                k=RETRIEVE_K,
                top_n=RERANK_TOP_N,
                qdrant_filter=qdrant_filter,
            )
        else:
            retriever = self.query_retriever

        documents = await retriever.ainvoke(query)
        if expand_context:
            documents = await self._expand_with_neighbors(documents)

        seen = set()
        sources = []
        for doc in documents:
            key = await self.docstore.aget_key_by_value(doc)
            if key not in seen:
                seen.add(key)
                meta = doc.metadata
                extra_metadata = {
                    k: meta[k] for k in self.DISPLAY_METADATA_KEYS if meta.get(k) not in (None, "", "unspecified", "anonymous")
                }
                sources.append(
                    {
                        "name": meta.get("source", "Unknown").split("/")[-1],
                        # Raw MinIO object name — lets the frontend link a
                        # source back to its File row for preview/download.
                        "source": meta.get("source"),
                        "page": meta.get("page_label") or meta.get("page"),
                        "order": meta.get("order"),
                        "content": doc.page_content.strip(),
                        "metadata": extra_metadata,
                    }
                )
        sources.sort(key=lambda x: (x.get("name", ""), x.get("order") or 0))
        for s in sources:
            s.pop("order", None)
        return sources
