import unittest
import speech_recognition as sr
import time

# Importa a classe que será testada (tenta diferentes caminhos para suportar execuções variadas)
try:
    from .processador_voz import CapturaAudio  # quando executado como pacote
except Exception:
    try:
        from backend.processador_voz.processador_voz import CapturaAudio  # quando executado a partir da raiz do projeto
    except Exception:
        from processador_voz import CapturaAudio  # fallback quando executado dentro da pasta


class TestarCapturaAudio(unittest.TestCase):
    """
    Classe de teste para a CapturaAudio.

    ATENÇÃO: Este é um conjunto de testes manuais/integração.
    Ele acessará seu hardware de microfone e exigirá que você fale.
    """

    def setUp(self):
        """
        Este método é executado antes de cada teste.
        Ele instancia o capturador e ajusta para o ruído ambiente.
        """
        print("\n--- Configurando o ambiente de teste ---")
        try:
            self.capturador = CapturaAudio()
            self.capturador.iniciar_escuta()
            print("Capturador iniciado e ajustado ao ruído ambiente.")
        except Exception as e:
            self.fail(f"Falha ao inicializar o CapturaAudio: {e}")

    def test_escutar_usuario_retorna_audio_data(self):
        """
        Testa o método escutar_usuario() para verificar se ele captura
        e retorna um objeto do tipo AudioData.

        *** ATENÇÃO: TESTE MANUAL ***
        """
        print("\n--- INICIANDO TESTE: test_escutar_usuario_retorna_audio_data ---")
        print(f"\n>>> POR FAVOR, FALE ALGO NO MICROFONE AGORA <<<")
        print("(O teste começará a ouvir em 1 segundo...)")
        time.sleep(1)

        # Chama o método que queremos testar
        # O método listen() bloqueará até que você pare de falar
        print(">>> OUVINDO... (fale e depois faça uma pausa)")
        audio_data = self.capturador.escutar_usuario()
        print(">>> CAPTURA CONCLUÍDA. Verificando dados...")

        # 1. Verificação principal: O objeto não deve ser Nulo
        self.assertIsNotNone(audio_data, "A captura de áudio falhou e retornou None. Você realmente falou algo?")

        # 2. Verificação de Tipo: O objeto deve ser do tipo AudioData
        self.assertIsInstance(audio_data, sr.AudioData,
                              f"O objeto retornado não é do tipo 'AudioData', mas sim '{type(audio_data)}'")

        # Se chegarmos aqui, o teste passou
        print("\n[SUCESSO] O método retornou um objeto AudioData válido.")
        print(f"  - Taxa de Amostragem: {audio_data.sample_rate} Hz")
        print(f"  - Largura da Amostra: {audio_data.sample_width} bytes")

    def tearDown(self):
        """
        Este método é executado após cada teste (para limpeza).
        """
        print("--- Teste concluído ---")
        self.capturador = None


if __name__ == '__main__':
    """
    Permite que o script seja executado diretamente.
    """
    print("Iniciando suíte de testes para CapturaAudio...")
    print("==================================================")
    unittest.main()