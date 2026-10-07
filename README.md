# Kronox

DocuMind is an evidence-first document workspace. It extracts and indexes uploaded documents locally, retrieves matching passages, then uses the OpenAI Responses API to write a natural language answer grounded in those passages. Answers include source locations.

## Run locally

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
# Paid OpenAI API (default):
export OPENAI_API_KEY="your-api-key"
# Or use Ollama locally without API credits:
# ollama pull qwen3:8b
# export LLM_PROVIDER=ollama
# export OLLAMA_MODEL=qwen3:8b
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

For Ollama, install and start Ollama on the same machine as DocuMind, then pull a model with `ollama pull qwen3:8b`. Set `LLM_PROVIDER=ollama` before starting the app. Ollama runs on `http://localhost:11434` by default; set `OLLAMA_BASE_URL` to change it. Local model inference uses your computer's memory and processing power. With this option, retrieved document passages stay on your machine.

Open http://127.0.0.1:8000 on the same machine, or use your development environment's forwarded port 8000 link. Binding to `0.0.0.0` allows a forwarded port or container preview to reach the server. Uploaded files are held in a temporary file during parsing; extracted records are stored in `data/documind.sqlite3`. Set `DOCUMIND_DATA` to change the storage directory. Uploads are limited to 20 MB each and deduplicated by SHA-256.

## Current format support

Text, Markdown, HTML, RTF, JSON, XML, YAML (with PyYAML), CSV, PDF, DOCX (paragraphs and tables), PPTX (slide text, tables, and notes), XLSX (cells and formulas with cached values when available), and image OCR are supported. PDFs with missing/sparse text use automatic page rendering and Tesseract OCR when PyMuPDF, Pillow, pytesseract, and the Tesseract system executable are installed. OCR results retain page numbers and are marked as OCR evidence.

Install the Tesseract executable separately from Python dependencies (for example, `sudo apt install tesseract-ocr` on Debian/Ubuntu). Then run `pip install -r requirements.txt`.

Legacy binary DOC/PPT/XLS, dense semantic embeddings, PDF layout-table reconstruction, visual chart/diagram interpretation, and deterministic spreadsheet calculations are not implemented yet. Retrieval combines lexical overlap with local sparse TF-IDF ranking. Extracted text is page-preserving and chunked; original uploads are kept under the ignored local data directory so PDF page citations can open the source. The language model receives retrieved passages only, and is instructed to cite exact source labels and state when evidence is insufficient.

## API

- `POST /api/upload` — multipart upload (`files`, repeated)
- `GET /api/documents` — indexed collection and processing status
- `POST /api/search` — lexical evidence retrieval (`query`, optional `limit`)
- `POST /api/ask` — RAG response generated from retrieved passages, with source locations
- `DELETE /api/documents/{document_id}` — remove indexed document and evidence
- `GET /api/documents/{document_id}/file` — open or download the stored original

## Checks

Run the dependency-light service tests with `python -m unittest discover -s tests -v`. OCR/PDF tests run when the optional PDF and OCR dependencies are installed; otherwise they are reported as skipped. Run `python -m compileall -q backend tests` and `node --check frontend/app.js` for syntax checks.

Uploaded files are parsed as untrusted data and never executed. For deployment, put the service behind authentication, TLS, and rate limiting, and use managed storage plus a background worker for larger collections.
