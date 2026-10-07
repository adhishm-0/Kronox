import json
import tempfile
import unittest
from pathlib import Path
from unittest import skipUnless
import importlib.util

from backend.services.chunking import chunk_blocks
from backend.services.citations import citation_label, consolidate_citations
from backend.services.retrieval import rank_payloads
from backend.ingestion.parsers import CsvParser, PdfParser


def payload(**values):
    defaults = {
        "document_id": "doc1", "document_name": "report.pdf", "content": "",
        "content_type": "text", "source_type": "text", "confidence": 1.0,
        "location": {"page": 1},
    }
    defaults.update(values)
    return json.dumps(defaults)


class ChunkingTests(unittest.TestCase):
    def test_chunks_group_lines_without_crossing_page_boundaries(self):
        blocks = [
            {"content": "Annual results", "content_type": "text", "location": {"page": 1, "line": 1}},
            {"content": "Revenue grew", "content_type": "text", "location": {"page": 1, "line": 2}},
            {"content": "Next page", "content_type": "text", "location": {"page": 2, "line": 1}},
        ]
        chunks = chunk_blocks(blocks)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["location"]["page"], 1)
        self.assertEqual(chunks[0]["location"]["line_start"], 1)
        self.assertEqual(chunks[0]["location"]["line_end"], 2)
        self.assertEqual(chunks[1]["location"]["page"], 2)

    def test_tables_remain_separate_chunks(self):
        blocks = [
            {"content": "Year | Revenue", "content_type": "table_header", "location": {"page": 3}},
            {"content": "2025 | 21M", "content_type": "table_row", "location": {"page": 3}},
        ]
        self.assertEqual([c["content"] for c in chunk_blocks(blocks)], ["Year | Revenue", "2025 | 21M"])


class RetrievalTests(unittest.TestCase):
    def test_hybrid_retrieval_returns_table_evidence_and_excludes_ocr_notices(self):
        items = [
            payload(content="Revenue increased steadily over the years.", location={"page": 1}),
            payload(content="Year: 2025 | Revenue: 21 million", content_type="table_row", source_type="table", location={"page": 4}),
            payload(content="OCR found no readable text", content_type="ocr_required", confidence=0, location={"page": 5}),
        ]
        results = rank_payloads("revenue 2025", items, limit=10)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["content_type"], "table_row")
        self.assertGreater(results[0]["relevance"], results[1]["relevance"])

    def test_retrieval_can_return_evidence_from_multiple_documents(self):
        items = [
            payload(document_id="a", document_name="2024.pdf", content="Revenue was 10 million in 2024."),
            payload(document_id="b", document_name="2025.pdf", content="Revenue was 21 million in 2025."),
        ]
        results = rank_payloads("revenue 2025 2024", items, limit=10)
        self.assertEqual({item["document_id"] for item in results}, {"a", "b"})


class CitationTests(unittest.TestCase):
    def test_page_citations_mark_ocr_and_tables(self):
        self.assertEqual(citation_label({"document_name": "scan.pdf", "location": {"page": 17}, "source_type": "ocr"}), "scan.pdf, p.17, OCR")
        self.assertEqual(citation_label({"document_name": "data.pdf", "location": {"page": 25}, "content_type": "table_row"}), "data.pdf, p.25, Table")

    def test_non_pdf_locations_are_not_fabricated_as_pages(self):
        self.assertEqual(citation_label({"document_name": "slides.pptx", "location": {"slide": 4}}), "slides.pptx, slide 4")

    def test_repeated_inline_references_become_one_source_footer(self):
        evidence = [
            {"document_name": "report.pdf", "location": {"page": 2}},
            {"document_name": "report.pdf", "location": {"page": 3}},
        ]
        answer = "Revenue rose [report.pdf, p.2]. The total is shown on page 3 [report.pdf, p.3]. Again, page 2 [report.pdf, p.2]."
        result = consolidate_citations(answer, evidence)
        self.assertEqual(result.count("Source:"), 1)
        self.assertTrue(result.endswith("Source: [report.pdf, p.2]; [report.pdf, p.3]"))
        self.assertNotIn("rose [report.pdf", result)

    def test_numbered_model_citations_map_to_real_source_labels(self):
        evidence = [{"document_name": "report.pdf", "location": {"page": 7}}]
        self.assertEqual(consolidate_citations("The result is 21 [1].", evidence), "The result is 21.\n\nSource: [report.pdf, p.7]")


class ParserTests(unittest.TestCase):
    def test_csv_rows_keep_headers_and_row_locations(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "numbers.csv"
            path.write_text("Year,Revenue\n2025,21M\n", encoding="utf-8")
            blocks = CsvParser().parse(str(path), path.name)
        self.assertEqual(blocks[0]["content_type"], "table_header")
        self.assertIn("Revenue: 21M", blocks[1]["content"])
        self.assertEqual(blocks[1]["location"]["row"], 2)

    @skipUnless(importlib.util.find_spec("pypdf"), "pypdf is not installed")
    def test_text_pdf_keeps_page_metadata(self):
        if not importlib.util.find_spec("fitz"):
            self.skipTest("PyMuPDF is not installed")
        import fitz
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "text.pdf"
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((72, 72), "This report contains readable revenue details for 2025.")
            doc.save(path)
            doc.close()
            blocks = PdfParser().parse(str(path), path.name)
        self.assertTrue(blocks)
        self.assertTrue(all(block["location"]["page"] == 1 for block in blocks))
        self.assertTrue(any("revenue" in block["content"].lower() for block in blocks))

    @skipUnless(importlib.util.find_spec("pypdf"), "pypdf is not installed")
    def test_scanned_pdf_runs_ocr_when_rendering_and_tesseract_are_available(self):
        if not all(importlib.util.find_spec(name) for name in ("fitz", "pytesseract", "PIL")):
            self.skipTest("PyMuPDF, Pillow, and pytesseract are required for scanned PDF OCR")
        import fitz
        from PIL import Image, ImageDraw
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scan.pdf"
            image = Image.new("RGB", (1200, 300), "white")
            ImageDraw.Draw(image).text((40, 100), "Revenue increased in 2025", fill="black")
            png = Path(directory) / "scan.png"
            image.save(png)
            doc = fitz.open()
            page = doc.new_page()
            page.insert_image(page.rect, filename=str(png))
            doc.save(path)
            doc.close()
            blocks = PdfParser().parse(str(path), path.name)
        self.assertTrue(any(block.get("source_type") == "ocr" for block in blocks))
        self.assertTrue(all(block["location"]["page"] == 1 for block in blocks))


if __name__ == "__main__":
    unittest.main()
