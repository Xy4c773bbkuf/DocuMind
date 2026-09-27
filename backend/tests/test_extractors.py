import pytest
from app.extractors import ExtractionError, extract_text, summarize

def test_text_extractor_and_summary():
    text = extract_text("notes.txt", b"One useful sentence. Another sentence.")
    assert "useful" in text
    assert "One useful sentence" in summarize(text)

def test_invalid_utf8_is_rejected():
    with pytest.raises(ExtractionError):
        extract_text("notes.txt", b"\xff\xfe")

def test_corrupt_pdf_is_rejected():
    with pytest.raises(ExtractionError):
        extract_text("notes.pdf", b"not a pdf")
