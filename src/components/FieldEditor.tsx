import { useState, useEffect } from 'react';
import type { BuilderField } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { MonacoJsonEditor } from './MonacoJsonEditor';

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

  useEffect(() => {
    setJsonContent(JSON.stringify(field, null, 2));
  }, [field]);

  const handleSaveClick = () => {
    setError('');
    try {
      const parsed = JSON.parse(jsonContent);

      if (!parsed.name) {
        setError('Field name is required');
        return;
      }

      if (!parsed.type) {
        setError('Field type is required');
        return;
      }

      setParsedField(parsed);
      setShowConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleConfirmSave = () => {
    if (!parsedField) return;
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

      <div className="modal-overlay" onKeyDown={handleKeyDown}>
        <div className="modal-content">
          <h2>Edit Field: {field.name}</h2>

          {error && <div className="error">{error}</div>}

          <div className="modal-editor" style={{ minHeight: '300px' }}>
            <MonacoJsonEditor
              value={jsonContent}
              onChange={setJsonContent}
              height="300px"
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
