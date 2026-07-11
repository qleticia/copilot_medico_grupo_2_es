import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCcw, UserRound, XCircle } from 'lucide-react';
import { approveDoctor, getDoctorRequests, rejectDoctor } from '../api';

const statusOptions = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'all', label: 'Todos' },
];

const statusLabels = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

function AdminDoctorsPage({ token }) {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [state, setState] = useState({ loading: false, error: '' });
  const [actionLoadingId, setActionLoadingId] = useState('');

  const loadRequests = useCallback(async () => {
    setState({ loading: true, error: '' });
    try {
      const data = await getDoctorRequests(token, status);
      setRequests(data.requests || []);
      setState({ loading: false, error: '' });
    } catch (error) {
      setRequests([]);
      setState({ loading: false, error: error.message });
    }
  }, [token, status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleApprove(userId) {
    setActionLoadingId(userId);
    try {
      await approveDoctor(token, userId);
      await loadRequests();
    } catch (error) {
      window.alert(error.message || 'Não foi possível aprovar o médico.');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleReject(userId) {
    const reason = window.prompt('Motivo da rejeição (opcional)') || '';
    setActionLoadingId(userId);
    try {
      await rejectDoctor(token, userId, reason);
      await loadRequests();
    } catch (error) {
      window.alert(error.message || 'Não foi possível rejeitar o médico.');
    } finally {
      setActionLoadingId('');
    }
  }

  return (
    <section className="page-stack">
      <div className="panel admin-doctors-panel">
        <div className="panel-heading">
          <div>
            <h2>Médicos</h2>
            <p>Revise solicitações de cadastro e mantenha o acesso médico sob aprovação.</p>
          </div>
          <button className="icon-button" type="button" onClick={loadRequests} title="Atualizar lista">
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="status-tabs" role="tablist" aria-label="Status dos médicos">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={status === option.value ? 'active' : ''}
              type="button"
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {state.error && <div className="alert alert-error">{state.error}</div>}

        {state.loading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={22} />
            <span>Carregando médicos...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <UserRound size={22} />
            <span>Nenhum médico encontrado para este filtro.</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>CRM</th>
                  <th>Especialidade</th>
                  <th>Cadastro</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>{doctor.name || '-'}</td>
                    <td>{doctor.email || '-'}</td>
                    <td>{doctor.crm || '-'}</td>
                    <td>{doctor.specialty || '-'}</td>
                    <td>{formatDate(doctor.created_at)}</td>
                    <td>
                      <span className={`status-pill ${doctor.approval_status || 'pending'}`}>
                        {statusLabels[doctor.approval_status] || doctor.approval_status || 'Pendente'}
                      </span>
                    </td>
                    <td>
                      {doctor.approval_status === 'pending' ? (
                        <div className="row-actions">
                          <button
                            className="icon-button approve"
                            type="button"
                            onClick={() => handleApprove(doctor.id)}
                            title="Aprovar médico"
                            disabled={actionLoadingId === doctor.id}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            className="icon-button reject"
                            type="button"
                            onClick={() => handleReject(doctor.id)}
                            title="Rejeitar médico"
                            disabled={actionLoadingId === doctor.id}
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className="muted">Sem ações</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default AdminDoctorsPage;
