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

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const syntaxHighlight = (json: string): string => {
    // First escape HTML entities to prevent HTML injection
    const escaped = escapeHtml(json);

    // Then apply syntax highlighting with non-greedy matching
    return escaped
      // Keys (property names in quotes followed by colon)
      .replace(/&quot;([^&quot;]+?)&quot;:/g, '<span class="json-key">&quot;$1&quot;</span>:')
      // String values (in quotes)
      .replace(/: &quot;(.*?)&quot;/g, ': <span class="json-string">&quot;$1&quot;</span>')
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
    <div className="modal-overlay" onKeyDown={handleKeyDown}>
      <div
        className="modal-content"
        style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh' }}
      >
        <h2>{title}</h2>

        {error && <div className="error">{error}</div>}

        <div className="modal-editor">
          <div style={{ position: 'relative', flex: 1, minHeight: '400px' }}>
            <pre
              ref={highlightRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                margin: 0,
                padding: '16px',
                border: '1px solid #333333',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                overflow: 'auto',
                boxSizing: 'border-box',
                backgroundColor: '#1a1a1a',
                color: '#a0a0a0',
                pointerEvents: 'none',
              }}
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonContent) }}
            />
            <textarea
              ref={textareaRef}
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                margin: 0,
                padding: '16px',
                border: '1px solid #333333',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                overflow: 'auto',
                boxSizing: 'border-box',
                backgroundColor: 'transparent',
                color: 'transparent',
                caretColor: '#e0e0e0',
                outline: 'none',
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
