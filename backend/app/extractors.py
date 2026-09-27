import io
from pathlib import Path
from dataclasses import dataclass

class ExtractionError(ValueError):
    pass

class Extractor:
    def extract(self, content: bytes) -> str:
        raise NotImplementedError

class TextExtractor(Extractor):
    def extract(self, content: bytes) -> str:
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ExtractionError("The text file is not valid UTF-8") from exc

class PdfExtractor(Extractor):
    def extract(self, content: bytes) -> str:
        try:
            from pypdf import PdfReader
            return "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)
        except Exception as exc:
            raise ExtractionError("The PDF is corrupt or unreadable") from exc

class DocxExtractor(Extractor):
    def extract(self, content: bytes) -> str:
        try:
            from docx import Document
            return "\n".join(p.text for p in Document(io.BytesIO(content)).paragraphs)
        except Exception as exc:
            raise ExtractionError("The DOCX is corrupt or unreadable") from exc

def extractor_for(filename: str) -> Extractor:
    return {".pdf": PdfExtractor(), ".docx": DocxExtractor()}.get(Path(filename).suffix.lower(), TextExtractor())


def extract_text(filename: str, content: bytes) -> str:
    return extractor_for(filename).extract(content)


def summarize(text: str) -> str:
    clean = " ".join(text.split())
    if not clean:
        return "No readable text was found."
    sentences = [s.strip() for s in clean.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    return ". ".join(sentences[:3])[:600] + ("." if sentences else "")

def file_type(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".") or "txt"
