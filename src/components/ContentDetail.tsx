import { useState } from 'react';
import type { BuilderContent, BuilderModel, BuilderField } from '../types/builder';
import { ContentFieldEditor } from './ContentFieldEditor';
import { ConfirmationModal } from './ConfirmationModal';
import { builderApi } from '../services/builderApi';
import { LoadingSpinner } from './LoadingSpinner';

interface ContentDetailProps {
  content: BuilderContent;
  model: BuilderModel;
  onEdit: () => void;
  onBack: () => void;
  onUpdate: () => void;
}

interface DataRowProps {
  fieldName: string;
  fieldValue: any;
  fieldDef?: BuilderField;
  depth?: number;
  path: string[];
  onEditField: (path: string[], value: any) => void;
}

function DataRow({ fieldName, fieldValue, fieldDef, depth = 0, path, onEditField }: DataRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const indent = depth * 24;
  const hasChildren = fieldValue !== null && typeof fieldValue === 'object' && !Array.isArray(fieldValue);
  const isArray = Array.isArray(fieldValue);
  const currentPath = [...path, fieldName];

  // Calculate background color based on nesting depth
  const getDepthBackground = (depth: number, isExpanded: boolean): string => {
    // Expanded parents get a distinct highlight
    if (isExpanded && (hasChildren || isArray)) {
      const expandedBackgrounds = [
        '#2a2a2a',
        '#252525',
        '#202020',
        '#1b1b1b',
        '#161616',
      ];
      return expandedBackgrounds[Math.min(depth, expandedBackgrounds.length - 1)];
    }

    const backgrounds = [
      '#1a1a1a',
      '#181818',
      '#161616',
      '#141414',
      '#121212',
    ];
    return backgrounds[Math.min(depth, backgrounds.length - 1)];
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (hasChildren || isArray) {
      setIsExpanded(!isExpanded);
    } else {
      e.stopPropagation();
      onEditField(currentPath, fieldValue);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditField(currentPath, fieldValue);
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (isArray) return `Array (${value.length} items)`;
    if (hasChildren) return `Object (${Object.keys(value).length} properties)`;
    return String(value);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className={`field-row ${hasChildren || isArray ? 'field-row-expandable' : 'field-row-editable'} ${isExpanded && (hasChildren || isArray) ? 'field-row-sticky' : ''}`}
        style={{
          paddingLeft: `${indent + 16}px`,
          backgroundColor: getDepthBackground(depth, isExpanded),
          position: isExpanded && (hasChildren || isArray) ? 'sticky' : 'relative',
          top: isExpanded && (hasChildren || isArray) ? `${55 + (depth * 44)}px` : 'auto',
          zIndex: isExpanded && (hasChildren || isArray) ? 90 - depth : 'auto',
        }}
        onClick={handleRowClick}
      >
        <div className="field-name">
          {(hasChildren || isArray) && (
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          )}
          {depth > 0 && !hasChildren && !isArray && <span className="child-icon">↳</span>}
          {fieldName}
          <button
            className="edit-icon-button"
            onClick={handleEditClick}
            title={hasChildren || isArray ? "Edit this entire structure" : "Edit this value"}
          >
            ✎
          </button>
        </div>
        <div className="field-type">
          {formatValue(fieldValue)}
          {fieldDef && (
            <span className="text-secondary text-small">
              {' '}
              ({fieldDef.type})
            </span>
          )}
        </div>
        <div className="field-required">
          {fieldDef?.required ? 'required' : 'optional'}
        </div>
      </div>

      {(hasChildren || isArray) && isExpanded && (
        <div className="nested-fields">
          {isArray ? (
            fieldValue.map((item: any, index: number) => (
              <DataRow
                key={index}
                fieldName={`[${index}]`}
                fieldValue={item}
                depth={depth + 1}
                path={currentPath}
                onEditField={onEditField}
              />
            ))
          ) : (
            Object.entries(fieldValue).map(([key, value]) => {
              const subFieldDef = fieldDef?.subFields?.find(f => f.name === key);
              return (
                <DataRow
                  key={key}
                  fieldName={key}
                  fieldValue={value}
                  fieldDef={subFieldDef}
                  depth={depth + 1}
                  path={currentPath}
                  onEditField={onEditField}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function ContentDetail({ content, model, onEdit, onBack, onUpdate }: ContentDetailProps) {
  const [editingField, setEditingField] = useState<{ path: string[]; value: any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEditField = (path: string[], value: any) => {
    setEditingField({ path, value });
    setError('');
    setSuccess('');
  };

  const updateDataAtPath = (data: any, path: string[], newValue: any): any => {
    if (path.length === 1) {
      if (Array.isArray(data)) {
        const index = parseInt(path[0].replace(/[\[\]]/g, ''), 10);
        const newArray = [...data];
        newArray[index] = newValue;
        return newArray;
      }
      return { ...data, [path[0]]: newValue };
    }

    const [current, ...rest] = path;

    if (Array.isArray(data)) {
      const index = parseInt(current.replace(/[\[\]]/g, ''), 10);
      const newArray = [...data];
      newArray[index] = updateDataAtPath(data[index], rest, newValue);
      return newArray;
    }

    return {
      ...data,
      [current]: updateDataAtPath(data[current], rest, newValue)
    };
  };

  const handleSaveField = async (newValue: any) => {
    if (!editingField || !content.id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedData = updateDataAtPath(content.data, editingField.path, newValue);

      await builderApi.updateContent(model.name, content.id, {
        data: updatedData,
      });

      setSuccess(`Field "${editingField.path.join('.')}" updated successfully`);
      setEditingField(null);

      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!content.id) return;

    setDeleting(true);
    setError('');

    try {
      await builderApi.deleteContent(model.name, content.id);
      setShowDeleteConfirmation(false);

      setTimeout(() => {
        onBack();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content');
      setDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(content, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${content.name}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {saving && <LoadingSpinner message="Saving field..." fullscreen />}
      {deleting && <LoadingSpinner message="Deleting content..." fullscreen />}

      {showDeleteConfirmation && !deleting && (
        <ConfirmationModal
          title="Delete Content"
          message={`You are about to delete "${content.name}" from production. This will permanently remove the content and cannot be undone.`}
          confirmText="Delete Content"
          itemName={content.name}
          actionType="delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      <div className="container">
        <div className="mb-lg">
          <button onClick={onBack}>← Back to List</button>
        </div>

      <div className="flex-between mb-lg">
        <div>
          <h1>
            {content.name}
            <span className="badge" style={{ marginLeft: 'var(--spacing-md)' }}>
              {model.name}
            </span>
          </h1>
          <span style={{ display: 'none' }} className="badge">{content.published || 'draft'}</span>
        </div>
        <button
          onClick={() => setShowDeleteConfirmation(true)}
          style={{
            backgroundColor: 'var(--error-color)',
            borderColor: 'var(--error-color)',
            color: '#ffffff',
            fontSize: '16px',
            padding: '8px 12px',
            fontWeight: 'bold'
          }}
          title="Delete Content"
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="grid grid-3 mb-lg">
        <div>
          <strong>Created:</strong> {formatDate(content.createdDate)}
        </div>
        <div>
          <strong>Last Updated:</strong> {formatDate(content.lastUpdated)}
        </div>
      </div>

      <div className="flex-between" style={{ alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Content Data</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport}>
            Export Content
          </button>
          <button
            className="primary"
            onClick={onEdit}
            style={{ backgroundColor: '#4a9eff', borderColor: '#4a9eff', color: '#ffffff', fontWeight: 'bold' }}
          >
            Edit Full JSON
          </button>
        </div>
      </div>
      <p className="text-secondary mb-md">
        Click ✎ to edit any field • Click parent rows to expand/collapse
      </p>
      <div className="field-list mb-lg">
        {Object.entries(content.data).map(([key, value]) => {
          const fieldDef = model.fields.find(f => f.name === key);
          return (
            <DataRow
              key={key}
              fieldName={key}
              fieldValue={value}
              fieldDef={fieldDef}
              path={[]}
              onEditField={handleEditField}
            />
          );
        })}
      </div>

      {editingField && !saving && (
        <ContentFieldEditor
          path={editingField.path}
          value={editingField.value}
          onSave={handleSaveField}
          onCancel={() => setEditingField(null)}
        />
      )}
      </div>
    </>
  );
}
