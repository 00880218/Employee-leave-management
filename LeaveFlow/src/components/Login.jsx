import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, User, ShieldCheck } from 'lucide-react';

function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [managerSecret, setManagerSecret] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegister && !name) return;

    setLoading(true);
    try {
      if (isRegister) {
        await register(name, email, password, role, managerSecret);
      } else {
        await login(email, password);
      }
    } catch (err) {
      // Errors are handled and displayed via context toast notifications
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container glass-panel animate-fade-in">
        <div className="auth-header">
          <div className="logo-text">Leave<span>Flow</span></div>
          <p className="auth-subtitle">
            {isRegister ? 'Create your employee account' : 'Sign in to your dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="yourname@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">System Role</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="form-select"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (e.target.value !== 'manager') {
                      setManagerSecret('');
                    }
                  }}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager / Approver</option>
                </select>
              </div>
            </div>
          )}

          {isRegister && role === 'manager' && (
            <div className="form-group animate-slide-in">
              <label className="form-label">Manager Secret Code</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  placeholder="Enter secret manager code"
                  value={managerSecret}
                  onChange={(e) => setManagerSecret(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => {
            setIsRegister(!isRegister);
            setRole('employee');
            setManagerSecret('');
          }}>
            {isRegister ? 'Sign In' : 'Register now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
