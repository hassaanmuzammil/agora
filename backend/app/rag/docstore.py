from typing import Dict, Optional, Iterator, Sequence, AsyncIterator

from sqlalchemy import select, delete, cast, Integer
from langchain_core.documents import Document
from langchain_core.stores import BaseStore

from backend.app.db.session import SessionLocal
from backend.app.db.models import DocStore


class PostgresStore(BaseStore[str, Document]):
    """langchain BaseStore backed by the existing `docstore` table.

    This app is asyncpg-only (see [[agora-project]] convention) — only the
    async methods (`a*`) are implemented with real logic. The sync methods
    are required by BaseStore's ABC but are never called by anything we use
    (ParentDocumentRetriever's `aadd_documents`/async retrieval both go
    through `amset`/`amget` exclusively), so they raise instead of silently
    running a second, unrelated DB driver.
    """

    def __init__(self, link_documents: bool = True):
        self.link_documents = link_documents

    def serialize_document(self, doc: Document) -> dict:
        return {"page_content": doc.page_content, "metadata": doc.metadata}

    def deserialize_document(self, value: dict) -> Document:
        return Document(
            page_content=value.get("page_content", ""),
            metadata=value.get("metadata", {}),
        )

    def mget(self, keys: Sequence[str]) -> list:
        raise NotImplementedError("Sync access not supported; use amget.")

    async def amget(self, keys: Sequence[str]) -> list[Document | None]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(DocStore).where(DocStore.key.in_(keys))
            )
            by_key = {row.key: row for row in result.scalars().all()}
            return [
                self.deserialize_document(by_key[key].value) if key in by_key else None
                for key in keys
            ]

    def mset(self, key_value_pairs: Sequence[tuple[str, Document]]) -> None:
        raise NotImplementedError("Sync access not supported; use amset.")

    async def amset(self, key_value_pairs: Sequence[tuple[str, Document]]) -> None:
        async with SessionLocal() as session:
            for i, (key, document) in enumerate(key_value_pairs):
                serialized = self.serialize_document(document)
                if self.link_documents:
                    metadata = serialized.get("metadata", {})
                    metadata["prev_key"] = key_value_pairs[i - 1][0] if i > 0 else None
                    metadata["next_key"] = (
                        key_value_pairs[i + 1][0] if i < len(key_value_pairs) - 1 else None
                    )
                    metadata["order"] = i
                    serialized["metadata"] = metadata
                session.add(DocStore(key=key, value=serialized))
            await session.commit()

    def mdelete(self, keys: Sequence[str]) -> None:
        raise NotImplementedError("Sync access not supported; use amdelete.")

    async def amdelete(self, keys: Sequence[str]) -> None:
        async with SessionLocal() as session:
            await session.execute(delete(DocStore).where(DocStore.key.in_(keys)))
            await session.commit()

    async def adelete_by_source(self, source: str) -> None:
        async with SessionLocal() as session:
            await session.execute(
                delete(DocStore).where(
                    DocStore.value["metadata"]["source"].astext == source
                )
            )
            await session.commit()

    def yield_keys(self, *, prefix: Optional[str] = None) -> Iterator[str]:
        raise NotImplementedError("Sync access not supported; use ayield_keys.")

    async def ayield_keys(self, *, prefix: Optional[str] = None) -> AsyncIterator[str]:
        async with SessionLocal() as session:
            stmt = select(DocStore.key)
            if prefix:
                stmt = stmt.where(DocStore.key.like(f"{prefix}%"))
            result = await session.execute(stmt)
            for key in result.scalars().all():
                yield key

    async def aget_key_by_value(self, value: Document) -> Optional[str]:
        source = value.metadata.get("source")
        order = value.metadata.get("order")
        if source is None or order is None:
            return None
        async with SessionLocal() as session:
            result = await session.execute(
                select(DocStore.key).where(
                    DocStore.value["metadata"]["source"].astext == source,
                    cast(DocStore.value["metadata"]["order"].astext, Integer) == order,
                )
            )
            return result.scalar_one_or_none()
