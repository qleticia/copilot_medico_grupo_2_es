
import pika
import json
import speech_recognition as sr
import io
import wave
import os
from .processador_voz.processador_voz import TranscritorVoz

# --- Configuração do RabbitMQ ---
# Usaremos variáveis de ambiente para flexibilidade, com um fallback para localhost
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
QUEUE_NAME = 'audio_chunks_queue'

# --- Configuração do Transcritor ---
# A classe TranscritorVoz permanece a mesma do desenvolvimento anterior
transcritor = TranscritorVoz()

def processar_e_transcrever(audio_bytes):
    """
    Converte os bytes de áudio recebidos para o formato AudioData e transcreve.
    Esta função assume que o áudio está em formato WAV cru.
    """
    # A biblioteca SpeechRecognition espera um objeto AudioData.
    # Precisamos converter os bytes crus para este formato.
    # O frontend (extensão Chrome) deve enviar o áudio com estas especificações.
    SAMPLE_RATE = 16000  # 16kHz
    SAMPLE_WIDTH = 2     # 16-bit (2 bytes)

    try:
        # Cria um arquivo WAV em memória para facilitar a leitura pela biblioteca
        with io.BytesIO() as wav_io:
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(SAMPLE_WIDTH)
                wav_file.setframerate(SAMPLE_RATE)
                wav_file.writeframes(audio_bytes)
            
            wav_io.seek(0)  # Volta para o início do buffer

            with sr.AudioFile(wav_io) as source:
                audio_data = sr.Recognizer().record(source)
                
        # Agora, transcrevemos o AudioData
        texto = transcritor.transcrever(audio_data)
        
        # Imprime apenas se houver texto e não for uma mensagem de erro
        if texto and "não foi possível" not in texto.lower() and "erro na api" not in texto.lower():
            print(f" [<-] Texto Transcrito: '{texto}'")
        
        # Aqui, no futuro, o texto seria salvo no banco de dados, enviado para o LLM, etc.

    except sr.UnknownValueError:
        # Isso é comum quando há silêncio, então não tratamos como um erro crítico.
        print(" [i] Não foi possível entender o áudio (provavelmente silêncio).")
    except Exception as e:
        print(f" [!] Erro ao processar o áudio: {e}")


def main():
    """
    Função principal que conecta ao RabbitMQ e consome mensagens.
    """
    print("Iniciando worker...")
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    except pika.exceptions.AMQPConnectionError:
        print(f" [!] Falha ao conectar ao RabbitMQ em '{RABBITMQ_HOST}'.")
        print("     Certifique-se de que o RabbitMQ está rodando (ex: via Docker).")
        return

    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    print(f" [*] Worker aguardando por chunks de áudio na fila '{QUEUE_NAME}'. Para sair, pressione CTRL+C")

    def callback(ch, method, properties, body):
        # O corpo da mensagem são os bytes do áudio
        processar_e_transcrever(body)
        
        # Confirma que a mensagem foi processada com sucesso.
        ch.basic_ack(delivery_tag=method.delivery_tag)

    # `prefetch_count=1` garante que o worker só pegue uma nova mensagem 
    # após ter processado e confirmado a anterior. Isso evita sobrecarga.
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print('Interrompido pelo usuário.')
    finally:
        connection.close()
        print("Conexão com RabbitMQ fechada.")


if __name__ == '__main__':
    main()
