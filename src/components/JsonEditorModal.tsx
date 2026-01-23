import { useState, useEffect } from 'react';
import { MonacoJsonEditor } from './MonacoJsonEditor';

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

  useEffect(() => {
    setJsonContent(JSON.stringify(jsonData, null, 2));
  }, [jsonData]);

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

        <div className="modal-editor" style={{ minHeight: '400px' }}>
          <MonacoJsonEditor
            value={jsonContent}
            onChange={setJsonContent}
            height="400px"
          />
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
