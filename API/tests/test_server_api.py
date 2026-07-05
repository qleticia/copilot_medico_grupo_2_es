import io
import json
from ..backend import patient_db as pdb
from backend import auth_decorators


def _authorize_as(monkeypatch, profile="medico"):
    def fake_get_user_from_token(token):
        return (
            {
                "id": "user-test",
                "email": "medico@example.com",
                "name": "Medico Teste",
                "profiles": [profile],
                "active": True,
            },
            {"profile": profile},
        )

    monkeypatch.setattr(auth_decorators, "get_user_from_token", fake_get_user_from_token)
    return {"Authorization": "Bearer token-teste"}


def test_patient_exists_endpoint_false(client):
    resp = client.get('/api/patient-exists/does-not-exist')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["exists"] is False


def test_create_patient_endpoint(client):
    resp = client.post('/api/patients', json={"name": "Ana"})
    assert resp.status_code == 201
    payload = resp.get_json()
    assert payload["status"] == "success"
    assert payload["patient_id"]
    assert payload["patient_name"] == "Ana"
    assert payload["first_consultation_id"]


def test_chat_endpoint_creates_patient_and_consultation(client):
    resp = client.post('/api/chat', json={"message": "Olá doutor"})
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["status"] == "success"
    assert "ai_response" in payload
    assert payload["consultation_id"]
    # When chat creates new patient, response includes patient_id
    assert payload.get("patient_id")


def test_chat_endpoint_with_existing_patient_and_consultation(client):
    # Prepare a patient and consultation
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid, name="Teste")
    cid = pdb.add_consultation_to_patient(pid, "Consulta X")
    resp = client.post('/api/chat', json={"message": "Pergunta", "patient_id": pid, "consultation_id": cid})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["consultation_id"] == cid


def test_upload_pdf_endpoint_happy_path(client):
    # Create simple in-memory file pretending to be a PDF; stub will read its bytes as text
    data = {
        'pdf': (io.BytesIO(b"exaMENe do paciente Joao"), 'doc.pdf')
    }
    resp = client.post('/api/upload-pdf', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["status"] == "success"
    assert payload["ai_response"].startswith("[stubbed AI reply]")
    assert payload["consultation_id"]


def test_extension_extracted_data_requires_token(client):
    resp = client.post('/api/extension/extracted-data', json={})
    assert resp.status_code == 401
    assert resp.get_json()["status"] == "error"


def test_extension_extracted_data_validates_payload(client, monkeypatch):
    headers = _authorize_as(monkeypatch)

    resp = client.post('/api/extension/extracted-data', json={}, headers=headers)

    assert resp.status_code == 400
    assert resp.get_json()["status"] == "error"


def test_extension_extracted_data_saves_history_and_ai_response(client, monkeypatch):
    headers = _authorize_as(monkeypatch)
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid, name="Paciente Teste")
    cid = pdb.add_consultation_to_patient(pid, "Consulta Extensao")

    payload = {
        "patient_id": pid,
        "consultation_id": cid,
        "source_url": "https://sistema-prontuario.com/atendimento",
        "extracted_content": [
            {"role": "peso", "text": "70"},
            {"role": "altura", "text": "1.75"},
            {"role": "Anamnese", "text": "Paciente relata dor de cabeca"},
        ],
    }

    resp = client.post('/api/extension/extracted-data', json=payload, headers=headers)

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["patient_id"] == pid
    assert data["consultation_id"] == cid
    assert data["ai_response"].startswith("[stubbed AI reply]")

    history_resp = client.get(f"/api/patients/{pid}/consultations/{cid}/history")
    assert history_resp.status_code == 200
    history = history_resp.get_json()["history"]
    saved_texts = [entry["parts"][0]["text"] for entry in history]
    assert any("Fonte: https://sistema-prontuario.com/atendimento" in text for text in saved_texts)
    assert any("- peso: 70" in text for text in saved_texts)
    assert any(text.startswith("[stubbed AI reply]") for text in saved_texts)


def test_create_and_list_consultations(client):
    # First create a patient
    r = client.post('/api/patients', json={"name": "Carlos"})
    pid = r.get_json()["patient_id"]
    # Create a new consultation with imports param (no errors)
    resp = client.post(f'/api/patients/{pid}/consultations', json={"title": "Nova Consulta", "import_consultation_ids": []})
    assert resp.status_code == 201
    new_id = resp.get_json()["consultation_id"]
    # List consultations
    list_resp = client.get(f'/api/patients/{pid}/consultations')
    assert list_resp.status_code == 200
    consultations = list_resp.get_json()["consultations"]
    assert any(c["id"] == new_id for c in consultations)


def test_get_consultation_history(client):
    r = client.post('/api/patients', json={"name": "Paula"})
    pid = r.get_json()["patient_id"]
    cid = r.get_json()["first_consultation_id"]
    # Add a message into that consultation
    pdb.add_message_to_consultation_history(pid, cid, "user", "Oi")
    resp = client.get(f"/api/patients/{pid}/consultations/{cid}/history")
    assert resp.status_code == 200
    history = resp.get_json()["history"]
    assert len(history) >= 1


essential_keys = {"status", "patients"}

def test_get_all_patients(client):
    # Ensure at least one patient exists
    client.post('/api/patients', json={"name": "ListMe"})
    resp = client.get('/api/all-patients')
    assert resp.status_code == 200
    payload = resp.get_json()
    assert set(payload.keys()) >= essential_keys
    assert isinstance(payload["patients"], list)
