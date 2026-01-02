import { useState, useEffect, useRef } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import type { FieldType } from '../types/builder';

interface ContentFieldEditorProps {
  path: string[];
  value: any;
  fieldType?: FieldType;
  onSave: (newValue: any) => void;
  onCancel: () => void;
}

export function ContentFieldEditor({ path, value, fieldType, onSave, onCancel }: ContentFieldEditorProps) {
  const [editContent, setEditContent] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedValue, setParsedValue] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Determine if we should use JSON editor or simple text editor
  const useJsonEditor = !fieldType || ['object', 'list'].includes(fieldType);
  const useHtmlEditor = fieldType === 'richText';
  const useTextEditor = ['string', 'text', 'email', 'url'].includes(fieldType || '');
  const useNumberEditor = fieldType === 'number';
  const useBooleanEditor = fieldType === 'boolean';

  useEffect(() => {
    if (useJsonEditor) {
      setJsonContent(JSON.stringify(value, null, 2));
    } else if (useHtmlEditor || useTextEditor) {
      setEditContent(value || '');
    } else if (useNumberEditor) {
      setEditContent(String(value || 0));
    } else if (useBooleanEditor) {
      setEditContent(String(value));
    } else {
      // Fallback to JSON for unknown types
      setJsonContent(JSON.stringify(value, null, 2));
    }
  }, [value, useJsonEditor, useHtmlEditor, useTextEditor, useNumberEditor, useBooleanEditor]);

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

    // Then apply syntax highlighting with non-greedy matching to handle escaped HTML
    return escaped
      .replace(/&quot;([^&quot;]+?)&quot;:/g, '<span class="json-key">&quot;$1&quot;</span>:')
      .replace(/: &quot;(.*?)&quot;/g, ': <span class="json-string">&quot;$1&quot;</span>')
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
      let parsed: any;

      if (useJsonEditor) {
        parsed = JSON.parse(jsonContent);
      } else if (useNumberEditor) {
        parsed = parseFloat(editContent);
        if (isNaN(parsed)) {
          setError('Invalid number format');
          return;
        }
      } else if (useBooleanEditor) {
        parsed = editContent === 'true';
      } else {
        // For text, richText, string, email, url - just use the raw string
        parsed = editContent;
      }

      setParsedValue(parsed);
      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid format');
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

  const renderEditor = () => {
    if (useBooleanEditor) {
      return (
        <div style={{ padding: 'var(--spacing-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={editContent === 'true'}
              onChange={(e) => setEditContent(String(e.target.checked))}
              autoFocus
              style={{ width: '24px', height: '24px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px' }}>
              {editContent === 'true' ? 'True' : 'False'}
            </span>
          </label>
        </div>
      );
    }

    if (useNumberEditor) {
      return (
        <input
          type="number"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '16px',
            fontFamily: 'monospace',
          }}
        />
      );
    }

    if (useTextEditor || useHtmlEditor) {
      return (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={true}
          autoFocus
          style={{
            width: '100%',
            minHeight: useHtmlEditor ? '400px' : '200px',
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '14px',
            fontFamily: useHtmlEditor ? 'monospace' : 'inherit',
            lineHeight: '1.6',
            resize: 'vertical',
          }}
        />
      );
    }

    // JSON editor for complex types
    // Both layers MUST have identical styling for proper alignment
    const sharedEditorStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      padding: '16px', // explicit pixel value instead of var
      border: '1px solid #333333',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap', // pre-wrap preserves formatting and wraps long lines
      wordWrap: 'break-word',
      wordBreak: 'normal',
      overflowWrap: 'break-word',
      overflow: 'auto',
      boxSizing: 'border-box',
    };

    return (
      <div className="modal-editor" style={{ position: 'relative' }}>
        <pre
          ref={highlightRef}
          style={{
            ...sharedEditorStyle,
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
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoFocus
          style={{
            ...sharedEditorStyle,
            backgroundColor: 'transparent',
            color: 'transparent',
            caretColor: '#e0e0e0',
            outline: 'none',
            resize: 'none',
          }}
        />
      </div>
    );
  };

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

      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Edit Field: {fieldName}</h2>
          <p className="text-secondary text-small mb-md">
            Path: {fullPath}
            {fieldType && (
              <span style={{ marginLeft: '12px', color: 'var(--accent-color)' }}>
                ({fieldType})
              </span>
            )}
          </p>

          {error && <div className="error">{error}</div>}

          {renderEditor()}

          <div className="modal-footer">
            <div className="flex-end">
              <button onClick={onCancel}>Cancel</button>
              <button className="primary" onClick={handleSaveClick}>
                Save Field
              </button>
            </div>
            <p className="text-secondary text-small mt-md">
              Tip: Press Esc to cancel{useJsonEditor || useTextEditor || useHtmlEditor ? ', Ctrl/Cmd+Enter to save' : ''}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
