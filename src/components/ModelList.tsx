import { useState, useMemo } from 'react';
import { builderApi } from '../services/builderApi';
import type { BuilderModel } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';

interface ModelListProps {
  models: BuilderModel[];
  loading: boolean;
  onViewModel: (model: BuilderModel) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export function ModelList({ models, loading, onViewModel, onCreateNew, onRefresh }: ModelListProps) {
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modelToDelete, setModelToDelete] = useState<BuilderModel | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const filteredModels = useMemo(() => {
    // Filter out archived models first
    const activeModels = models.filter((model) => !model.archived);

    // Then apply search filter
    if (!searchTerm) return activeModels;
    const term = searchTerm.toLowerCase();
    return activeModels.filter(
      (model) =>
        model.name.toLowerCase().includes(term) ||
        model.kind.toLowerCase().includes(term)
    );
  }, [models, searchTerm]);

  if (loading) {
    return <LoadingSpinner message="Loading models..." fullscreen />;
  }

  return (
    <>
      {deleting && <LoadingSpinner message="Deleting model..." fullscreen />}

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
          <button className="primary" onClick={onCreateNew}>
            Create New Model
          </button>
        </div>

      {error && <div className="error">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search models..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredModels.length === 0 ? (
        <div className="card">
          <p className="text-secondary">
            {searchTerm
              ? 'No models found matching your search.'
              : 'No models found. Create your first model to get started.'}
          </p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Type</th>
              <th>Fields Count</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((model) => (
              <tr
                key={model.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onViewModel(model)}
              >
                <td>
                  <span title={`Unique identifier: ${model.name}`}>
                    {getModelDisplayName(model)}
                  </span>
                </td>
                <td>
                  <span className="badge">{model.kind}</span>
                </td>
                <td>{model.fields.length}</td>
                <td className="text-small text-secondary">
                  {model.lastUpdated
                    ? new Date(model.lastUpdated).toLocaleDateString()
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </>
  );
}
