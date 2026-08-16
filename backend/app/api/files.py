from datetime import datetime, timezone
from uuid import UUID
import io
import logging
import os
import tempfile

from fastapi import (
    APIRouter,
    Depends,
    Form,
    UploadFile,
    File as FastAPIFile,
    HTTPException,
)
from fastapi.responses import Response

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from minio.error import S3Error
from minio import Minio

from backend.app.db.session import get_db
from backend.app.db.models import File as FileModel, Group, User
from backend.app.api.auth import get_current_user, require_admin
from backend.app.schemas.files import FileResponse, UpdateFileGroupsRequest
from backend.app.core.config import settings
from backend.app.rag.builder import pipeline, qdrant_client, docstore
from backend.app.rag.qdrant_store import delete_points_by_source
from backend.app.rag.config import ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)


def ensure_bucket():

    if not client.bucket_exists(
        settings.MINIO_BUCKET
    ):
        client.make_bucket(
            settings.MINIO_BUCKET
        )


def object_name_from_storage_path(blob_storage_path: str) -> str:
    prefix = f"minio://{settings.MINIO_BUCKET}/"
    if not blob_storage_path.startswith(prefix):
        raise ValueError(f"Unexpected storage path format: {blob_storage_path}")
    return blob_storage_path[len(prefix):]


def user_can_access_file(user: User, file: FileModel) -> bool:
    """Admin sees everything; otherwise the file's owner or a member of any
    group the file is granted to."""
    if user.is_admin:
        return True
    if file.user_id == user.id:
        return True
    user_group_ids = {g.id for g in user.groups}
    file_group_ids = {g.id for g in file.groups}
    return bool(user_group_ids & file_group_ids)


router = APIRouter(
    prefix="/files",
    tags=["files"],
)



@router.post(
    "",
    response_model=FileResponse,
)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    group_ids: list[UUID] = Form(default=[]),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()


    object_name = (
        f"{datetime.now(timezone.utc).timestamp()}_"
        f"{file.filename}"
    )


    try:

        client.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(content),
            length=len(content),
            content_type=file.content_type,
        )

    except S3Error as e:

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


    storage_path = (
        f"minio://"
        f"{settings.MINIO_BUCKET}/"
        f"{object_name}"
    )

    # Index into the vector store + docstore, using the MinIO object name as
    # the stable "source" identifier for every chunk (so it can be looked up
    # and deleted later, unlike a temp file path which won't survive).
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            documents = pipeline.load(tmp_path)
        finally:
            os.remove(tmp_path)

        for doc in documents:
            doc.metadata["source"] = object_name

        await pipeline.index(documents)

    except Exception as e:
        logger.error(f"Indexing failed for {object_name}: {e}")

        client.remove_object(settings.MINIO_BUCKET, object_name)
        delete_points_by_source(qdrant_client, settings.QDRANT_COLLECTION, object_name)
        await docstore.adelete_by_source(object_name)

        raise HTTPException(status_code=500, detail="Failed to index file")


    db_file = FileModel(
        filename=file.filename,
        blob_storage_path=storage_path,
        vector_storage_path=object_name,
        mime_type=file.content_type,
        size=len(content),
        user_id=user.id,
    )

    if group_ids:
        group_result = await db.execute(select(Group).where(Group.id.in_(group_ids)))
        db_file.groups = list(group_result.scalars().all())

    db.add(db_file)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save file metadata for {object_name}: {e}")

        client.remove_object(settings.MINIO_BUCKET, object_name)
        delete_points_by_source(qdrant_client, settings.QDRANT_COLLECTION, object_name)
        await docstore.adelete_by_source(object_name)

        raise HTTPException(status_code=500, detail="Failed to save file metadata")

    await db.refresh(db_file)


    return db_file



@router.get(
    "",
    response_model=list[FileResponse],
)
async def list_files(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(FileModel)
        .where(
            FileModel.deleted_at.is_(None)
        )
        .order_by(
            FileModel.created_at.desc()
        )
    )

    files = result.scalars().all()

    if user.is_admin:
        return files

    return [f for f in files if user_can_access_file(user, f)]



@router.get(
    "/{file_id}",
    response_model=FileResponse,
)
async def get_file(
    file_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(FileModel)
        .where(
            FileModel.id == file_id,
            FileModel.deleted_at.is_(None),
        )
    )


    file = result.scalar_one_or_none()


    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if not user_can_access_file(user, file):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this file",
        )


    return file



@router.get(
    "/{file_id}/content",
)
async def get_file_content(
    file_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(FileModel)
        .where(
            FileModel.id == file_id,
            FileModel.deleted_at.is_(None),
        )
    )

    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if not user_can_access_file(user, file):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this file",
        )

    object_name = object_name_from_storage_path(file.blob_storage_path)

    try:
        response = client.get_object(settings.MINIO_BUCKET, object_name)
        content = response.read()
    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        response.close()
        response.release_conn()

    return Response(
        content=content,
        media_type=file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{file.filename}"',
        },
    )



@router.delete(
    "/{file_id}",
)
async def delete_file(
    file_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(FileModel)
        .where(
            FileModel.id == file_id,
            FileModel.deleted_at.is_(None),
        )
    )


    file = result.scalar_one_or_none()


    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if not user.is_admin and file.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the uploader or an admin can delete this file",
        )


    if file.vector_storage_path:
        delete_points_by_source(qdrant_client, settings.QDRANT_COLLECTION, file.vector_storage_path)
        await docstore.adelete_by_source(file.vector_storage_path)


    file.deleted_at = datetime.now(timezone.utc)

    await db.commit()


    return {
        "success": True
    }


@router.put(
    "/{file_id}/groups",
    response_model=FileResponse,
)
async def update_file_groups(
    file_id: UUID,
    payload: UpdateFileGroupsRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.deleted_at.is_(None),
        )
    )

    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    group_result = await db.execute(select(Group).where(Group.id.in_(payload.group_ids)))
    file.groups = list(group_result.scalars().all())

    await db.commit()
    await db.refresh(file)

    return file