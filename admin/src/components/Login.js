import { useState } from 'react';
import { supabase } from '../supabase';

const Login = ({ configError, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span aria-hidden="true">🍫</span>
          <p>Il Mio Cioccolato</p>
        </div>
        <h1>Admin sign in</h1>
        <p className="auth-description">Sign in with your authorized account.</p>

        {(configError || authError || error) && (
          <div className="auth-error" role="alert">
            {configError || authError || error}
          </div>
        )}

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
      </section>
    </main>
  );
};

export default Login;
