import { useState } from 'react';
import { builderApi } from '../services/builderApi';
import { LoadingSpinner } from './LoadingSpinner';

interface AuthProps {
  onAuthenticated: () => void;
}

export function Auth({ onAuthenticated }: AuthProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      builderApi.setCredentials({ privateKey, publicKey });
      const isValid = await builderApi.testConnection();

      if (isValid) {
        // Wait for the onAuthenticated callback to complete
        await onAuthenticated();
      } else {
        setError('Invalid credentials. Please check your API keys.');
        builderApi.clearCredentials();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Connection failed. Please try again.'
      );
      builderApi.clearCredentials();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingSpinner message="Connecting to Builder.io..." fullscreen />}

      <div className="container" style={{ maxWidth: '500px', marginTop: '80px' }}>
        <div className="card">
          <h1>Builder CRUD Manager</h1>
          <p className="text-secondary">
            Connect to your Builder.io space to manage models and content
          </p>

          {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="privateKey">Private API Key</label>
            <input
              id="privateKey"
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your Private API Key"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="publicKey">Public API Key</label>
            <input
              id="publicKey"
              type="text"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Enter your Public API Key (bpk-...)"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="primary" disabled={loading}>
            Connect to Builder.io
          </button>
        </form>
      </div>
      </div>
    </>
  );
}
