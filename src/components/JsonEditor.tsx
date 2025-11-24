import { useState, useEffect, useRef } from 'react';
import { builderApi } from '../services/builderApi';
import type { BuilderModel, ModelInput } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';

interface JsonEditorProps {
  model?: BuilderModel;
  initialJson?: string;
  onSave: () => void;
  onCancel: () => void;
}

export function JsonEditor({ model, initialJson, onSave, onCancel }: JsonEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedModel, setParsedModel] = useState<ModelInput | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (initialJson) {
      setJsonContent(initialJson);
    } else if (model) {
      const modelInput: ModelInput = {
        name: model.name,
        kind: model.kind,
        fields: model.fields,
      };
      setJsonContent(JSON.stringify(modelInput, null, 2));
    } else {
      // Empty template for new models
      const template = {
        name: 'NewModel',
        kind: 'component',
        fields: [
          {
            name: 'title',
            type: 'string',
            required: true,
          },
        ],
      };
      setJsonContent(JSON.stringify(template, null, 2));
    }
  }, [model, initialJson]);

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

  const validateJson = () => {
    setError('');
    setSuccess('');

    try {
      const parsed = JSON.parse(jsonContent);

      // Validate required fields
      if (!parsed.name) {
        setError('Missing required field: name');
        return false;
      }

      if (!parsed.kind) {
        setError('Missing required field: kind');
        return false;
      }

      const validKinds = ['component', 'page', 'data', 'section'];
      if (!validKinds.includes(parsed.kind)) {
        setError(`Invalid kind. Must be one of: ${validKinds.join(', ')}`);
        return false;
      }

      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        setError('Missing required field: fields (must be an array)');
        return false;
      }

      if (parsed.fields.length === 0) {
        setError('At least one field is required');
        return false;
      }

      // Validate field names
      for (const field of parsed.fields) {
        if (!field.name) {
          setError('All fields must have a name');
          return false;
        }
        if (!field.type) {
          setError(`Field "${field.name}" must have a type`);
          return false;
        }
      }

      setSuccess('JSON is valid');
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid JSON format. Please check syntax.'
      );
      return false;
    }
  };

  const handleSaveClick = () => {
    if (!validateJson()) return;

    const modelInput: ModelInput = JSON.parse(jsonContent);
    setParsedModel(modelInput);
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    if (!parsedModel) return;

    setShowConfirmation(false);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (model?.id) {
        // Update existing model
        await builderApi.updateModel(model.id, parsedModel);
        setSuccess('Model updated successfully');
      } else {
        // Create new model
        await builderApi.createModel(parsedModel);
        setSuccess('Model created successfully');
      }

      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingSpinner message={model ? 'Updating model...' : 'Creating model...'} fullscreen />}

      {showConfirmation && parsedModel && (
        <ConfirmationModal
          title={model ? 'Update Model' : 'Create Model'}
          message={
            model
              ? `You are about to update the model "${parsedModel.name}" in production. This will modify the model's fields immediately.`
              : `You are about to create a new model "${parsedModel.name}" in production. This will be live immediately.`
          }
          confirmText={model ? 'Update Model' : 'Create Model'}
          itemName={parsedModel.name}
          actionType={model ? 'update' : 'create'}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      <div className="container">
        <h1>{model ? `Edit: ${model.name}` : 'Create Model'}</h1>

        {model && (
          <p className="text-secondary mb-md">
            Note: Model name and kind cannot be changed after creation. Only the fields array will be updated.
          </p>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="editor-container" style={{ position: 'relative' }}>
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
              overflowX: 'hidden',
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
            disabled={loading}
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

        <div className="editor-footer">
          <div className="flex-end">
            <button onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button onClick={validateJson} disabled={loading}>
              Validate JSON
            </button>
            <button className="primary" onClick={handleSaveClick} disabled={loading}>
              Save Model
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
