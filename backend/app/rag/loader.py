from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader


class FileLoader:
    def load(self, file_path: str) -> list[Document]:
        return PyPDFLoader(file_path, mode="page", extract_images=False).load()
