import os
import wave
import json
import audioop
import numpy as np
import speech_recognition as sr
from vosk import Model, KaldiRecognizer, SpkModel, SetLogLevel

# IMPORTAÇÃO DA INTEGRAÇÃO
try:
    from backend.processador_voz.processador_voz import TranscritorVoz
except ImportError:
    # Fallback para caso rode o script fora da estrutura de pacotes
    from processador_voz import TranscritorVoz

# --- CONFIGURAÇÃO DE TESTE ---
MODO_TESTE_SOZINHO = True


class Diarizador:
    """
    Integração: Vosk (Diarização) + TranscritorVoz (Google Speech).
    """

    def __init__(self, model_path, spk_model_path):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Modelo Texto não encontrado: {model_path}")
        if not os.path.exists(spk_model_path):
            raise FileNotFoundError(f"Modelo Falante não encontrado: {spk_model_path}")

        SetLogLevel(-1)  # Logs limpos

        print(f"[AUDIO_SERVICE] Carregando modelos IA (Logs ocultos)...")
        if MODO_TESTE_SOZINHO:
            print("⚠️ ATENÇÃO: MODO DE TESTE ATIVADO (ALTERNÂNCIA FORÇADA) ⚠️")

        self.model = Model(model_path)
        self.spk_model = SpkModel(spk_model_path)

        # INTEGRAÇÃO: Instancia o Transcritor reutilizável
        self.transcritor_google = TranscritorVoz(idioma="pt-BR")

    def _normalizar_audio(self, raw_frames, sampwidth):
        try:
            peak = audioop.max(raw_frames, sampwidth)
            if peak == 0: return raw_frames
            max_possible = 2 ** (8 * sampwidth - 1) - 1
            scale_factor = min(max_possible / peak, 5.0)
            return audioop.mul(raw_frames, sampwidth, scale_factor)
        except:
            return raw_frames

    def processar_audio(self, audio_path):
        try:
            wf = wave.open(audio_path, "rb")
        except wave.Error:
            raise ValueError("Arquivo WAV inválido.")

        # 1. Leitura
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        wf.close()

        # 2. Pré-processamento
        audio_mono = frames
        if n_channels > 1:
            audio_mono = audioop.tomono(frames, sampwidth, 1, 1)

        target_rate = 16000
        if framerate != target_rate:
            audio_mono, _ = audioop.ratecv(audio_mono, sampwidth, 1, framerate, target_rate, None)

        audio_mono = self._normalizar_audio(audio_mono, sampwidth)

        # 3. Extração Vosk (Segmentação)
        rec = KaldiRecognizer(self.model, target_rate, self.spk_model)
        rec.SetWords(True)

        raw_segments = []
        step = 4000
        for i in range(0, len(audio_mono), step):
            data = audio_mono[i:i + step]
            if rec.AcceptWaveform(data):
                res = json.loads(rec.Result())
                if 'spk' in res: raw_segments.append(res)

        res_final = json.loads(rec.FinalResult())
        if 'spk' in res_final: raw_segments.append(res_final)

        # 4. Fusão e Classificação
        merged_segments = self._mesclar_e_classificar(raw_segments)

        # 5. Transcrição Final (Usa a classe integrada)
        print(f"[AUDIO_SERVICE] Transcrevendo {len(merged_segments)} blocos via TranscritorVoz...")

        with open(audio_path, 'rb') as f:
            raw_wav_data = f.read()

        header_size = 44
        raw_pcm = raw_wav_data[header_size:]
        bytes_per_second = framerate * sampwidth * n_channels
        total_bytes = len(raw_pcm)

        final_dialogue = []

        for seg in merged_segments:
            padding = 0.4
            start_byte = int(max(0, seg['start'] - padding) * bytes_per_second)
            start_byte -= start_byte % (sampwidth * n_channels)

            end_byte = int((seg['end'] + padding) * bytes_per_second)
            end_byte -= end_byte % (sampwidth * n_channels)
            if end_byte > total_bytes: end_byte = total_bytes

            chunk_data = raw_pcm[start_byte:end_byte]

            if len(chunk_data) < 3200: continue

            # Cria objeto para o TranscritorVoz
            audio_chunk = sr.AudioData(chunk_data, framerate, sampwidth)

            # --- USO DA INTEGRAÇÃO ---
            # Chama a classe especializada em vez de fazer try/except aqui
            texto_google = self.transcritor_google.transcrever(audio_chunk)

            # Lógica de Fallback
            if texto_google:
                text_final = texto_google
            else:
                # Se Google falhou (retornou None), usa texto do Vosk acumulado
                text_final = seg.get('text_combined', '')

            if text_final and len(text_final.strip()) > 1:
                text_final = text_final[0].upper() + text_final[1:]

                final_dialogue.append({
                    "role": seg['role'],
                    "role_key": seg['role_key'],
                    "text": text_final,
                    "speaker_id": seg['speaker_id']
                })

        full_text = "\n".join([f"{d['role']}: {d['text']}" for d in final_dialogue])
        unique_ids = {d['speaker_id'] for d in final_dialogue}

        return {
            "full_text": full_text,
            "dialogue": final_dialogue,
            "speakers_count": len(unique_ids)
        }

    def _mesclar_e_classificar(self, raw_segments):
        """
        Lógica de fusão (Mantida igual, com suporte a Modo Teste)
        """
        if not raw_segments: return []

        merged = []

        first = raw_segments[0]
        current_block = {
            'start': first['result'][0]['start'],
            'end': first['result'][-1]['end'],
            'spk_vec': np.array(first['spk']),
            'count': 1,
            'text_combined': first.get('text', '')
        }

        # Configurações de Fusão
        MAX_SILENCE = 2.0
        SIMILARITY_THRESHOLD = 0.6

        for i in range(1, len(raw_segments)):
            next_raw = raw_segments[i]
            next_start = next_raw['result'][0]['start']
            next_end = next_raw['result'][-1]['end']
            next_vec = np.array(next_raw['spk'])

            silence = next_start - current_block['end']

            should_merge = False

            if MODO_TESTE_SOZINHO:
                # No modo teste, junta se for rápido (< 1.5s)
                if silence < 1.5:
                    should_merge = True
            else:
                # Modo Real: Verifica voz e silêncio
                avg_vec = current_block['spk_vec'] / current_block['count']
                dist = np.linalg.norm(avg_vec - next_vec)
                if silence < MAX_SILENCE and dist < SIMILARITY_THRESHOLD:
                    should_merge = True

            if should_merge:
                current_block['end'] = next_end
                current_block['spk_vec'] += next_vec
                current_block['count'] += 1
                current_block['text_combined'] += " " + next_raw.get('text', '')
            else:
                current_block['final_vec'] = current_block['spk_vec'] / current_block['count']
                merged.append(current_block)
                current_block = {
                    'start': next_start, 'end': next_end, 'spk_vec': next_vec,
                    'count': 1, 'text_combined': next_raw.get('text', '')
                }

        current_block['final_vec'] = current_block['spk_vec'] / current_block['count']
        merged.append(current_block)

        # --- CLASSIFICAÇÃO ---
        known_speakers = []
        GLOBAL_THRESHOLD = 0.75
        forced_id_counter = 0

        for block in merged:
            if MODO_TESTE_SOZINHO:
                speaker_id = forced_id_counter % 2
                forced_id_counter += 1
            else:
                vec = block['final_vec']
                best_idx = -1
                min_dist = float('inf')
                for idx, known_vec in enumerate(known_speakers):
                    dist = np.linalg.norm(vec - known_vec)
                    if dist < min_dist:
                        min_dist = dist
                        best_idx = idx

                if min_dist < GLOBAL_THRESHOLD and best_idx != -1:
                    speaker_id = best_idx
                    known_speakers[best_idx] = (known_speakers[best_idx] * 0.8) + (vec * 0.2)
                else:
                    known_speakers.append(vec)
                    speaker_id = len(known_speakers) - 1

            if speaker_id == 0:
                role, role_key = "Médico", "doctor"
            elif speaker_id == 1:
                role, role_key = "Paciente", "patient"
            else:
                role, role_key = "Outro", "other"

            block['role'] = role
            block['role_key'] = role_key
            block['speaker_id'] = speaker_id

        return merged