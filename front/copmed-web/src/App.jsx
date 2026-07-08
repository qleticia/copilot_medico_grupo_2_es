import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearSession, createPatient, getPatients, getStoredSession, storeSession } from './api';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './components/Dashboard.jsx';
import PatientsPage from './components/PatientsPage.jsx';
import PlaceholderPage from './components/PlaceholderPage.jsx';

const views = {
  dashboard: { title: 'Dashboard' },
  pacientes: { title: 'Pacientes' },
  agendamentos: { title: 'Agendamentos' },
  analise: { title: 'Análise com IA' },
  atendimentos: { title: 'Atendimentos' },
  relatorios: { title: 'Relatórios' },
  configuracoes: { title: 'Configurações' },
};

function App() {
  const storedSession = useMemo(() => getStoredSession(), []);
  const [session, setSession] = useState(storedSession);
  const [activeView, setActiveView] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [patientsState, setPatientsState] = useState({ loading: false, error: '' });

  const authenticated = Boolean(session.token);

  const loadPatients = useCallback(async () => {
    if (!session.token) return;

    setPatientsState({ loading: true, error: '' });
    try {
      const data = await getPatients(session.token);
      const normalized = (data.patients || []).map((patient) => ({
        id: patient.id,
        name: patient.name || patient.nome || `Paciente ${String(patient.id).slice(0, 8)}`,
      }));
      setPatients(normalized);
      setPatientsState({ loading: false, error: '' });
    } catch (error) {
      setPatientsState({ loading: false, error: error.message });
    }
  }, [session.token]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  function handleLoginSuccess(nextSession) {
    storeSession(nextSession);
    setSession(nextSession);
    setActiveView('dashboard');
  }

  function handleLogout() {
    clearSession();
    setSession({ token: null, user: null, profile: null });
    setPatients([]);
  }

  async function handleCreatePatient(patient) {
    const payload = { name: patient.name.trim() };
    await createPatient(session.token, payload);
    await loadPatients();
  }

  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const pageTitle = views[activeView]?.title || 'Dashboard';

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      onLogout={handleLogout}
      user={session.user}
      profile={session.profile}
      pageTitle={pageTitle}
    >
      {activeView === 'dashboard' && (
        <Dashboard
          patients={patients}
          patientsLoading={patientsState.loading}
          onGoToPatients={() => setActiveView('pacientes')}
        />
      )}

      {activeView === 'pacientes' && (
        <PatientsPage
          token={session.token}
          patients={patients}
          loading={patientsState.loading}
          error={patientsState.error}
          onRefresh={loadPatients}
          onCreatePatient={handleCreatePatient}
        />
      )}

      {activeView === 'agendamentos' && (
        <PlaceholderPage
          title="Agendamentos"
          description="Funcionalidade prevista. A referência possui uma tela de agenda, mas o backend oficial ainda não expõe rotas de agendamentos nesta etapa."
        />
      )}

      {activeView === 'analise' && (
        <PlaceholderPage
          title="Análise com IA"
          description="Estrutura preparada para consumir o backend compartilhado. A análise completa será conectada aos fluxos de consultas, PDF, áudio e recomendações em uma próxima task."
        />
      )}

      {activeView === 'atendimentos' && (
        <PlaceholderPage
          title="Atendimentos"
          description="Funcionalidade prevista. Hoje a visualização inicial de atendimentos está disponível dentro do detalhe do paciente, usando as consultas salvas no backend."
        />
      )}

      {activeView === 'relatorios' && (
        <PlaceholderPage
          title="Relatórios"
          description="Funcionalidade prevista para acompanhar indicadores clínicos e operacionais quando as rotas correspondentes estiverem disponíveis."
        />
      )}

      {activeView === 'configuracoes' && (
        <PlaceholderPage
          title="Configurações"
          description="Funcionalidade prevista para preferências de conta, instituição e integrações."
        />
      )}
    </Layout>
  );
}

export default App;
