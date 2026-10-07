# DocuMind

DocuMind is a local document question-answering chatbot. Upload files, ask questions about their contents, and review the source passages behind answers. Uploaded documents and their extracted text are stored on the machine running the server.

## Requirements

- Python 3.10 or newer
- An OpenAI API key, or [Ollama](https://ollama.com/) with a model downloaded
- Tesseract OCR for scanned PDFs and image OCR (optional, see [supported files and OCR](#supported-files-and-ocr))

## Install and run

Open a terminal in the repository folder and create a virtual environment:

```sh
python -m venv .venv
```

Activate it and install the dependencies.

**macOS or Linux:**

```sh
source .venv/bin/activate
python -m pip install -r requirements.txt
```

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Choose one of the language model providers below, then start the server:

```sh
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open <http://127.0.0.1:8000> in your browser. Stop the server with **Ctrl+C** in the terminal.

### Use OpenAI (default)

Set your API key in the terminal before starting the server. The key is read by the backend and should not be put in frontend files or committed to Git.

**macOS or Linux:**

```sh
export OPENAI_API_KEY="your-api-key"
```

**Windows PowerShell:**

```powershell
$env:OPENAI_API_KEY = "your-api-key"
```

The default model is `gpt-4.1-mini`; set `OPENAI_MODEL` before starting the server to use a different compatible model. OpenAI API usage may incur charges.

### Use Ollama locally

Install and start Ollama, then download a model. For example:

```sh
ollama pull qwen3:8b
```

Set these variables in the same terminal used to start DocuMind.

**macOS or Linux:**

```sh
export LLM_PROVIDER=ollama
export OLLAMA_MODEL=qwen3:8b
```

**Windows PowerShell:**

```powershell
$env:LLM_PROVIDER = "ollama"
$env:OLLAMA_MODEL = "qwen3:8b"
```

Then start the server using the command above. Ollama uses `http://localhost:11434` by default. Set `OLLAMA_BASE_URL` if your Ollama server uses another address. Local inference uses your computer’s memory and processing power.

## Use the chatbot

1. Select **Upload documents** and choose one or more supported files. You can also paste a screenshot into the question box to upload it for OCR.
2. Wait for the upload and indexing notification to finish.
3. Ask a question in the box at the bottom. DocuMind searches the uploaded content and returns an answer with source references. Ask follow-up questions in the same conversation to keep the recent chat context.
4. Click a file under **Documents** in the sidebar to preview it. PDFs and images open in the preview window; other supported formats show extracted text. Use **Open original** to download or open the source file.
5. Conversations are saved under **History** in this browser. New conversations go there by default. Use a project when you want to group a conversation with project work; a conversation can be moved between History and a project from its **···** menu.

Conversation and project history is stored in browser local storage, so it is specific to that browser and device. The document index and original uploads are stored on the server machine in `data/` by default.

## Supported files and OCR

Supported formats include PDF, DOCX, PPTX, XLSX, CSV, JSON, XML, YAML, plain text, Markdown, HTML, RTF, and common image formats (PNG, JPEG, WebP, TIFF, and BMP). Each upload is limited to 20 MB. Identical files are deduplicated by SHA-256.

Text-based PDFs are extracted directly. Scanned PDFs and images need Tesseract OCR. Install the Tesseract executable for your operating system in addition to the Python packages installed from `requirements.txt`. On Debian or Ubuntu:

```sh
sudo apt install tesseract-ocr
```

OCR quality depends on image clarity and layout. PDF layout-table reconstruction, visual chart or diagram interpretation, legacy DOC/PPT/XLS files, and deterministic spreadsheet calculations are not currently supported.

## Data and configuration

By default, DocuMind stores its SQLite database at `data/documind.sqlite3` and original uploads under `data/originals/`. Set `DOCUMIND_DATA` before starting the server to use a different data directory.

For a development environment that needs to reach the server over a forwarded port or another device on your network, bind to all interfaces:

```sh
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Only do this on a trusted network. The application does not provide user authentication; deployments exposed to other users should add authentication, TLS, and rate limiting.

## API

- `POST /api/upload` — upload multipart files using repeated `files` fields
- `GET /api/documents` — list uploaded documents and processing status
- `GET /api/documents/{document_id}/preview` — get extracted text for document preview
- `GET /api/documents/{document_id}/file` — open or download the original file
- `POST /api/search` — search indexed evidence; JSON body: `{"query":"...","limit":8}`
- `POST /api/ask` — ask a question; JSON body accepts `query`, optional `limit`, and optional recent `history` messages
- `DELETE /api/documents/{document_id}` — delete a document and its indexed evidence

FastAPI’s interactive API reference is available at <http://127.0.0.1:8000/docs> while the server is running.

## Developer checks

```sh
python -m unittest discover -s tests -v
python -m compileall -q backend tests
node --check frontend/app.js
```
