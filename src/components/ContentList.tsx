import { useState, useEffect, useMemo } from 'react';
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

type SortOption = 'name-asc' | 'name-desc' | 'status' | 'created' | 'updated';

export function ContentList({ models, onViewContent, onCreateNew }: ContentListProps) {
  const [selectedModel, setSelectedModel] = useState<BuilderModel | null>(null);
  const [content, setContent] = useState<BuilderContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [contentToDelete, setContentToDelete] = useState<BuilderContent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const handleExportAll = () => {
    if (!selectedModel) return;

    const dataStr = JSON.stringify(content, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedModel.name}-content-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModel) return;

    setImporting(true);
    setError('');

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Support both single content and array of content
      const contentToImport = Array.isArray(importedData) ? importedData : [importedData];

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const contentData of contentToImport) {
        try {
          // Validate required fields
          if (!contentData.name || !contentData.data) {
            throw new Error('Invalid content format: missing name or data');
          }

          // Create the content (remove id if present to create new)
          await builderApi.createContent(selectedModel.name, {
            name: contentData.name,
            data: contentData.data,
            published: contentData.published || 'draft',
          });
          successCount++;
        } catch (err) {
          errorCount++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${contentData.name || 'Unknown'}: ${errorMsg}`);
        }
      }

      // Show results
      if (successCount > 0) {
        loadContent(); // Refresh the content list
      }

      if (errorCount === 0) {
        alert(`Successfully imported ${successCount} content entr${successCount === 1 ? 'y' : 'ies'}`);
      } else {
        alert(
          `Import completed:\n✓ ${successCount} successful\n✗ ${errorCount} failed\n\nErrors:\n${errors.join('\n')}`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to import content. Invalid JSON format.'
      );
    } finally {
      setImporting(false);
      // Reset the input so the same file can be selected again
      event.target.value = '';
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

  const { filteredContent, totalPages, totalCount } = useMemo(() => {
    // Filter out archived content and apply search filter
    const searched = content.filter(
      (item) =>
        item.published !== 'archived' &&
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    const sorted = [...searched].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'status':
          const statusOrder = { published: 0, draft: 1 };
          const aStatus = (a.published || 'draft') as 'published' | 'draft';
          const bStatus = (b.published || 'draft') as 'published' | 'draft';
          return statusOrder[aStatus] - statusOrder[bStatus];
        case 'created':
          return (b.createdDate || 0) - (a.createdDate || 0); // Most recent first
        case 'updated':
          return (b.lastUpdated || 0) - (a.lastUpdated || 0); // Most recent first
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
      filteredContent: paginated,
      totalPages,
      totalCount,
    };
  }, [content, searchTerm, sortBy, currentPage, pageSize]);

  // Reset to page 1 when search, sort, or model changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, selectedModel]);

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
      {importing && <LoadingSpinner message="Importing content..." fullscreen />}

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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="sort-content" style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                  Sort by:
                </label>
                <select
                  id="sort-content"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{ minWidth: '160px' }}
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="status">Status</option>
                  <option value="created">Date Created</option>
                  <option value="updated">Last Updated</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="file"
                id="import-content"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button onClick={() => document.getElementById('import-content')?.click()}>
                Import Content
              </button>
              <button onClick={handleExportAll} disabled={content.length === 0}>
                Export All Content
              </button>
              <button className="primary" onClick={() => onCreateNew(selectedModel)}>
                Create New {selectedModel.name}
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading content..." />
          ) : totalCount === 0 ? (
            <div className="card">
              <p>
                {searchTerm
                  ? 'No content found matching your search.'
                  : `No content entries found for ${selectedModel.name}. Create one to get started.`}
              </p>
            </div>
          ) : (
            <>
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
                      <label htmlFor="content-page-size" style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                        Per page:
                      </label>
                      <select
                        id="content-page-size"
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
                      style={{ padding: '6px 12px' }}
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
                      style={{ padding: '6px 12px' }}
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
