import { useState } from 'react';
import { supabase } from '../supabase';
import { BakerySealIcon } from './Icons';

const Login = ({ configError, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!supabase) {
      setError('Supabase is not configured for this admin app.');
      return;
    }
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError.message || 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    setError(''); setNotice('');
    if (!supabase || !email.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    try {
      const redirectTo = window.location.origin + '/set-password';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) setError(resetError.message);
      else setNotice('If an account exists for this address, Supabase will email a password setup link.');
    } catch (resetError) { setError(resetError.message || 'Could not send a password setup email.'); }
    finally { setLoading(false); }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <BakerySealIcon style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
          <p>Menu Platform</p>
        </div>
        <h1>Admin sign in</h1>
        <p className="auth-description">Sign in with your authorized account.</p>

        {(configError || authError || error) && (
          <div className="auth-error" role="alert">
            {configError || authError || error}
          </div>
        )}
        {notice && <p role="status">{notice}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={!supabase || loading}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={!supabase || loading}
          />

          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={!supabase || loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <button className="btn btn-ghost" type="button" disabled={!supabase || loading} onClick={sendReset}>Forgot password?</button>
      </section>
    </main>
  );
};

export default Login;
