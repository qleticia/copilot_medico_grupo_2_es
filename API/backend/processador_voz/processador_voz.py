import speech_recognition as sr
import re

class CapturaAudio:
    """
    Classe responsável por capturar o áudio do microfone em tempo real.
    """
    def __init__(self):
        self.reconhecedor = sr.Recognizer()
        self.microfone = sr.Microphone()/
        self.reconhecedor.pause_threshold = 0.8
        self.reconhecedor.dynamic_energy_threshold = True

    def iniciar_escuta(self):
        """Ajusta o reconhecedor para o ruído ambiente e inicia a escuta."""
        with self.microfone as source:
            self.reconhecedor.adjust_for_ambient_noise(source)
        print("Módulo de áudio iniciado. Aguardando paciente...")

    def escutar_usuario(self):
        """
        Captura o áudio do microfone e o retorna como um objeto AudioData.
        Retorna None se houver erro na captura.
        """
        try:
            with self.microfone as source:
                audio = self.reconhecedor.listen(source)
                return audio
        except sr.UnknownValueError:
            print("Não foi possível entender o áudio.")
            return None
        except sr.RequestError as e:
            print(f"Erro ao solicitar resultados do serviço de reconhecimento de fala; {e}")
            return None
        except Exception as e:
            print(f"Ocorreu um erro inesperado na captura de áudio: {e}")
            return None

class TranscritorVoz:
    """
    Classe responsável por transcrever o áudio capturado para texto.
    """
    def __init__(self, idioma="pt-BR"):
        self.reconhecedor = sr.Recognizer()
        self.idioma = idioma

    def transcrever(self, audio_data):
        """
        Transcreve o objeto AudioData para texto utilizando a API de reconhecimento de fala do Google.

        Args:
            audio_data (sr.AudioData): O áudio a ser transcrito.

        Returns:
            str: O texto transcrito ou uma string vazia em caso de falha.
        """
        if not isinstance(audio_data, sr.AudioData):
            raise ValueError("O dado de entrada deve ser um objeto AudioData.")

        try:
            texto = self.reconhecedor.recognize_google(audio_data, language=self.idioma)
            return texto
        except sr.UnknownValueError:
            return "Não foi possível entender o áudio."
        except sr.RequestError as e:
            return f"Erro na API de reconhecimento de fala: {e}"
        except Exception as e:
            return f"Ocorreu um erro inesperado na transcrição: {e}"

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
        """Adiciona o texto transcrito ao histórico da conversa."""
        self.historico_conversa.append(texto)

    def construir_contexto(self, texto_recente):
        """
        Constrói o contexto para o LLM a partir do histórico da conversa e do texto mais recente.
        Este método pode ser expandido para incluir extração de entidades, resumo, etc.

        Args:
            texto_recente (str): O último texto transcrito.

        Returns:
            dict: Um dicionário contendo o contexto estruturado.
        """
        self.adicionar_ao_historico(texto_recente)

        contexto = {
            "paciente": {
                "id": self.id_paciente,
                "nome": self.nome_paciente
            },
            "transcricao_recente": texto_recente,
            "historico_completo": " ".join(self.historico_conversa),
            "palavras_chave": self._extrair_palavras_chave(texto_recente)
        }
        return contexto

    def _extrair_palavras_chave(self, texto):
        """
        Um método simples para extrair palavras-chave (pode ser substituído por uma abordagem mais sofisticada com NLP).
        """
        palavras = re.findall(r'\b\w+\b', texto.lower())
        # Exemplo simplista: remove stop words comuns e retorna palavras com mais de 4 caracteres
        stop_words = set(["a", "o", "e", "é", "de", "do", "da", "para", "com", "em", "um", "uma"])
        return [palavra for palavra in palavras if palavra not in stop_words and len(palavra) > 4]

