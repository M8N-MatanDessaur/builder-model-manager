import { useState, useEffect, useRef } from 'react';

interface JsonEditorModalProps {
  title: string;
  jsonData: any;
  onSave: (jsonData: any) => void;
  onCancel: () => void;
  validateFn?: (parsed: any) => { valid: boolean; error?: string };
}

export function JsonEditorModal({
  title,
  jsonData,
  onSave,
  onCancel,
  validateFn
}: JsonEditorModalProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setJsonContent(JSON.stringify(jsonData, null, 2));
  }, [jsonData]);

  useEffect(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [jsonContent]);

  const syntaxHighlight = (json: string): string => {
    return json
      // Keys (property names in quotes followed by colon)
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      // String values (in quotes)
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      // Numbers
      .replace(/: (-?\d+\.?\d*)(,?)$/gm, ': <span class="json-number">$1</span>$2')
      // Booleans
      .replace(/: (true|false)(,?)$/gm, ': <span class="json-boolean">$1</span>$2')
      // Null
      .replace(/: (null)(,?)$/gm, ': <span class="json-null">$1</span>$2');
  };

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSave = () => {
    setError('');

    try {
      const parsed = JSON.parse(jsonContent);

      if (validateFn) {
        const validation = validateFn(parsed);
        if (!validation.valid) {
          setError(validation.error || 'Validation failed');
          return;
        }
      }

      onSave(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh' }}
      >
        <h2>{title}</h2>

        {error && <div className="error">{error}</div>}

        <div className="modal-editor">
          <div style={{ position: 'relative', flex: 1, minHeight: '400px' }}>
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
              spellCheck={false}
              style={{
                position: 'absolute',
                lineHeight: '1.5',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                margin: 0,
                padding: 'var(--spacing-md)',
                backgroundColor: 'transparent',
                color: 'transparent',
                caretColor: 'var(--text-primary)',
                resize: 'none',
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <div className="flex-end">
            <button onClick={onCancel}>Cancel</button>
            <button className="primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
          <p className="text-secondary text-small mt-md">
            Press Esc to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
