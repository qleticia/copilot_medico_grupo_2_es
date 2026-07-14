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
            <span>Informações</span>
            <strong>Centralizadas</strong>
          </div>
        </article>
        <article className="metric-card">
          <ClipboardPlus size={22} />
          <div>
            <span>Cadastro</span>
            <strong>Organizado</strong>
          </div>
        </article>
      </div>

      <section className="panel dashboard-panel">
        <div>
          <h2>Acompanhamento clínico centralizado</h2>
          <p>
            Organize pacientes, atendimentos e informações importantes para acompanhar cada consulta com mais praticidade.
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
