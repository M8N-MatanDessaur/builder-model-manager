import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { builderApi } from '../services/builderApi';
import type { BuilderCredentials } from '../types/builder';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDisconnect: () => void;
}

export function SettingsModal({ isOpen, onClose, onUpdate, onDisconnect }: SettingsModalProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const credentials = builderApi.loadCredentials();
      if (credentials) {
        setPrivateKey(credentials.privateKey);
        setPublicKey(credentials.publicKey);
        setOpenaiApiKey(credentials.openaiApiKey || '');
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    const credentials: BuilderCredentials = {
      privateKey,
      publicKey,
      openaiApiKey: openaiApiKey.trim() || undefined,
    };
    console.log('[SettingsModal] Saving credentials with openaiApiKey:', !!credentials.openaiApiKey);
    builderApi.setCredentials(credentials);

    // Verify it was saved
    const saved = builderApi.loadCredentials();
    console.log('[SettingsModal] Verified saved credentials has openaiApiKey:', !!saved?.openaiApiKey);

    // Dispatch event to notify AI components to reload
    window.dispatchEvent(new CustomEvent('ai-settings-updated'));

    onUpdate();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>API Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#999',
            }}
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#00aaff' }}>Builder.io API Keys</h3>
            <button
              onClick={() => setShowKeys(!showKeys)}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                border: '1px solid #666',
                color: '#999',
              }}
            >
              {showKeys ? 'Hide' : 'Show'} Keys
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="privateKey">Private API Key</label>
            <input
              id="privateKey"
              type={showKeys ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your Private API Key"
              required
              style={{ fontFamily: showKeys ? 'monospace' : 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="publicKey">Public API Key</label>
            <input
              id="publicKey"
              type={showKeys ? 'text' : 'password'}
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="Enter your Public API Key (bpk-...)"
              required
              style={{ fontFamily: showKeys ? 'monospace' : 'inherit' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #333' }}>
          <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '16px', color: '#00aaff' }}>
            AI Features <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>(Optional)</span>
          </h3>

          <div className="form-group">
            <label htmlFor="openaiApiKey">
              OpenAI API Key
            </label>
            <input
              id="openaiApiKey"
              type={showKeys ? 'text' : 'password'}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-proj-... (optional)"
              style={{ fontFamily: showKeys ? 'monospace' : 'inherit' }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#00aaff' }}
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #333' }}>
          <button
            onClick={() => {
              onDisconnect();
              onClose();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#999',
            }}
          >
            Disconnect
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '10px 20px' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="primary"
              disabled={!privateKey || !publicKey}
              style={{ padding: '10px 20px' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
