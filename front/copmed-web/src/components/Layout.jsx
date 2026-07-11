import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'medicos', label: 'Médicos', icon: UserRound },
  { id: 'pacientes', label: 'Pacientes', icon: UsersRound },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const doctorNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pacientes', label: 'Pacientes', icon: UsersRound },
  { id: 'analise', label: 'Consulta', icon: Sparkles },
  { id: 'relatorios', label: 'Histórico', icon: BarChart3 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

function Layout({ activeView, onViewChange, onLogout, user, profile, pageTitle, children }) {
  const navItems = profile?.name === 'administrador' ? adminNavItems : doctorNavItems;

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
