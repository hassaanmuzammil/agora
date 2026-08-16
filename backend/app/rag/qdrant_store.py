from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    Modifier,
    VectorParams,
    SparseVectorParams,
    MatchValue,
    Filter,
    FilterSelector,
    FieldCondition,
)

from backend.app.rag.config import EMBEDDING_SIZE


def ensure_collection(client: QdrantClient, collection_name: str) -> None:
    if client.collection_exists(collection_name):
        return

    client.create_collection(
        collection_name=collection_name,
        vectors_config={"dense": VectorParams(size=EMBEDDING_SIZE, distance=Distance.COSINE)},
        sparse_vectors_config={"sparse": SparseVectorParams(modifier=Modifier.IDF)},
    )


def delete_points_by_source(client: QdrantClient, collection_name: str, source: str) -> None:
    client.delete(
        collection_name=collection_name,
        points_selector=FilterSelector(
            filter=Filter(
                must=[FieldCondition(key="metadata.source", match=MatchValue(value=source))]
            )
        ),
    )
