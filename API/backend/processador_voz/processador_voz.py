import speech_recognition as sr
import re

class CapturaAudio:
    """
     Esta classe serve apenas para captura local (microfone do servidor).

    """
    def __init__(self):
        self.reconhecedor = sr.Recognizer()
        self.microfone = sr.Microphone()

    def escutar_usuario(self):
        try:
            with self.microfone as source:
                self.reconhecedor.adjust_for_ambient_noise(source)
                print("Escutando microfone local...")
                return self.reconhecedor.listen(source)
        except Exception as e:
            print(f"Erro no mic local: {e}")
            return None

class TranscritorVoz:
    """
    Classe reutilizável para transcrever áudio usando Google Speech Recognition.
    """
    def __init__(self, idioma="pt-BR"):
        self.reconhecedor = sr.Recognizer()
        self.idioma = idioma

    def transcrever(self, audio_data):
        """
        Transcreve AudioData para texto.
        Retorna string com erro se falhar, para logs visuais.
        """
        if not isinstance(audio_data, sr.AudioData):
            return "Erro: Dados de áudio inválidos."

        try:
            texto = self.reconhecedor.recognize_google(audio_data, language=self.idioma)
            return texto
        except sr.UnknownValueError:
            return None # Retorna None para facilitar fallback
        except sr.RequestError as e:
            print(f"Erro na API Google: {e}")
            return None
        except Exception as e:
            print(f"Erro inesperado na transcrição: {e}")
            return None

class ConstrutorContexto:
    """
    Classe responsável por construir um contexto a partir do texto transcrito
    para ser processado por um LLM.
    """
    def __init__(self, id_paciente, nome_paciente):
        self.id_paciente = id_paciente
        self.nome_paciente = nome_paciente
        self.historico_conversa = []

    def adicionar_ao_historico(self, texto):
        self.historico_conversa.append(texto)

    def construir_contexto(self, texto_recente):
        self.adicionar_ao_historico(texto_recente)
        return {
            "paciente": {"id": self.id_paciente, "nome": self.nome_paciente},
            "transcricao_recente": texto_recente,
            "historico_completo": " ".join(self.historico_conversa),
            "palavras_chave": self._extrair_palavras_chave(texto_recente)
        }

    def _extrair_palavras_chave(self, texto):
        stop_words = set(["a", "o", "e", "é", "de", "do", "da", "para", "com", "em", "um", "uma", "que"])
        palavras = re.findall(r'\b\w+\b', texto.lower())
        return [p for p in palavras if p not in stop_words and len(p) > 4]
