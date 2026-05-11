import sounddevice as sd
import numpy as np
from vosk import Model, KaldiRecognizer
import json
import os
import queue

class Gravador:
    """
    Classe responsável por capturar áudio do microfone.
    """
    def __init__(self, samplerate=16000, channels=1, dtype='int16'):
        self.samplerate = samplerate
        self.channels = channels
        self.dtype = dtype
        self.q = queue.Queue()

    def _callback(self, indata, frames, time, status):
        """Esta função é chamada pelo sounddevice para cada bloco de áudio."""
        if status:
            print(status, flush=True)
        self.q.put(indata.copy())

    def gravar(self, duracao_segundos=5):
        """
        Grava áudio do microfone pela duração especificada.
        
        Args:
            duracao_segundos (int): Duração da gravação em segundos.
            
        Returns:
            np.ndarray: Os dados do áudio gravado como um array numpy.
        """
        self.q = queue.Queue() # Limpa a fila para uma nova gravação
        print(f"Gravando por {duracao_segundos} segundos...")

        with sd.InputStream(samplerate=self.samplerate, channels=self.channels, dtype=self.dtype, callback=self._callback):
            sd.sleep(duracao_segundos * 1000)

        print("Gravação finalizada.")
        
        # Concatena os blocos de áudio da fila
        gravacao = np.concatenate(list(self.q.queue))
        return gravacao

class TranscritorVosk:
    """
    Classe responsável por transcrever dados de áudio usando um modelo Vosk local.
    """
    def __init__(self, model_path=None):
        if model_path is None:
            # Constrói o caminho para o modelo relativo à localização do script
            script_dir = os.path.dirname(__file__)
            model_path = os.path.join(script_dir, "vosk-model-small-pt-0.3")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"A pasta do modelo Vosk não foi encontrada em '{model_path}'. "
                                    "Certifique-se de que o modelo foi baixado e está no local correto.")
        
        print("Carregando modelo Vosk... (isso pode levar alguns segundos)")
        self.model = Model(model_path)
        print("Modelo Vosk carregado.")

    def transcrever(self, audio_data, samplerate=16000):
        """
        Transcreve um array numpy de áudio para texto.
        
        Args:
            audio_data (np.ndarray): O áudio a ser transcrito.
            samplerate (int): A taxa de amostragem do áudio.
            
        Returns:
            str: O texto transcrito.
        """
        rec = KaldiRecognizer(self.model, samplerate)
        
        # Converte o array numpy para bytes, que é o que o Vosk espera
        audio_bytes = audio_data.tobytes()

        if rec.AcceptWaveform(audio_bytes):
            result = rec.Result()
        else:
            result = rec.FinalResult()
            
        return json.loads(result).get('text', '')

def main():
    """
    Função principal para orquestrar a gravação e transcrição.
    """
    try:
        # 1. Instancia os componentes
        gravador = Gravador()
        transcritor = TranscritorVosk() # O modelo é carregado aqui, uma única vez.

        # 2. Grava o áudio
        audio_gravado = gravador.gravar(duracao_segundos=5)
        
        # 3. Transcreve o áudio
        print("\nIniciando transcrição...")
        texto_transcrito = transcritor.transcrever(audio_gravado)
        
        # 4. Mostra o resultado
        print("\n===================================")
        print(f"  Texto Transcrito: {texto_transcrito}")
        print("===================================")

    except FileNotFoundError as e:
        print(f"\n[ERRO] {e}")
    except Exception as e:
        print(f"\n[ERRO INESPERADO] Ocorreu um erro: {e}")

if __name__ == '__main__':
    main()
