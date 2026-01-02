import { useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import type { BuilderModel, BuilderField } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { FieldEditor } from './FieldEditor';
import { ConfirmationModal } from './ConfirmationModal';
import { builderApi } from '../services/builderApi';
import { LoadingSpinner } from './LoadingSpinner';

interface ModelDetailProps {
  model: BuilderModel;
  onEdit: () => void;
  onBack: () => void;
  onUpdate: () => void;
}

interface FieldRowProps {
  field: BuilderField;
  depth?: number;
  path: string[];
  onEditField: (field: BuilderField, path: string[]) => void;
}

function FieldRow({ field, depth = 0, path, onEditField }: FieldRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const indent = depth * 24;
  const hasChildren = field.subFields && field.subFields.length > 0;
  const currentPath = [...path, field.name];

  // Calculate background color based on nesting depth
  const getDepthBackground = (depth: number, isExpanded: boolean, isHovered: boolean): string => {
    // Hovered state takes priority
    if (isHovered) {
      const hoverBackgrounds = [
        '#252525',
        '#232323',
        '#212121',
        '#1f1f1f',
        '#1d1d1d',
      ];
      return hoverBackgrounds[Math.min(depth, hoverBackgrounds.length - 1)];
    }

    // Expanded parents get a distinct highlight
    if (isExpanded && hasChildren) {
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
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      e.stopPropagation();
      onEditField(field, currentPath);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditField(field, currentPath);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className={`field-row ${hasChildren ? 'field-row-expandable' : 'field-row-editable'} ${isExpanded && hasChildren ? 'field-row-sticky' : ''}`}
        style={{
          paddingLeft: `${indent + 16}px`,
          backgroundColor: getDepthBackground(depth, isExpanded, isHovered),
          position: isExpanded && hasChildren ? 'sticky' : 'relative',
          top: isExpanded && hasChildren ? `${54 + (depth * 49)}px` : 'auto',
          zIndex: isExpanded && hasChildren ? 104 - depth : 'auto',
          transition: 'background-color 0.15s ease',
        }}
        onClick={handleRowClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="field-name">
          {hasChildren && (
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          )}
          {depth > 0 && !hasChildren && <span className="child-icon">↳</span>}
          {field.name}
          <button
            className="edit-icon-button"
            onClick={handleEditClick}
            title={hasChildren ? "Edit this object and all its children" : "Edit this field"}
          >
            ✎
          </button>
        </div>
        <div className="field-type">
          {field.type}
          {field.subType && ` (${field.subType})`}
          {field.model && ` → ${field.model}`}
          {hasChildren && (
            <span className="text-secondary text-small">
              {' '}
              ({field.subFields?.length} {field.subFields?.length === 1 ? 'field' : 'fields'})
            </span>
          )}
        </div>
        <div className="field-required">
          {field.required ? 'required' : 'optional'}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="nested-fields" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {field.subFields?.map((subField, index) => (
            <FieldRow
              key={index}
              field={subField}
              depth={depth + 1}
              path={currentPath}
              onEditField={onEditField}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModelDetail({ model, onEdit, onBack, onUpdate }: ModelDetailProps) {
  const [editingField, setEditingField] = useState<{ field: BuilderField; path: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEditField = (field: BuilderField, path: string[]) => {
    setEditingField({ field, path });
    setError('');
    setSuccess('');
  };

  const updateFieldInModel = (fields: BuilderField[], path: string[], updatedField: BuilderField): BuilderField[] => {
    if (path.length === 1) {
      return fields.map(f => f.name === path[0] ? updatedField : f);
    }

    return fields.map(f => {
      if (f.name === path[0] && f.subFields) {
        return {
          ...f,
          subFields: updateFieldInModel(f.subFields, path.slice(1), updatedField)
        };
      }
      return f;
    });
  };

  const handleSaveField = async (updatedField: BuilderField) => {
    console.log('handleSaveField called with:', updatedField);
    console.log('editingField:', editingField);
    console.log('model.id:', model.id);

    if (!editingField || !model.id) {
      console.log('Aborting save: missing editingField or model.id');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      console.log('Current model fields:', model.fields);
      console.log('Path to update:', editingField.path);

      const updatedFields = updateFieldInModel(
        model.fields,
        editingField.path,
        updatedField
      );

      console.log('Updated fields:', updatedFields);

      await builderApi.updateModel(model.id, {
        name: model.name,
        kind: model.kind,
        fields: updatedFields,
      });

      console.log('Model updated successfully');
      setSuccess(`Field "${updatedField.name}" updated successfully`);
      setEditingField(null);

      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err) {
      console.error('Error updating field:', err);
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!model.id) return;

    setDeleting(true);
    setError('');

    try {
      await builderApi.deleteModel(model.id);
      setShowDeleteConfirmation(false);

      setTimeout(() => {
        onBack();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
      setDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.name}-model-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {saving && <LoadingSpinner message="Saving field..." fullscreen />}
      {deleting && <LoadingSpinner message="Deleting model..." fullscreen />}

      {showDeleteConfirmation && !deleting && (
        <ConfirmationModal
          title="Delete Model"
          message={`You are about to delete the model "${model.name}" from production. This will permanently remove the model and cannot be undone.`}
          confirmText="Delete Model"
          itemName={model.name}
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
          <h1 title={`Unique identifier: ${model.name}`}>
            {getModelDisplayName(model)}
            <span className="badge" style={{ marginLeft: 'var(--spacing-md)' }}>
              {model.kind}
            </span>
          </h1>
        </div>
        <button
          onClick={() => setShowDeleteConfirmation(true)}
          style={{
            backgroundColor: 'var(--error-color)',
            borderColor: 'var(--error-color)',
            color: '#ffffff',
            fontSize: '16px',
            padding: '8px 12px',
            fontWeight: 'bold',
            visibility: 'hidden'
          }}
          title="Delete Model"
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="flex-between" style={{ alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Fields</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            title="Export Model"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={18} />
          </button>
          <button
            className="primary"
            onClick={onEdit}
            title="Edit Full JSON"
            style={{ backgroundColor: '#4a9eff', borderColor: '#4a9eff', color: '#ffffff', fontWeight: 'bold', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileJson size={18} />
          </button>
        </div>
      </div>
      <p className="text-secondary mb-md">
        Click ✎ to edit any field • Click parent rows to expand/collapse
      </p>
      <div className="field-list mb-lg">
        {model.fields.map((field, index) => (
          <FieldRow
            key={index}
            field={field}
            path={[]}
            onEditField={handleEditField}
          />
        ))}
      </div>

      {editingField && !saving && (
        <FieldEditor
          field={editingField.field}
          onSave={handleSaveField}
          onCancel={() => setEditingField(null)}
        />
      )}
      </div>
    </>
  );
}
