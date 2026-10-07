# Kronox

DocuMind is an evidence-first document workspace. It extracts and indexes uploaded documents locally, retrieves matching passages, then uses the OpenAI Responses API to write a natural language answer grounded in those passages. Answers include source locations.

## Run locally

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="your-api-key"
# Optional: choose a different model (default: gpt-4.1-mini)
export OPENAI_MODEL="gpt-4.1-mini"
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Open http://127.0.0.1:8000 on the same machine, or use your development environment's forwarded port 8000 link. Binding to `0.0.0.0` allows a forwarded port or container preview to reach the server. Uploaded files are held in a temporary file during parsing; extracted records are stored in `data/documind.sqlite3`. Set `DOCUMIND_DATA` to change the storage directory. Uploads are limited to 20 MB each and deduplicated by SHA-256.

## Current format support

Text, Markdown, HTML, RTF, JSON, XML, YAML (with PyYAML), CSV, PDF (embedded text), DOCX (paragraphs and tables), PPTX (slide text, tables, and notes), XLSX (cells and formulas with cached values when available), and image OCR (Pillow, pytesseract, plus the Tesseract system executable).

Legacy binary DOC/PPT/XLS, OCR for scanned PDF pages, semantic embeddings, and deterministic spreadsheet calculations are not implemented yet. Retrieval currently uses local lexical matching; scanned PDF pages are marked as requiring OCR and excluded from generated answers. The language model receives only retrieved passages, and is instructed to cite them and say when evidence is insufficient.

## API

- `POST /api/upload` — multipart upload (`files`, repeated)
- `GET /api/documents` — indexed collection and processing status
- `POST /api/search` — lexical evidence retrieval (`query`, optional `limit`)
- `POST /api/ask` — RAG response generated from retrieved passages, with source locations
- `DELETE /api/documents/{document_id}` — remove indexed document and evidence

Uploaded files are parsed as untrusted data and never executed. For deployment, put the service behind authentication, TLS, and rate limiting, and use managed storage plus a background worker for larger collections.
