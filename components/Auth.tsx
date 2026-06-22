'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [error, setError] = useState('');

  async function signInWith(provider: 'google' | 'github') {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <a href="#" className="logo" aria-label="Task Assistant home">
          <span className="logo-mark">✓</span>
          <span>Task Assistant</span>
        </a>
        <h1>Welcome back</h1>
        <p>Sign in to access your tasks from any device.</p>

        <div className="auth-providers">
          <button
            type="button"
            className="auth-provider-btn"
            onClick={() => signInWith('google')}
          >
            Sign in with Google
          </button>
          <button
            type="button"
            className="auth-provider-btn"
            onClick={() => signInWith('github')}
          >
            Sign in with GitHub
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
