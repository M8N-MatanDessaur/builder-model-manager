import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { builderApi } from '../services/builderApi';
import type { BuilderContent, BuilderModel } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';
import { normalizeFieldOrder } from '../utils/fieldOrder';

interface ContentJsonEditorProps {
  content?: BuilderContent;
  model: BuilderModel;
  onSave: () => void;
  onCancel: () => void;
}

export function ContentJsonEditor({ content, model, onSave, onCancel }: ContentJsonEditorProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedContent, setParsedContent] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (content) {
      // Editing existing content - normalize field order to match model
      const normalizedData = normalizeFieldOrder(content.data, model);
      setJsonContent(
        JSON.stringify(
          {
            name: content.name,
            published: content.published || 'draft',
            data: normalizedData,
          },
          null,
          2
        )
      );
    } else {
      // Creating new content - provide template based on model fields
      const templateData: Record<string, any> = {};
      model.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          templateData[field.name] = field.defaultValue;
        } else if (field.type === 'string' || field.type === 'text' || field.type === 'richText') {
          templateData[field.name] = '';
        } else if (field.type === 'number') {
          templateData[field.name] = 0;
        } else if (field.type === 'boolean') {
          templateData[field.name] = false;
        } else if (field.type === 'list') {
          templateData[field.name] = [];
        } else if (field.type === 'object') {
          templateData[field.name] = {};
        } else {
          templateData[field.name] = null;
        }
      });

      setJsonContent(
        JSON.stringify(
          {
            name: `New ${model.name}`,
            published: 'draft',
            data: templateData,
          },
          null,
          2
        )
      );
    }
  }, [content, model]);

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

  const validateJson = () => {
    setValidationError('');
    try {
      const parsed = JSON.parse(jsonContent);

      if (!parsed.name) {
        setValidationError('Content name is required');
        return false;
      }

      if (typeof parsed.name !== 'string') {
        setValidationError('Content name must be a string');
        return false;
      }

      if (!parsed.data) {
        setValidationError('Content data is required');
        return false;
      }

      if (typeof parsed.data !== 'object') {
        setValidationError('Content data must be an object');
        return false;
      }

      setValidationError('JSON is valid');
      return true;
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid JSON syntax');
      return false;
    }
  };

  const handleSaveClick = () => {
    if (!validateJson()) {
      return;
    }

    const parsed = JSON.parse(jsonContent);
    setParsedContent(parsed);
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    if (!parsedContent) return;

    setShowConfirmation(false);
    setSaving(true);
    setError('');

    try {
      // Normalize field order to match model definition
      const normalizedData = normalizeFieldOrder(parsedContent.data, model);

      if (content && content.id) {
        // Update existing content
        await builderApi.updateContent(model.name, content.id, {
          name: parsedContent.name,
          published: parsedContent.published || 'draft',
          data: normalizedData,
        });
      } else {
        // Create new content
        await builderApi.createContent(model.name, {
          name: parsedContent.name,
          published: parsedContent.published || 'draft',
          data: normalizedData,
        });
      }

      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {saving && <LoadingSpinner message={content ? 'Updating content...' : 'Creating content...'} fullscreen />}

      {showConfirmation && parsedContent && (
        <ConfirmationModal
          title={content ? 'Update Content' : 'Create Content'}
          message={
            content
              ? `You are about to update "${parsedContent.name}" in production. This will modify the content immediately.`
              : `You are about to create new content "${parsedContent.name}" in production. This will be live immediately.`
          }
          confirmText={content ? 'Update Content' : 'Create Content'}
          itemName={parsedContent.name}
          actionType={content ? 'update' : 'create'}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      <div className="container">
        <div className="mb-lg">
          <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            Cancel
          </button>
        </div>

      <h1>{content ? `Edit ${content.name}` : `Create ${model.name}`}</h1>
      <p className="text-secondary mb-lg">
        Model: {model.name} ({model.kind})
      </p>

      {error && <div className="error">{error}</div>}

      <div className="editor-container" style={{ position: 'relative' }}>
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
          onChange={(e) => {
            setJsonContent(e.target.value);
            setValidationError('');
          }}
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

      <div className="editor-footer">
        {validationError && (
          <div
            className={validationError === 'JSON is valid' ? 'success' : 'error'}
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            {validationError}
          </div>
        )}
        <div className="flex-end">
          <button onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button onClick={validateJson} disabled={saving}>
            Validate JSON
          </button>
          <button className="primary" onClick={handleSaveClick} disabled={saving}>
            {content ? 'Update Content' : 'Create Content'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
