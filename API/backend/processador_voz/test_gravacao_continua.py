
import time
import wave
from io import BytesIO

import speech_recognition as sr
from pynput import keyboard

from processador_voz import TranscritorVoz

# --- Variáveis Globais e Controle do Teclado ---

# Flag para indicar se a gravação deve parar
parar_gravacao = False

def ao_pressionar(key):
    """Função callback que será chamada quando uma tecla for pressionada."""
    global parar_gravacao
    if key == keyboard.Key.esc:
        print("\n[SISTEMA] Tecla ESC pressionada. Parando a gravação...")
        parar_gravacao = True
        # Retorna False para parar o listener do teclado
        return False

# --- Função Principal de Teste ---

def testar_gravacao_e_transcricao_continua():
    """
    Captura áudio continuamente do microfone até que a tecla ESC seja pressionada,
    e então transcreve o áudio gravado.
    """
    # Inicia o listener do teclado em uma thread separada
    listener_teclado = keyboard.Listener(on_press=ao_pressionar)
    listener_teclado.start()

    reconhecedor = sr.Recognizer()
    microfone = sr.Microphone()
    transcritor = TranscritorVoz()

    print("\n=======================================================")
    print("  INICIANDO TESTE DE GRAVAÇÃO CONTÍNUA (até 1 min)")
    print("=======================================================")
    print("\n>>> Pressione a BARRA DE ESPAÇOS para parar. <<<")
    print(">>> FALANDO AGORA... <<<")

    with microfone as source:
        reconhecedor.adjust_for_ambient_noise(source)
        
        # Lista para armazenar os chunks de áudio
        frames = []
        
        # O stream do microfone fica aberto neste bloco
        # Acessamos o stream de baixo nível para ler em pedaços
        stream = source.stream

        # Loop de gravação
        while not parar_gravacao:
            # Lê um chunk de áudio do stream
            # O tamanho do chunk (1024) pode ser ajustado
            data = stream.read(1024)
            frames.append(data)

    print("[SISTEMA] Gravação encerrada.")
    
    # Garante que o listener do teclado parou
    listener_teclado.join()

    if not frames:
        print("[ERRO] Nenhum áudio foi gravado.")
        return

    print("[SISTEMA] Compilando áudio e enviando para transcrição...")

    # Converte os frames crus (bytes) em um objeto AudioData
    # Precisamos das informações de formato do próprio microfone
    audio_data = sr.AudioData(b"".join(frames), source.SAMPLE_RATE, source.SAMPLE_WIDTH)

    # Transcreve o áudio
    texto_transcrito = transcritor.transcrever(audio_data)

    # Imprime o resultado
    print("\n----------------- RESULTADO -----------------")
    print(f"Texto Transcrito: '{texto_transcrito}'")
    print("-------------------------------------------")

    # Verificação básica do resultado
    if texto_transcrito and "erro" not in texto_transcrito.lower():
        print("\n[SUCESSO] O teste foi concluído e o áudio foi transcrito.")
    else:
        print("\n[FALHA] O áudio não pôde ser transcrito ou ocorreu um erro.")

if __name__ == '__main__':
    testar_gravacao_e_transcricao_continua()
