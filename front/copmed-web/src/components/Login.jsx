import { useState } from 'react';
import { Activity, ClipboardList, HeartPulse, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { login, registerDoctor } from '../api';

const profiles = [
  { value: 'medico', label: 'Médico' },
  { value: 'administrador', label: 'Administrador' },
];

const emptyRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  crm: '',
  specialty: '',
};

function Login({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    profile: 'medico',
  });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function updateRegisterField(field) {
    return (event) => setRegisterForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email.trim() || !form.password || !form.profile) {
      setError('Informe e-mail, senha e perfil para continuar.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(form);
      onLoginSuccess({
        token: data.token,
        user: data.user,
        profile: data.profile,
      });
    } catch (err) {
      setError(err.message || 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password) {
      setError('Informe nome, e-mail e senha para enviar o cadastro.');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setRegisterLoading(true);
    try {
      await registerDoctor({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        crm: registerForm.crm.trim() || undefined,
        specialty: registerForm.specialty.trim() || undefined,
      });
      setRegisterForm(emptyRegisterForm);
      setSuccess('Cadastro enviado. Aguarde aprovação do administrador.');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o cadastro.');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel login-brand">
        <div className="brand-mark">
          <Activity size={28} />
          <span>Copilot Médico</span>
        </div>
        <div className="brand-copy">
          <h1>Copilot Médico</h1>
          <p>Organize pacientes, atendimentos e informações importantes em um só lugar.</p>
        </div>
        <div className="trust-list">
          <span><HeartPulse size={18} /> Acompanhe seus pacientes com mais praticidade.</span>
          <span><ClipboardList size={18} /> Consulte registros de atendimento.</span>
          <span><UserRound size={18} /> Centralize o acompanhamento clínico.</span>
        </div>
      </section>

      <section className="login-panel login-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Copilot Médico</p>
          <h2 id="login-title">{activeTab === 'login' ? 'Entrar no sistema' : 'Cadastrar médico'}</h2>
          <p className="muted">
            {activeTab === 'login'
              ? 'Acesse o painel para acompanhar pacientes e atendimentos.'
              : 'Envie seu cadastro para aprovação da administração.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Autenticação">
          <button
            className={activeTab === 'login' ? 'active' : ''}
            type="button"
            onClick={() => switchTab('login')}
          >
            Entrar
          </button>
          <button
            className={activeTab === 'register' ? 'active' : ''}
            type="button"
            onClick={() => switchTab('register')}
          >
            Cadastrar médico
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'login' ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>E-mail</span>
              <div className="input-icon">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField('email')}
                  placeholder="medico@clinica.com"
                />
              </div>
            </label>

            <label>
              <span>Senha</span>
              <div className="input-icon">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={updateField('password')}
                  placeholder="Sua senha"
                />
              </div>
            </label>

            <label>
              <span>Perfil</span>
              <select value={form.profile} onChange={updateField('profile')}>
                {profiles.map((profile) => (
                  <option key={profile.value} value={profile.value}>{profile.label}</option>
                ))}
              </select>
            </label>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleRegisterSubmit}>
            <label>
              <span>Nome</span>
              <div className="input-icon">
                <UserRound size={18} />
                <input
                  value={registerForm.name}
                  onChange={updateRegisterField('name')}
                  placeholder="Nome completo"
                  autoComplete="name"
                />
              </div>
            </label>

            <label>
              <span>E-mail</span>
              <div className="input-icon">
                <Mail size={18} />
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={updateRegisterField('email')}
                  placeholder="medico@clinica.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <div className="form-two-columns">
              <label>
                <span>Senha</span>
                <div className="input-icon">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={updateRegisterField('password')}
                    placeholder="Crie uma senha"
                    autoComplete="new-password"
                  />
                </div>
              </label>

              <label>
                <span>Confirmar senha</span>
                <div className="input-icon">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={updateRegisterField('confirmPassword')}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                </div>
              </label>
            </div>

            <div className="form-two-columns">
              <label>
                <span>CRM</span>
                <input
                  className="plain-input"
                  value={registerForm.crm}
                  onChange={updateRegisterField('crm')}
                  placeholder="Opcional"
                />
              </label>

              <label>
                <span>Especialidade</span>
                <input
                  className="plain-input"
                  value={registerForm.specialty}
                  onChange={updateRegisterField('specialty')}
                  placeholder="Opcional"
                />
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={registerLoading}>
              {registerLoading ? 'Enviando...' : 'Enviar cadastro'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default Login;
