import { useState, useMemo, useEffect } from 'react';
import { Plus, Upload, Download, Network, List, FileJson, ChevronDown, ChevronRight, CornerDownRight, Pencil, FileText } from 'lucide-react';
import { builderApi } from '../services/builderApi';
import type { BuilderModel, BuilderField } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';
import { ModelRelationshipTable } from './ModelRelationshipTable';
import { FieldEditor } from './FieldEditor';
import { AIInsight } from './AIInsight';

interface ModelListProps {
  models: BuilderModel[];
  loading: boolean;
  onViewModel: (model: BuilderModel) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
  onViewContentEntries: (model: BuilderModel) => void;
}

type ViewMode = 'table' | 'relationships';

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
            <span className="expand-icon">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
          {depth > 0 && !hasChildren && (
            <span className="child-icon">
              <CornerDownRight size={14} />
            </span>
          )}
          {field.name}
          <button
            className="edit-icon-button"
            onClick={handleEditClick}
            title={hasChildren ? "Edit this object and all its children" : "Edit this field"}
          >
            <Pencil size={14} />
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

export function ModelList({ models, loading, onViewModel, onCreateNew, onRefresh, onViewContentEntries }: ModelListProps) {
  const [selectedModel, setSelectedModel] = useState<BuilderModel | null>(null);
  const [error, setError] = useState('');
  const [modelToDelete, setModelToDelete] = useState<BuilderModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editingField, setEditingField] = useState<{ field: BuilderField; path: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [allModels, setAllModels] = useState<BuilderModel[]>([]);

  // Set initial selected model when models change
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const activeModels = models.filter((model) => !model.archived);
      if (activeModels.length > 0) {
        setSelectedModel(activeModels[0]);
      }
    }
  }, [models]);

  // Load all models for AI context
  useEffect(() => {
    setAllModels(models);
  }, [models]);

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
    if (!editingField || !selectedModel?.id) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedFields = updateFieldInModel(
        selectedModel.fields,
        editingField.path,
        updatedField
      );

      await builderApi.updateModel(selectedModel.id, {
        name: selectedModel.name,
        kind: selectedModel.kind,
        fields: updatedFields,
      });

      setSuccess(`Field "${updatedField.name}" updated successfully`);
      setEditingField(null);

      setTimeout(() => {
        onRefresh();
        if (selectedModel.id) {
          builderApi.getModel(selectedModel.id).then(updated => {
            setSelectedModel(updated);
          });
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleExportModel = (model: BuilderModel) => {
    const dataStr = JSON.stringify(model, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.name}-model-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = async () => {
    if (!modelToDelete?.id) return;

    setDeleting(true);
    setError('');

    try {
      await builderApi.deleteModel(modelToDelete.id);
      setModelToDelete(null);
      onRefresh(); // Refresh the models list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportAll = () => {
    const activeModels = models.filter((model) => !model.archived);
    const dataStr = JSON.stringify(activeModels, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `builder-models-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Support both single model and array of models
      const modelsToImport = Array.isArray(importedData) ? importedData : [importedData];

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const modelData of modelsToImport) {
        try {
          // Validate required fields
          if (!modelData.name || !modelData.kind || !modelData.fields) {
            throw new Error('Invalid model format: missing name, kind, or fields');
          }

          // Create the model (remove id if present to create new)
          await builderApi.createModel({
            name: modelData.name,
            kind: modelData.kind,
            fields: modelData.fields,
          });
          successCount++;
        } catch (err) {
          errorCount++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${modelData.name || 'Unknown'}: ${errorMsg}`);
        }
      }

      // Show results
      if (successCount > 0) {
        onRefresh(); // Refresh the models list
      }

      if (errorCount === 0) {
        alert(`Successfully imported ${successCount} model(s)`);
      } else {
        alert(
          `Import completed:\n✓ ${successCount} successful\n✗ ${errorCount} failed\n\nErrors:\n${errors.join('\n')}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to import models. Invalid JSON format.'
      );
    } finally {
      setImporting(false);
      // Reset the input so the same file can be selected again
      event.target.value = '';
    }
  };


  const activeModels = useMemo(() => {
    return models.filter((model) => !model.archived);
  }, [models]);

  if (loading && models.length === 0) {
    return <LoadingSpinner message="Loading models..." fullscreen />;
  }

  if (models.length === 0) {
    return (
      <div className="container">
        <h1>Content Models</h1>
        <p>No models found. Create your first model to get started.</p>
      </div>
    );
  }

  // Show relationships view in full-width container
  if (viewMode === 'relationships') {
    return (
      <>
        {deleting && <LoadingSpinner message="Deleting model..." fullscreen />}
        {importing && <LoadingSpinner message="Importing models..." fullscreen />}

        {modelToDelete && !deleting && (
          <ConfirmationModal
            title="Delete Model"
            message={`You are about to delete the model "${modelToDelete.name}" from production. This will permanently remove the model and cannot be undone.`}
            confirmText="Delete Model"
            itemName={modelToDelete.name}
            actionType="delete"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setModelToDelete(null)}
          />
        )}

        <div className="container">
          <div className="flex-between mb-lg">
            <h1>Content Models</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* View Mode Toggle */}
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  borderColor: '#666',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('relationships')}
                title="Relationships"
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#00aaff',
                  borderColor: '#00aaff',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: '4px',
                }}
              >
                <Network size={18} />
              </button>

              <input
                type="file"
                id="import-models"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => document.getElementById('import-models')?.click()}
                title="Import Models"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={18} />
              </button>
              <button
                onClick={handleExportAll}
                disabled={models.length === 0}
                title="Export All Models"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={18} />
              </button>
              <button
                className="primary"
                onClick={onCreateNew}
                title="Create New Model"
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <ModelRelationshipTable models={models} onSelectModel={onViewModel} />
        </div>
      </>
    );
  }

  // Split-panel layout for table view
  return (
    <>
      {deleting && <LoadingSpinner message="Deleting model..." fullscreen />}
      {importing && <LoadingSpinner message="Importing models..." fullscreen />}
      {saving && <LoadingSpinner message="Saving field..." fullscreen />}

      {modelToDelete && !deleting && (
        <ConfirmationModal
          title="Delete Model"
          message={`You are about to delete the model "${modelToDelete.name}" from production. This will permanently remove the model and cannot be undone.`}
          confirmText="Delete Model"
          itemName={modelToDelete.name}
          actionType="delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setModelToDelete(null)}
        />
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '280px',
          borderRight: '2px solid #333',
          overflowY: 'auto',
          backgroundColor: '#0a0a0a',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: 0 }}>Models</h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#00aaff',
                  borderColor: '#00aaff',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                }}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('relationships')}
                title="Relationships"
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  borderColor: '#666',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                }}
              >
                <Network size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeModels.map((model) => (
              <div
                key={model.id}
                onClick={() => setSelectedModel(model)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: selectedModel?.id === model.id ? '#1a1a1a' : 'transparent',
                  border: selectedModel?.id === model.id ? '1px solid #00aaff' : '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedModel?.id !== model.id) {
                    e.currentTarget.style.backgroundColor = '#151515';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedModel?.id !== model.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  fontWeight: selectedModel?.id === model.id ? 'bold' : 'normal',
                  color: '#fff',
                  marginBottom: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ wordBreak: 'break-word' }}>{getModelDisplayName(model)}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  <span className="badge" style={{ fontSize: '11px', padding: '2px 6px' }}>{model.kind}</span>
                  <span style={{ marginLeft: '8px' }}>{model.fields.length} fields</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 40px' }}>
          {!selectedModel ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '18px'
            }}>
              Select a model from the sidebar to view details
            </div>
          ) : (
            <>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}

              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ marginBottom: '8px' }} title={`Unique identifier: ${selectedModel.name}`}>
                  {getModelDisplayName(selectedModel)}
                  <span className="badge" style={{ marginLeft: '12px', fontSize: '14px' }}>
                    {selectedModel.kind}
                  </span>
                </h1>
                <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                  View and edit the model schema
                </p>
              </div>

              <div className="flex-between mb-lg">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="file"
                    id="import-models"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => document.getElementById('import-models')?.click()}
                    title="Import Models"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={handleExportAll}
                    disabled={models.length === 0}
                    title="Export All Models"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    className="primary"
                    onClick={onCreateNew}
                    title="Create New Model"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('View Content clicked, model:', selectedModel.name);
                      onViewContentEntries(selectedModel);
                    }}
                    title="View Content Entries"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d7a3e', borderColor: '#2d7a3e', color: '#ffffff' }}
                  >
                    <FileText size={18} />
                    <span>View Content</span>
                  </button>
                  <button
                    onClick={() => handleExportModel(selectedModel)}
                    title="Export Model"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={18} />
                  </button>
                </div>
              </div>

              <AIInsight
                context={{
                  type: 'model',
                  model: selectedModel,
                  allModels: allModels,
                }}
                position="top"
              />

              <div className="flex-between" style={{ alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <div>
                  <h2 style={{ marginBottom: 0 }}>Fields</h2>
                </div>
              </div>
              <p className="text-secondary mb-md" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Click <Pencil size={14} style={{ display: 'inline' }} /> to edit any field • Click parent rows to expand/collapse
              </p>
              <div className="field-list mb-lg">
                {selectedModel.fields.map((field, index) => (
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
