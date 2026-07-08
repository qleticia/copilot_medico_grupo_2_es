import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'pacientes', label: 'Pacientes', icon: UsersRound },
  { id: 'agendamentos', label: 'Agenda', icon: CalendarDays },
  { id: 'analise', label: 'Consulta', icon: Sparkles },
  { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
  { id: 'relatorios', label: 'Histórico', icon: BarChart3 },
  { id: 'configuracoes', label: 'Ajustes', icon: Settings },
];

function Layout({ activeView, onViewChange, onLogout, user, profile, pageTitle, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">CM</div>
          <div>
            <strong>Copilot Médico</strong>
            <span>Painel</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                className={active ? 'nav-item active' : 'nav-item'}
                onClick={() => onViewChange(item.id)}
                type="button"
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="nav-item logout-button" type="button" onClick={onLogout}>
          <LogOut size={19} />
          <span>Sair</span>
        </button>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Copilot Médico</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="user-chip">
            <span>{user?.name || user?.email || 'Usuário'}</span>
            <small>{profile?.name || profile?.label || 'Perfil ativo'}</small>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export default Layout;
