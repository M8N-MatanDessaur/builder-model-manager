import { useState } from 'react';
import { Settings, ChevronRight } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

type Page = 'models' | 'content';

interface HeaderProps {
  currentPage: Page;
  spaceName?: string;
  onNavigate: (page: Page) => void;
  onDisconnect: () => void;
  onSettingsUpdate?: () => void;
}

export function Header({ currentPage, spaceName, onNavigate, onDisconnect, onSettingsUpdate }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsUpdate = () => {
    setShowSettings(false);
    if (onSettingsUpdate) {
      onSettingsUpdate();
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Builder CRUD Manager
            {spaceName && (
              <>
                <ChevronRight size={16} style={{ color: '#999' }} />
                <span className="text-secondary" style={{ fontWeight: 400 }}>
                  {spaceName}
                </span>
              </>
            )}
          </h2>
          <nav className="nav">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('models');
              }}
              style={{
                textDecoration: currentPage === 'models' ? 'underline' : 'none',
              }}
            >
              Models
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('content');
              }}
              style={{
                textDecoration: currentPage === 'content' ? 'underline' : 'none',
              }}
            >
              Content
            </a>
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowSettings(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0',
                fontSize: 'inherit',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </nav>
        </div>
      </header>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={handleSettingsUpdate}
        onDisconnect={onDisconnect}
      />
    </>
  );
}
