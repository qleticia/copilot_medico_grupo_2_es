import os
import sys
import types
import importlib
import tempfile
import shutil
import pathlib
import pytest

# Ensure project root is on sys.path so 'backend' package resolves during test collection
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


@pytest.fixture()
def temp_db_file(tmp_path, monkeypatch):
    """
    Points backend.patient_db.DB_FILE to a temporary location isolated per test session.
    Ensures the file starts as empty (non-existent) and cleans up afterward.
    """
    from backend import patient_db
    temp_file = tmp_path / "patients_db_test.json"
    # Ensure it does not exist at start
    if temp_file.exists():
        temp_file.unlink()
    monkeypatch.setattr(patient_db, "DB_FILE", str(temp_file), raising=True)
    return str(temp_file)


def _make_stub_text_filter():
    mod = types.ModuleType("backend.text_filter")
    def remover_nomes(texto):
        # no-op for tests unless overridden
        return texto
    def retornar_nome(texto):
        return ""
    mod.remover_nomes = remover_nomes
    mod.retornar_nome = retornar_nome
    return mod


def _make_stub_gemini_connection():
    mod = types.ModuleType("backend.gemini_connection")
    def send_message(patient_id: str, consultation_id: str, message_text: str) -> str:
        return f"[stubbed AI reply] {message_text}"
    mod.send_message = send_message
    return mod


def _make_stub_pdf_reader():
    mod = types.ModuleType("backend.pdf_reader")
    def extract_text_from_pdf(file_storage):
        # If caller passed a dict-like or object with .stream, just consume bytes/text for sanity
        content = getattr(file_storage, "_test_text", None)
        if content is None:
            try:
                # Some tests may pass a simple object with .read()
                content = file_storage.stream.read().decode("utf-8")
            except Exception:
                content = ""
        return content
    mod.extract_text_from_pdf = extract_text_from_pdf
    return mod


@pytest.fixture()
def stubbed_modules(monkeypatch):
    """
    Insert light-weight stub modules for heavy/external deps so importing server.py is safe in tests.
    """
    # Ensure package namespace exists for backend.* if running tests from project root
    if "backend" not in sys.modules:
        backend_pkg = types.ModuleType("backend")
        backend_pkg.__path__ = []  # mark as package-ish
        sys.modules["backend"] = backend_pkg

    sys.modules["backend.text_filter"] = _make_stub_text_filter()
    sys.modules["backend.gemini_connection"] = _make_stub_gemini_connection()
    sys.modules["backend.pdf_reader"] = _make_stub_pdf_reader()

    yield

    # Cleanup stubs to avoid affecting other tests that want real modules
    for name in ["backend.text_filter", "backend.gemini_connection", "backend.pdf_reader"]:
        sys.modules.pop(name, None)


@pytest.fixture()
def flask_app(stubbed_modules, temp_db_file):
    """
    Import server after stubbing heavy modules. Returns Flask app.
    """
    # Import here to ensure stubs are in place
    server = importlib.import_module("server")
    return server.app


@pytest.fixture()
def client(flask_app):
    return flask_app.test_client()


@pytest.fixture(autouse=True)
def env_for_config(monkeypatch):
    """Ensure required env vars exist for config import in any test importing backend.config."""
    monkeypatch.setenv("DB_URL", "sqlite:///test.db")
    monkeypatch.setenv("APP_TITLE", "Test App")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-key")
    yield
