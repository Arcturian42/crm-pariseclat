import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    try {
      await login(demoEmail, demoPassword);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch {
      toast.error('Erreur de connexion demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo / Branding */}
        <div className="login-brand">
          <div className="login-logo">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="28" fill="#1E3A5F" />
              <path
                d="M14 35 L28 14 L42 35"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M19 35 L37 35" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="28" cy="14" r="3" fill="#2D6A9F" />
            </svg>
          </div>
          <h1 className="login-title">Paris Éclat</h1>
          <p className="login-subtitle">CRM Commercial</p>
        </div>

        {/* Login form */}
        <div className="login-card">
          <h2 className="login-card-title">Connexion</h2>
          <p className="login-card-subtitle">Accédez à votre espace CRM</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="votre@email.fr"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="demo-accounts">
            <p className="demo-title">Comptes de démonstration</p>
            <div className="demo-buttons">
              <button
                onClick={() => handleDemoLogin('farid@pariseclat.com', 'farid123')}
                className="demo-btn"
                disabled={loading}
              >
                <div className="demo-btn-role">Directeur</div>
                <div className="demo-btn-name">Farid Benali</div>
                <div className="demo-btn-email">farid@pariseclat.com</div>
              </button>
              <button
                onClick={() => handleDemoLogin('olivier@pariseclat.com', 'olivier123')}
                className="demo-btn"
                disabled={loading}
              >
                <div className="demo-btn-role">Commercial</div>
                <div className="demo-btn-name">Olivier Dupont</div>
                <div className="demo-btn-email">olivier@pariseclat.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="login-bg-decoration">
        <div className="login-bg-circle login-bg-circle-1"></div>
        <div className="login-bg-circle login-bg-circle-2"></div>
      </div>
    </div>
  );
}
