import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, FileText, Loader2, Mic2, Plus, RefreshCcw, Search, UserRound } from 'lucide-react';
import { API_URL, getPatientConsultations, getPatientExtensionData } from '../api';

function PatientsPage({ token, patients, loading, error, onRefresh, onCreatePatient }) {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [consultationsState, setConsultationsState] = useState({ loading: false, error: '' });
  const [extensionItems, setExtensionItems] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [extensionState, setExtensionState] = useState({ loading: false, error: '' });
  const [patientRefreshKey, setPatientRefreshKey] = useState(0);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) => {
      return patient.name.toLowerCase().includes(term) || patient.id.toLowerCase().includes(term);
    });
  }, [patients, search]);

  useEffect(() => {
    if (!selectedPatient && patients.length > 0) {
      setSelectedPatient(patients[0]);
    }
  }, [patients, selectedPatient]);

  useEffect(() => {
    if (!selectedPatient) {
      setConsultations([]);
      return;
    }

    let ignore = false;
    async function loadConsultations() {
      setConsultationsState({ loading: true, error: '' });
      try {
        const data = await getPatientConsultations(token, selectedPatient.id);
        if (!ignore) {
          setConsultations(data.consultations || []);
          setConsultationsState({ loading: false, error: '' });
        }
      } catch (err) {
        if (!ignore) {
          setConsultations([]);
          setConsultationsState({ loading: false, error: err.message });
        }
      }
    }

    loadConsultations();
    return () => {
      ignore = true;
    };
  }, [selectedPatient, token, patientRefreshKey]);

  useEffect(() => {
    if (!selectedPatient) {
      setExtensionItems([]);
      setTranscriptions([]);
      return;
    }

    let ignore = false;
    async function loadExtensionData() {
      setExtensionState({ loading: true, error: '' });
      try {
        const data = await getPatientExtensionData(token, selectedPatient.id);
        if (!ignore && data.patient_id === selectedPatient.id) {
          setExtensionItems(Array.isArray(data.extension_data) ? data.extension_data : []);
          setTranscriptions(Array.isArray(data.transcriptions) ? data.transcriptions : []);
          setExtensionState({ loading: false, error: '' });
        } else if (!ignore) {
          setExtensionItems([]);
          setTranscriptions([]);
          setExtensionState({ loading: false, error: 'A API retornou dados de outro paciente.' });
        }
      } catch (err) {
        if (!ignore) {
          setExtensionItems([]);
          setTranscriptions([]);
          setExtensionState({ loading: false, error: err.message });
        }
      }
    }

    loadExtensionData();
    return () => {
      ignore = true;
    };
  }, [selectedPatient, token, patientRefreshKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    const name = newPatientName.trim();
    if (!name) return;

    setSaving(true);
    try {
      await onCreatePatient({ name });
      setNewPatientName('');
    } catch (err) {
      window.alert(err.message || 'Erro ao cadastrar paciente.');
    } finally {
      setSaving(false);
    }
  }

  function handleRefreshPatientData() {
    setPatientRefreshKey((current) => current + 1);
  }

  return (
    <section className="patients-grid">
      <div className="panel list-panel">
        <div className="panel-heading">
          <div>
            <h2>Pacientes</h2>
            <p>Acompanhe seus pacientes com mais praticidade.</p>
          </div>
          <button className="icon-button" type="button" onClick={onRefresh} title="Atualizar lista">
            <RefreshCcw size={18} />
          </button>
        </div>

        <form className="create-patient-form" onSubmit={handleSubmit}>
          <div className="input-icon">
            <Plus size={18} />
            <input
              value={newPatientName}
              onChange={(event) => setNewPatientName(event.target.value)}
              placeholder="Nome do novo paciente"
            />
          </div>
          <button className="primary-button compact" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="input-icon search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou ID"
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="patients-list">
          {loading && (
            <div className="empty-state">
              <Loader2 className="spin" size={22} />
              <span>Carregando pacientes...</span>
            </div>
          )}

          {!loading && filteredPatients.length === 0 && (
            <div className="empty-state">
              <UserRound size={22} />
              <span>Nenhum paciente encontrado.</span>
            </div>
          )}

          {!loading && filteredPatients.map((patient) => (
            <button
              key={patient.id}
              className={selectedPatient?.id === patient.id ? 'patient-row selected' : 'patient-row'}
              type="button"
              onClick={() => setSelectedPatient(patient)}
            >
              <span className="avatar">{patient.name.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{patient.name}</strong>
                <small>{patient.id}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel detail-panel">
        {selectedPatient ? (
          <>
            <div className="detail-header">
              <span className="avatar large">{selectedPatient.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="eyebrow">Paciente selecionado</p>
                <h2>{selectedPatient.name}</h2>
                <code>{selectedPatient.id}</code>
              </div>
              <button
                className="icon-button detail-refresh-button"
                type="button"
                onClick={handleRefreshPatientData}
                title="Atualizar dados do paciente"
                disabled={consultationsState.loading || extensionState.loading}
              >
                <RefreshCcw size={18} />
              </button>
            </div>

            <div className="info-strip">
              <div>
                <span>Cadastro</span>
                <strong>Acompanhamento clínico</strong>
              </div>
              <div>
                <span>Consultas</span>
                <strong>{consultationsState.loading ? '...' : consultations.length}</strong>
              </div>
              <div>
                <span>Dados da extensão</span>
                <strong>{extensionState.loading ? '...' : extensionItems.length}</strong>
              </div>
              <div>
                <span>Transcrições</span>
                <strong>{extensionState.loading ? '...' : transcriptions.length}</strong>
              </div>
            </div>

            <section className="detail-section">
              <div className="section-heading">
                <CalendarClock size={19} />
                <h3>Atendimentos do paciente</h3>
              </div>

              {consultationsState.error && <div className="alert alert-error">{consultationsState.error}</div>}

              {consultationsState.loading && (
                <div className="empty-state">
                  <Loader2 className="spin" size={22} />
                  <span>Carregando atendimentos...</span>
                </div>
              )}

              {!consultationsState.loading && consultations.length === 0 && (
                <div className="empty-state">
                  <CalendarClock size={22} />
                  <span>Nenhum atendimento encontrado para este paciente.</span>
                </div>
              )}

              {!consultationsState.loading && consultations.length > 0 && (
                <div className="consultation-list">
                  {consultations.map((consultation) => (
                    <article key={consultation.id} className="consultation-item">
                      <div>
                        <strong>{consultation.title || 'Consulta sem título'}</strong>
                        <small>{formatDate(consultation.date)}</small>
                      </div>
                      <code>{consultation.id}</code>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section">
              <div className="section-heading">
                <ClipboardList size={19} />
                <h3>Dados importados da extensão</h3>
              </div>

              {extensionState.error && <div className="alert alert-error">{extensionState.error}</div>}

              {extensionState.loading && (
                <div className="empty-state">
                  <Loader2 className="spin" size={22} />
                  <span>Carregando dados da extensão...</span>
                </div>
              )}

              {!extensionState.loading && extensionItems.length === 0 && (
                <div className="empty-state">
                  <ClipboardList size={22} />
                  <span>Nenhum dado importado da extensão para este paciente.</span>
                </div>
              )}

              {!extensionState.loading && extensionItems.length > 0 && (
                <div className="extension-list">
                  {extensionItems.map((item, index) => (
                    <article key={item.id || `${item.created_at || 'extension'}-${index}`} className="extension-card">
                      <div className="extension-card-header">
                        <div>
                          <strong>Registro importado</strong>
                          <small>{formatDate(item.created_at || item.timestamp)}</small>
                        </div>
                        <span className="source-pill">Origem: extensão</span>
                      </div>
                      {item.consultation_id && (
                        <div className="metadata-row">
                          <span>Atendimento</span>
                          <code>{item.consultation_id}</code>
                        </div>
                      )}
                      {item.source_url && (
                        <div className="metadata-row">
                          <span>Fonte</span>
                          <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_url}</a>
                        </div>
                      )}
                      <div className="structured-content">
                        {renderExtensionContent(item.content)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section">
              <div className="section-heading">
                <Mic2 size={19} />
                <h3>Áudios e transcrições</h3>
              </div>

              {extensionState.loading && (
                <div className="empty-state">
                  <Loader2 className="spin" size={22} />
                  <span>Carregando transcrições...</span>
                </div>
              )}

              {!extensionState.loading && transcriptions.length === 0 && (
                <div className="empty-state">
                  <FileText size={22} />
                  <span>Nenhuma transcrição disponível para este paciente.</span>
                </div>
              )}

              {!extensionState.loading && transcriptions.length > 0 && (
                <div className="extension-list">
                  {transcriptions.map((transcription, index) => {
                    const audioSrc = getAudioSource(transcription.audio);
                    return (
                      <article key={transcription.id || `${transcription.created_at || 'transcription'}-${index}`} className="extension-card">
                        <div className="extension-card-header">
                          <div>
                            <strong>Transcrição da extensão</strong>
                            <small>{formatDate(transcription.created_at || transcription.timestamp)}</small>
                          </div>
                          <span className="source-pill">Origem: {formatSource(transcription.source)}</span>
                        </div>

                        {audioSrc && (
                          <audio className="audio-player" controls src={audioSrc}>
                            Seu navegador não suporta reprodução de áudio.
                          </audio>
                        )}

                        {renderAudioMetadata(transcription.audio, transcription.duration)}

                        {transcription.dialogue?.length > 0 ? (
                          <div className="dialogue-list">
                            {transcription.dialogue.map((line, lineIndex) => (
                              <div key={`${line.speaker || 'fala'}-${lineIndex}`} className="dialogue-line">
                                <strong>{line.speaker || line.role || 'Fala'}</strong>
                                <p>{line.text || line.content || '-'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="transcription-text">{transcription.text || 'Transcrição sem texto informado.'}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state tall">
            <UserRound size={26} />
            <span>Selecione ou cadastre um paciente para visualizar o prontuário inicial.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function renderExtensionContent(content) {
  if (Array.isArray(content)) {
    if (content.length === 0) return <p className="muted">Nenhum conteúdo estruturado informado.</p>;

    return content.map((item, index) => {
      if (item && typeof item === 'object') {
        const label = item.role || item.label || item.key || item.campo || `Item ${index + 1}`;
        const value = item.text || item.value || item.valor || item.content || JSON.stringify(item);
        return (
          <div key={`${label}-${index}`} className="content-row">
            <span>{label}</span>
            <strong>{String(value)}</strong>
          </div>
        );
      }

      return <p key={`content-${index}`}>{String(item)}</p>;
    });
  }

  if (content && typeof content === 'object') {
    const entries = Object.entries(content);
    if (entries.length === 0) return <p className="muted">Nenhum conteúdo estruturado informado.</p>;

    return entries.map(([key, value]) => (
      <div key={key} className="content-row">
        <span>{formatLabel(key)}</span>
        <strong>{formatValue(value)}</strong>
      </div>
    ));
  }

  return <p>{content ? String(content) : 'Nenhum conteúdo estruturado informado.'}</p>;
}

function renderAudioMetadata(audio, duration) {
  const metadata = audio && typeof audio === 'object' ? audio : {};
  const entries = Object.entries(metadata).filter(([key, value]) => (
    value !== null && value !== undefined && value !== '' && !['url', 'file_url', 'path'].includes(key)
  ));

  if (duration) {
    entries.unshift(['duration', duration]);
  }

  if (entries.length === 0) {
    return (
      <div className="metadata-grid">
        <div>
          <span>Áudio</span>
          <strong>Metadados não informados</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="metadata-grid">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{formatLabel(key)}</span>
          <strong>{formatValue(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function getAudioSource(audio) {
  if (!audio || typeof audio !== 'object') return '';
  const url = audio.url || audio.file_url || audio.path;
  if (!url || typeof url !== 'string') return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSource(value) {
  return value === 'extension' || !value ? 'extensão' : value;
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDate(value) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default PatientsPage;
