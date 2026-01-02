import { useState, useEffect, useRef } from 'react';
import type { BuilderField } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';

interface FieldEditorProps {
  field: BuilderField;
  onSave: (updatedField: BuilderField) => void;
  onCancel: () => void;
}

export function FieldEditor({ field, onSave, onCancel }: FieldEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedField, setParsedField] = useState<BuilderField | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setJsonContent(JSON.stringify(field, null, 2));
  }, [field]);

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
    console.log('FieldEditor: Save button clicked');
    console.log('FieldEditor: jsonContent:', jsonContent);
    setError('');
    try {
      const parsed = JSON.parse(jsonContent);
      console.log('FieldEditor: Parsed JSON:', parsed);

      if (!parsed.name) {
        console.log('FieldEditor: Validation failed - no name');
        setError('Field name is required');
        return;
      }

      if (!parsed.type) {
        console.log('FieldEditor: Validation failed - no type');
        setError('Field type is required');
        return;
      }

      console.log('FieldEditor: Validation passed, showing confirmation');
      setParsedField(parsed);
      setShowConfirmation(true);
    } catch (err) {
      console.error('FieldEditor: JSON parse error:', err);
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleConfirmSave = () => {
    console.log('FieldEditor: handleConfirmSave called');
    console.log('FieldEditor: parsedField:', parsedField);
    if (!parsedField) {
      console.log('FieldEditor: No parsedField, aborting');
      return;
    }
    console.log('FieldEditor: Calling onSave with:', parsedField);
    setShowConfirmation(false);
    onSave(parsedField);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveClick();
    }
  };

  return (
    <>
      {showConfirmation && parsedField && (
        <ConfirmationModal
          title="Update Field"
          message={`You are about to update the field "${parsedField.name}" in production. This will modify the model immediately.`}
          confirmText="Update Field"
          itemName={parsedField.name}
          actionType="update"
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Edit Field: {field.name}</h2>

          {error && <div className="error">{error}</div>}

        <div className="modal-editor" style={{ position: 'relative' }}>
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
