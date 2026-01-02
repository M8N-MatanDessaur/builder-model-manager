import { useState, useEffect, useMemo } from 'react';
import { builderApi } from '../services/builderApi';
import type { BuilderModel, BuilderContent } from '../types/builder';
import { getModelDisplayName } from '../types/builder';
import { LoadingSpinner } from './LoadingSpinner';

interface GlobalSearchProps {
  models: BuilderModel[];
  onSelectModel: (model: BuilderModel) => void;
  onSelectContent: (content: BuilderContent, model: BuilderModel) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function GlobalSearch({
  models,
  onSelectModel,
  onSelectContent,
  onClose,
  isOpen,
}: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentResults, setContentResults] = useState<Array<{ content: BuilderContent; model: BuilderModel }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter models by search term
  const modelResults = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return models.filter(
      (model) =>
        !model.archived &&
        (model.name.toLowerCase().includes(term) ||
          model.kind.toLowerCase().includes(term) ||
          getModelDisplayName(model).toLowerCase().includes(term))
    );
  }, [models, searchTerm]);

  // Search content across all models
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setContentResults([]);
      return;
    }

    const searchContent = async () => {
      setLoading(true);
      const results: Array<{ content: BuilderContent; model: BuilderModel }> = [];

      try {
        // Search in parallel across all active models
        const activeModels = models.filter((m) => !m.archived);
        const searches = activeModels.map(async (model) => {
          try {
            const content = await builderApi.getContent(model.name, { limit: 100 });
            const term = searchTerm.toLowerCase();

            // Filter content by name or data values
            const filtered = content.filter((item) => {
              if (item.name.toLowerCase().includes(term)) return true;

              // Search in data values (shallow search)
              const dataStr = JSON.stringify(item.data).toLowerCase();
              return dataStr.includes(term);
            });

            return filtered.map((c) => ({ content: c, model }));
          } catch {
            return [];
          }
        });

        const allResults = await Promise.all(searches);
        results.push(...allResults.flat());

        setContentResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchContent, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchTerm, models]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [modelResults, contentResults]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalResults = modelResults.length + contentResults.length;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalResults);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalResults) % totalResults);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < modelResults.length) {
          onSelectModel(modelResults[selectedIndex]);
          onClose();
        } else {
          const contentIndex = selectedIndex - modelResults.length;
          const result = contentResults[contentIndex];
          if (result) {
            onSelectContent(result.content, result.model);
            onClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modelResults, contentResults, selectedIndex, onSelectModel, onSelectContent, onClose]);

  if (!isOpen) return null;

  const totalResults = modelResults.length + contentResults.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #00aaff',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
          <input
            type="text"
            placeholder="Search models and content... (ESC to close)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              fontSize: '18px',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              color: '#fff',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {loading && <LoadingSpinner message="Searching..." />}

          {!loading && searchTerm && totalResults === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No results found for "{searchTerm}"
            </div>
          )}

          {!loading && !searchTerm && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              Start typing to search models and content...
            </div>
          )}

          {!loading && totalResults > 0 && (
            <>
              {/* Model Results */}
              {modelResults.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Models ({modelResults.length})
                  </h3>
                  {modelResults.map((model, index) => (
                    <div
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model);
                        onClose();
                      }}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: index === selectedIndex ? '#2a2a2a' : 'transparent',
                        border: index === selectedIndex ? '1px solid #00aaff' : '1px solid #333',
                        borderRadius: '4px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {getModelDisplayName(model)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        <span className="badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          {model.kind}
                        </span>
                        <span style={{ marginLeft: '8px' }}>{model.fields.length} fields</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content Results */}
              {contentResults.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Content ({contentResults.length})
                  </h3>
                  {contentResults.map((result, index) => {
                    const globalIndex = modelResults.length + index;
                    return (
                      <div
                        key={result.content.id}
                        onClick={() => {
                          onSelectContent(result.content, result.model);
                          onClose();
                        }}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: globalIndex === selectedIndex ? '#2a2a2a' : 'transparent',
                          border: globalIndex === selectedIndex ? '1px solid #00aaff' : '1px solid #333',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.1s',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {result.content.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          <span className="badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                            {result.model.name}
                          </span>
                          <span style={{ marginLeft: '8px' }}>{result.content.published || 'draft'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #333',
            fontSize: '12px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>↑↓ Navigate • Enter to select • ESC to close</span>
          <span>{totalResults} results</span>
        </div>
      </div>
    </div>
  );
}
