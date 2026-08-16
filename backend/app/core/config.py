from pathlib import Path


from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Single global .env lives at the repo root (agora/.env), shared with
# docker-compose.yml — not backend/.env.
ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

load_dotenv(ROOT_ENV_FILE, override=True)


class Settings(BaseSettings):

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/postgres"
    )

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio"
    MINIO_SECRET_KEY: str = "minio123"

    MINIO_BUCKET: str = "default"
    MINIO_SECURE: bool = False

    # OpenAI
    OPENAI_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "default"


    class Config:
        env_file = ROOT_ENV_FILE
        # The shared root .env also carries docker-compose-only vars
        # (POSTGRES_USER, MINIO_ROOT_USER, ...) that aren't Settings fields.
        extra = "ignore"


settings = Settings()