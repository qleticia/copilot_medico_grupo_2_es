import { useState } from 'react';
import { Activity, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { API_URL, login } from '../api';

const profiles = [
  { value: 'medico', label: 'Médico' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'recepcao', label: 'Recepção' },
  { value: 'usuario', label: 'Usuário' },
];

function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    profile: 'medico',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Informe e-mail e senha para continuar.');
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

  return (
    <main className="login-shell">
      <section className="login-panel login-brand">
        <div className="brand-mark">
          <Activity size={28} />
          <span>Copilot Médico</span>
        </div>
        <div className="brand-copy">
          <h1>Portal clínico integrado</h1>
          <p>Cadastro, listagem e acompanhamento de pacientes usando o backend Flask compartilhado.</p>
        </div>
        <div className="trust-list">
          <span><ShieldCheck size={18} /> API configurável via Vite</span>
          <span><LockKeyhole size={18} /> Token Bearer armazenado após login</span>
          <span><UserRound size={18} /> Mesma base de pacientes da extensão</span>
        </div>
      </section>

      <section className="login-panel login-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Backend: {API_URL}</p>
          <h2 id="login-title">Entrar</h2>
          <p className="muted">Use um usuário configurado no backend para acessar a web.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

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
      </section>
    </main>
  );
}

export default Login;
