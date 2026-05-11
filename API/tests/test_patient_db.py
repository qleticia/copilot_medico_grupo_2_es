import json
import re
from ..backend import patient_db as pdb

def test_load_database_empty_when_missing(temp_db_file):
    data = pdb.load_database()
    assert data == {}


def test_save_and_load_database(temp_db_file):
    sample = {"abc": {"name": "John", "consultations": []}}
    pdb.save_database(sample)
    loaded = pdb.load_database()
    assert loaded == sample


def test_generate_patient_id_unique():
    id1 = pdb.generate_patient_id()
    id2 = pdb.generate_patient_id()
    assert id1 != id2
    # UUID v4 format check (basic)
    assert re.match(r"^[0-9a-f\-]{36}$", id1)


def test_ensure_patient_exists_and_update_name(temp_db_file):
    pid = pdb.generate_patient_id()
    # Create with fallback name
    pdata = pdb.ensure_patient_exists(pid)
    assert pdata["name"] == "Desconhecido"
    # Update name when previously unknown
    pdata2 = pdb.ensure_patient_exists(pid, name="Maria")
    assert pdata2["name"] == "Maria"
    # Ensure persisted
    db = pdb.load_database()
    assert db[pid]["name"] == "Maria"


def test_add_consultation_and_list(temp_db_file):
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid, name="Joao")
    cid = pdb.add_consultation_to_patient(pid, "Primeira Consulta")
    assert cid
    consultations = pdb.get_patient_consultations(pid)
    assert isinstance(consultations, list) and len(consultations) == 1
    assert consultations[0]["id"] == cid


def test_add_message_to_consultation_history_and_get(temp_db_file):
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid)
    cid = pdb.add_consultation_to_patient(pid, "C1")
    pdb.add_message_to_consultation_history(pid, cid, "user", "Ola")
    pdb.add_message_to_consultation_history(pid, cid, "model", "Oi, tudo bem?")
    history = pdb.get_consultation_chat_history(pid, cid)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[0]["parts"][0]["text"] == "Ola"


def test_legacy_patient_chat_history_starts_empty(temp_db_file):
    pid = pdb.generate_patient_id()
    pdb.ensure_patient_exists(pid)
    hist = pdb.get_patient_chat_history(pid)
    assert hist == []


def test_add_message_to_history_legacy_creates_structure(temp_db_file):
    pid = pdb.generate_patient_id()
    pdb.add_message_to_history(pid, "user", "hello")
    db = pdb.load_database()
    assert pid in db
    assert db[pid]["chat_history"][0]["parts"][0]["text"] == "hello"
