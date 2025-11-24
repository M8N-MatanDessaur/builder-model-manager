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

      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Edit Field: {field.name}</h2>

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
