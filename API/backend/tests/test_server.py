import sys
import os

# Caminho 1: Localiza o diretório do script de teste (tests/)
current_dir = os.path.dirname(os.path.abspath(__file__)) 
# Caminho 2: Sobe um nível (para 'backend/')
parent_dir = os.path.dirname(current_dir)
# Caminho 3: Sobe mais um nível (para 'API/', onde server.py está)
grandparent_dir = os.path.dirname(parent_dir) 
# Adiciona o diretório 'API/' ao sys.path para que 'from server import app' funcione
sys.path.insert(0, parent_dir)
sys.path.insert(0, grandparent_dir)

import unittest
from unittest.mock import patch, MagicMock
from server import app # Importa a instância do Flask

class TestPatientCreation(unittest.TestCase):

    # RED -> /patients
    def setUp(self):
        # Cria um cliente de teste para simular requisições HTTP
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    @patch('server.generate_patient_id', return_value="NEW_TEST_ID_001")
    @patch('server.add_consultation_to_patient', return_value="CONSULTA_ID_001")
    @patch('server.ensure_patient_exists')
    def test_create_patient_success(self, mock_ensure_exists, mock_add_consultation, mock_generate_id):
        """Testa se a criação de um paciente retorna 201 e dados corretos."""
        
        # Simula o retorno de ensure_patient_exists (dados criados)
        mock_ensure_exists.return_value = {"name": "Novo Paciente", "chat_history": []}

        # Dados que seriam enviados na requisição POST
        data = {"name": "Novo Paciente"}

        # Realiza a requisição
        response = self.app.post('/api/patients', json=data)

        # LINHA CRÍTICA (RED): Verifica se o status HTTP é 201 (Created)
        self.assertEqual(response.status_code, 201, "Deve retornar 201 ao criar paciente")
        
        # Valida se as funções de persistência foram chamadas
        mock_generate_id.assert_called_once()
        mock_ensure_exists.assert_called_once_with("NEW_TEST_ID_001", name="Novo Paciente")
        mock_add_consultation.assert_called_once_with("NEW_TEST_ID_001", "Primeira Consulta")

        # Valida o corpo da resposta
        response_data = response.get_json()
        self.assertEqual(response_data['patient_id'], "NEW_TEST_ID_001")
        self.assertEqual(response_data['first_consultation_id'], "CONSULTA_ID_001")

    # RED -> /patient-exists
    @patch('server.get_patient_data')
    def test_check_patient_exists_found(self, mock_get_patient_data):
        """Testa a existência de um ID que está no DB."""
        # Simula que a função de DB retorna dados (paciente existe)
        mock_get_patient_data.return_value = {"name": "Existente"} 
        
        # A rota espera o ID como argumento de caminho (definido como /api/patient-exists/<patient_id>)
        # Assumindo que a rota está corretamente mapeada no server.py para receber o ID
        
        response = self.app.get('/api/patient-exists/existing_id')

        # LINHA CRÍTICA (RED - Sucesso): Espera-se 200 e confirmação 'exists': true
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()['exists'])
        mock_get_patient_data.assert_called_once_with('existing_id')

    @patch('patient_db.get_patient_data')
    def test_check_patient_exists_not_found(self, mock_get_patient_data):
        """Testa a existência de um ID que NÃO está no DB."""
        # Simula que a função de DB retorna None (paciente não existe)
        mock_get_patient_data.return_value = None 
        
        response = self.app.get('/api/patient-exists/non_existing_id')

        # LINHA CRÍTICA (RED - Falha): Espera-se 200, mas com 'exists': false
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()['exists'])