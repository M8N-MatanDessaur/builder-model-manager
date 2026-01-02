import { useState, useMemo, useEffect } from 'react';
import { Plus, Upload, Download, Network, List } from 'lucide-react';
import { builderApi } from '../services/builderApi';
import type { BuilderModel } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';
import { ModelRelationshipTable } from './ModelRelationshipTable';

interface ModelListProps {
  models: BuilderModel[];
  loading: boolean;
  onViewModel: (model: BuilderModel) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'kind' | 'fields' | 'updated';
type ViewMode = 'table' | 'relationships';

export function ModelList({ models, loading, onViewModel, onCreateNew, onRefresh }: ModelListProps) {
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modelToDelete, setModelToDelete] = useState<BuilderModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

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

  const { filteredModels, totalPages, totalCount } = useMemo(() => {
    // Filter out archived models first
    const activeModels = models.filter((model) => !model.archived);

    // Apply search filter
    const term = searchTerm.toLowerCase();
    const searched = searchTerm
      ? activeModels.filter(
          (model) =>
            model.name.toLowerCase().includes(term) ||
            model.kind.toLowerCase().includes(term)
        )
      : activeModels;

    // Apply sorting
    const sorted = [...searched].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'kind':
          return a.kind.localeCompare(b.kind);
        case 'fields':
          return b.fields.length - a.fields.length; // Most fields first
        case 'updated':
          const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return bTime - aTime; // Most recent first
        default:
          return 0;
      }
    });

    // Apply pagination
    const totalCount = sorted.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = sorted.slice(startIndex, endIndex);

    return {
      filteredModels: paginated,
      totalPages,
      totalCount,
    };
  }, [models, searchTerm, sortBy, currentPage, pageSize]);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  if (loading) {
    return <LoadingSpinner message="Loading models..." fullscreen />;
  }

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
                backgroundColor: viewMode === 'table' ? '#00aaff' : 'transparent',
                borderColor: viewMode === 'table' ? '#00aaff' : '#666',
                color: viewMode === 'table' ? '#000' : '#999',
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
                backgroundColor: viewMode === 'relationships' ? '#00aaff' : 'transparent',
                borderColor: viewMode === 'relationships' ? '#00aaff' : '#666',
                color: viewMode === 'relationships' ? '#000' : '#999',
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

      {viewMode === 'relationships' ? (
        <ModelRelationshipTable models={models} onSelectModel={onViewModel} />
      ) : (
        <>
          <div className="search-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sort-models" style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                Sort by:
              </label>
              <select
                id="sort-models"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{ minWidth: '160px' }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="kind">Type</option>
                <option value="fields">Fields Count</option>
              </select>
            </div>
          </div>

          {totalCount === 0 ? (
        <div className="card">
          <p className="text-secondary">
            {searchTerm
              ? 'No models found matching your search.'
              : 'No models found. Create your first model to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {filteredModels.map((model) => (
              <div
                key={model.id}
                onClick={() => onViewModel(model)}
                style={{
                  border: '1px solid #333',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#0a0a0a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px',
                  minHeight: '140px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00aaff';
                  e.currentTarget.style.backgroundColor = '#0f0f0f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.backgroundColor = '#0a0a0a';
                }}
              >
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  lineHeight: '1.3',
                  color: '#fff',
                  wordBreak: 'break-word'
                }} title={`Unique identifier: ${model.name}`}>
                  {getModelDisplayName(model)}
                </h3>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto'
                }}>
                  <span className="badge" style={{ fontSize: '12px' }}>{model.kind}</span>
                  <span style={{ fontSize: '14px', color: '#999' }}>
                    {model.fields.length} {model.fields.length === 1 ? 'field' : 'fields'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '12px',
              borderTop: '1px solid #333'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#999' }}>
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="page-size" style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                    Per page:
                  </label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ minWidth: '80px' }}
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '8px 12px' }}
                >
                  Previous
                </button>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '14px'
                }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '8px 12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}
    </div>
    </>
  );
}
