import { useState, useEffect, useRef } from 'react';
import { ConfirmationModal } from './ConfirmationModal';

interface ContentFieldEditorProps {
  path: string[];
  value: any;
  onSave: (newValue: any) => void;
  onCancel: () => void;
}

export function ContentFieldEditor({ path, value, onSave, onCancel }: ContentFieldEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedValue, setParsedValue] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setJsonContent(JSON.stringify(value, null, 2));
  }, [value]);

  useEffect(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [jsonContent]);

  const syntaxHighlight = (json: string): string => {
    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (-?\d+\.?\d*)(,?)$/gm, ': <span class="json-number">$1</span>$2')
      .replace(/: (true|false)(,?)$/gm, ': <span class="json-boolean">$1</span>$2')
      .replace(/: (null)(,?)$/gm, ': <span class="json-null">$1</span>$2');
  };

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleSaveClick = () => {
    setError('');
    try {
      const parsed = JSON.parse(jsonContent);
      setParsedValue(parsed);
      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleConfirmSave = () => {
    if (parsedValue === null) return;
    setShowConfirmation(false);
    onSave(parsedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveClick();
    }
  };

  const fieldName = path[path.length - 1];
  const fullPath = path.join('.');

  return (
    <>
      {showConfirmation && parsedValue !== null && (
        <ConfirmationModal
          title="Update Content Field"
          message={`You are about to update the field "${fieldName}" in production. This will modify the content immediately.`}
          confirmText="Update Field"
          itemName={fieldName}
          actionType="update"
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Edit Field: {fieldName}</h2>
          <p className="text-secondary text-small mb-md">Path: {fullPath}</p>

          {error && <div className="error">{error}</div>}

        <div className="modal-editor" style={{ position: 'relative' }}>
          <pre
            ref={highlightRef}
            className="monospace"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 'var(--spacing-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              pointerEvents: 'none',
              overflow: 'auto',
              whiteSpace: 'pre',
              wordWrap: 'normal',
            }}
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonContent) }}
          />
          <textarea
            ref={textareaRef}
            className="editor"
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoFocus
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 'var(--spacing-md)',
              lineHeight: '1.5',
              backgroundColor: 'transparent',
              color: 'transparent',
              caretColor: 'var(--text-primary)',
            }}
          />
        </div>

        <div className="modal-footer">
          <div className="flex-end">
            <button onClick={onCancel}>Cancel</button>
            <button className="primary" onClick={handleSaveClick}>
              Save Field
            </button>
          </div>
          <p className="text-secondary text-small mt-md">
            Tip: Press Esc to cancel, Ctrl/Cmd+Enter to save
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
