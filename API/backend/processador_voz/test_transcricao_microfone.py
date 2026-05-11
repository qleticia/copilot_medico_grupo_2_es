import unittest
import time
import speech_recognition as sr

# Importa as classes que queremos testar
try:
    from processador_voz import CapturaAudio, TranscritorVoz
except ImportError:
    print("ERRO: Não foi possível encontrar as classes 'CapturaAudio' e 'TranscritorVoz'.")
    print("Certifique-se de que o arquivo 'processador_voz.py' está no mesmo diretório.")
    exit(1)


class TestarTranscricaoMicrofone(unittest.TestCase):
    """
    Classe de teste de integração para o fluxo completo:
    Captura de áudio + Transcrição.

    ATENÇÃO: Este é um teste manual que acessa o microfone
    e a internet (API do Google).
    """

    def setUp(self):
        """
        Este método é executado antes do teste.
        Instancia os componentes necessários.
        """
        print("\n--- Configurando Capturador e Transcritor ---")
        try:
            self.capturador = CapturaAudio()
            # Instancia o transcritor (usará 'pt-BR' por padrão)
            self.transcritor = TranscritorVoz()

            # Ajusta o capturador ao ruído ambiente
            self.capturador.iniciar_escuta()
            print("Ambiente pronto. Capturador ajustado ao ruído.")
        except Exception as e:
            self.fail(f"Falha ao inicializar os componentes: {e}")

    def test_capturar_e_transcrever_fala(self):
        """
        Testa o fluxo completo de escutar() -> transcrever().
        Exige que o usuário fale no microfone.

        *** ATENÇÃO: TESTE MANUAL ***
        """
        print("\n--- INICIANDO TESTE: test_capturar_e_transcrever_fala ---")
        print(f"\n>>> POR FAVOR, FALE UMA FRASE EM PORTUGUÊS <<<")
        print("(O teste começará a ouvir em 1 segundo...)")
        time.sleep(1)

        # 1. Capturar o áudio
        print(">>> OUVINDO... (fale e depois faça uma pausa)")
        audio_data = self.capturador.escutar_usuario()
        print(">>> CAPTURA CONCLUÍDA. Enviando para transcrição...")

        # Verifica se a captura funcionou
        self.assertIsNotNone(audio_data, "Falha na captura (retornou None). O microfone está funcionando?")

        # 2. Transcrever o áudio
        texto_transcrito = self.transcritor.transcrever(audio_data)

        # 3. Imprimir o resultado no terminal
        print("\n===========================================")
        print(f"  TEXTO TRANSCRITO: '{texto_transcrito}'")
        print("===========================================")

        # 4. Verificar o sucesso
        # O teste passa se o texto não for uma das mensagens de erro conhecidas
        self.assertNotIn(
            "Não foi possível entender o áudio",
            texto_transcrito,
            "A API não conseguiu entender a fala."
        )
        self.assertNotIn(
            "Erro na API de reconhecimento de fala",
            texto_transcrito,
            "Houve um erro de conexão com a API do Google (está conectado à internet?)."
        )
        self.assertGreater(
            len(texto_transcrito),
            0,
            "A transcrição retornou uma string vazia."
        )

        print("\n[SUCESSO] O áudio foi capturado e transcrito.")

    def tearDown(self):
        """
        Limpeza após o teste.
        """
        print("--- Teste concluído ---")
        self.capturador = None
        self.transcritor = None


if __name__ == '__main__':
    """
    Permite que o script seja executado diretamente.
    """
    print("Iniciando suíte de testes de integração (Captura + Transcrição)...")
    print("================================================================")
    unittest.main()
