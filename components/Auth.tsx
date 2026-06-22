'use client';

import { useState } from 'react';

export default function Auth({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onStart(trimmed);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <a href="#" className="logo" aria-label="Task Assistant home">
          <span className="logo-mark">✓</span>
          <span>Task Assistant</span>
        </a>
        <h1>Welcome</h1>
        <p>Enter your name to access your tasks. Use the same name on any device.</p>

        <form onSubmit={handleSubmit} className="task-form" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
          <div className="form-field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Faisal"
              required
              autoComplete="name"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Start
          </button>
        </form>
      </div>
    </div>
  );
}
