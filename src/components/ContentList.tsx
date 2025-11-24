import { useState, useEffect } from 'react';
import { builderApi } from '../services/builderApi';
import type { BuilderContent, BuilderModel } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { ConfirmationModal } from './ConfirmationModal';
import { LoadingSpinner } from './LoadingSpinner';

interface ContentListProps {
  models: BuilderModel[];
  onViewContent: (content: BuilderContent, model: BuilderModel) => void;
  onCreateNew: (model: BuilderModel) => void;
}

export function ContentList({ models, onViewContent, onCreateNew }: ContentListProps) {
  const [selectedModel, setSelectedModel] = useState<BuilderModel | null>(null);
  const [content, setContent] = useState<BuilderContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [contentToDelete, setContentToDelete] = useState<BuilderContent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Set initial selected model when models change
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const activeModels = models.filter((model) => !model.archived);
      if (activeModels.length > 0) {
        setSelectedModel(activeModels[0]);
      }
    }
  }, [models]);

  useEffect(() => {
    if (selectedModel) {
      loadContent();
    }
  }, [selectedModel]);

  const loadContent = async () => {
    if (!selectedModel) return;

    setLoading(true);
    setError('');
    try {
      const contentData = await builderApi.getContent(selectedModel.name, {
        limit: 100,
      });
      setContent(contentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete?.id || !selectedModel) return;

    setDeleting(true);
    setError('');

    try {
      await builderApi.deleteContent(selectedModel.name, contentToDelete.id);
      setContentToDelete(null);
      loadContent(); // Refresh content list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setDeleting(false);
    }
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

  const filteredContent = content.filter((item) =>
    // Filter out archived content and apply search filter
    item.published !== 'archived' &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && models.length === 0) {
    return <LoadingSpinner message="Loading models..." fullscreen />;
  }

  if (models.length === 0) {
    return (
      <div className="container">
        <h1>Content</h1>
        <p>No models found. Create a model first to manage content.</p>
      </div>
    );
  }

  return (
    <>
      {deleting && <LoadingSpinner message="Deleting content..." fullscreen />}

      {contentToDelete && !deleting && (
        <ConfirmationModal
          title="Delete Content"
          message={`You are about to delete "${contentToDelete.name}" from production. This will permanently remove the content and cannot be undone.`}
          confirmText="Delete Content"
          itemName={contentToDelete.name}
          actionType="delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setContentToDelete(null)}
        />
      )}

      <div className="container">
        <h1>Content</h1>

        {error && <div className="error">{error}</div>}

      <div className="mb-lg">
        <label htmlFor="model-select">Select Model:</label>
        <select
          id="model-select"
          value={selectedModel?.name || ''}
          onChange={(e) => {
            const model = models.find((m) => m.name === e.target.value);
            setSelectedModel(model || null);
          }}
          className="mb-md"
        >
          {models.map((model) => (
            <option key={model.id} value={model.name} title={`Unique identifier: ${model.name}`}>
              {getModelDisplayName(model)} ({model.kind})
            </option>
          ))}
        </select>
      </div>

      {selectedModel && (
        <>
          <div className="flex-between mb-lg">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="primary" onClick={() => onCreateNew(selectedModel)}>
              Create New {selectedModel.name}
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading content..." />
          ) : filteredContent.length === 0 ? (
            <div className="card">
              <p>
                {searchTerm
                  ? 'No content found matching your search.'
                  : `No content entries found for ${selectedModel.name}. Create one to get started.`}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredContent.map((item) => (
                  <tr
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewContent(item, selectedModel)}
                  >
                    <td>{item.name}</td>
                    <td>
                      <span className="badge">
                        {item.published || 'draft'}
                      </span>
                    </td>
                    <td className="text-secondary">
                      {formatDate(item.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      </div>
    </>
  );
}
