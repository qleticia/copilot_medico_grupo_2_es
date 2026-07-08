import { ClipboardPlus, Database, Loader2, UsersRound } from 'lucide-react';

function Dashboard({ patients, patientsLoading, onGoToPatients }) {
  return (
    <section className="page-stack">
      <div className="summary-grid">
        <article className="metric-card">
          <UsersRound size={22} />
          <div>
            <span>Pacientes</span>
            <strong>{patientsLoading ? <Loader2 className="spin" size={22} /> : patients.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <Database size={22} />
          <div>
            <span>Origem dos dados</span>
            <strong>API Flask</strong>
          </div>
        </article>
        <article className="metric-card">
          <ClipboardPlus size={22} />
          <div>
            <span>Cadastro</span>
            <strong>Compartilhado</strong>
          </div>
        </article>
      </div>

      <section className="panel dashboard-panel">
        <div>
          <h2>Base única de pacientes</h2>
          <p>
            A aplicação web está conectada ao backend em `API/`. Pacientes cadastrados aqui são persistidos na mesma base
            que será reaproveitada pela extensão Chrome.
          </p>
        </div>
        <button className="primary-button compact" type="button" onClick={onGoToPatients}>
          Abrir pacientes
        </button>
      </section>
    </section>
  );
}

export default Dashboard;
