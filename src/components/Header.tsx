type Page = 'models' | 'content';

interface HeaderProps {
  currentPage: Page;
  spaceName?: string;
  onNavigate: (page: Page) => void;
  onDisconnect: () => void;
}

export function Header({ currentPage, spaceName, onNavigate, onDisconnect }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <h2 style={{ margin: 0 }}>
          Builder CRUD Manager
          {spaceName && (
            <span className="text-secondary" style={{ fontWeight: 400 }}>
              {' '}→ {spaceName}
            </span>
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
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onDisconnect();
            }}
          >
            Disconnect
          </a>
        </nav>
      </div>
    </header>
  );
}
