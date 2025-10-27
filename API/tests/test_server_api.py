import io
import json
from backend import patient_db as pdb


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
