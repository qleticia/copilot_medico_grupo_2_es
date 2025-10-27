import types
import importlib
import sys


def make_fake_pypdf2():
    mod = types.ModuleType("PyPDF2")

    class FakePage:
        def __init__(self, text):
            self._text = text
        def extract_text(self):
            return self._text

    class PdfReader:
        def __init__(self, stream):
            # ignore stream; produce two pages
            self.pages = [FakePage("Hello "), FakePage("World")] 

    mod.PdfReader = PdfReader
    return mod


def test_extract_text_from_pdf(monkeypatch):
    # Monkeypatch PyPDF2 before importing module
    monkeypatch.setitem(sys.modules, "PyPDF2", make_fake_pypdf2())
    mod = importlib.import_module("backend.pdf_reader")
    importlib.reload(mod)

    class DummyUpload:
        def __init__(self):
            self.stream = object()  # just a placeholder

    result = mod.extract_text_from_pdf(DummyUpload())
    assert result == "Hello World"
