import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus, RefreshCcw, Search, UserRound } from 'lucide-react';
import { getPatientConsultations } from '../api';

function PatientsPage({ token, patients, loading, error, onRefresh, onCreatePatient }) {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [consultationsState, setConsultationsState] = useState({ loading: false, error: '' });

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
  }, [selectedPatient, token]);

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

  return (
    <section className="patients-grid">
      <div className="panel list-panel">
        <div className="panel-heading">
          <div>
            <h2>Pacientes</h2>
            <p>Dados carregados de `GET /api/all-patients`.</p>
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
              <span>Nenhum paciente encontrado no backend.</span>
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
            </div>

            <div className="info-strip">
              <div>
                <span>Cadastro</span>
                <strong>Backend compartilhado</strong>
              </div>
              <div>
                <span>Consultas</span>
                <strong>{consultationsState.loading ? '...' : consultations.length}</strong>
              </div>
            </div>

            <section>
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
