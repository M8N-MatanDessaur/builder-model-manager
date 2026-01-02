import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { BuilderModel } from '../types/builder';
import { getModelDisplayName } from '../types/builder';

interface ModelRelationshipTableProps {
  models: BuilderModel[];
  onSelectModel: (model: BuilderModel) => void;
}

interface Relationship {
  fromModel: string;
  toModel: string;
  fieldPath: string;
  fieldType: string;
}

export function ModelRelationshipTable({ models, onSelectModel }: ModelRelationshipTableProps) {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  const toggleModel = (modelName: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(modelName)) {
      newExpanded.delete(modelName);
    } else {
      newExpanded.add(modelName);
    }
    setExpandedModels(newExpanded);
  };

  const relationships = useMemo(() => {
    const activeModels = models.filter(m => !m.archived);
    const rels: Relationship[] = [];

    // Extract all relationships - recursively traverse ALL nested levels
    activeModels.forEach(model => {
      const extractReferences = (fields: any[], parentPath = '') => {
        if (!fields || !Array.isArray(fields)) return;

        fields.forEach(field => {
          if (!field || !field.name) return;

          const currentPath = parentPath ? `${parentPath}.${field.name}` : field.name;

          // Get the model name from field.model or field.defaultValue.model
          const modelName = field.model || field.defaultValue?.model;

          // Check if field has a model property (indicates a reference)
          if (modelName && typeof modelName === 'string') {
            rels.push({
              fromModel: model.name,
              toModel: modelName,
              fieldPath: currentPath,
              fieldType: field.type || 'unknown',
            });
          }

          // Recursively check subFields at ANY depth
          if (field.subFields) {
            extractReferences(field.subFields, currentPath);
          }

          // Some fields might have nested structure in other properties
          // Check if the field itself is an object with properties
          if (field.type === 'object' && !field.subFields) {
            // Try to find subFields in common property names
            const potentialSubFields = field.fields || field.properties || field.children;
            if (potentialSubFields) {
              extractReferences(potentialSubFields, currentPath);
            }
          }
        });
      };

      // Start extraction from root fields
      if (model.fields && Array.isArray(model.fields)) {
        extractReferences(model.fields);
      }
    });

    return rels;
  }, [models]);

  const modelRelationships = useMemo(() => {
    const activeModels = models.filter(m => !m.archived);
    const result: Record<string, {
      model: BuilderModel;
      outgoing: Relationship[];
      incoming: Relationship[];
    }> = {};

    activeModels.forEach(model => {
      result[model.name] = {
        model,
        outgoing: relationships.filter(r => r.fromModel === model.name),
        incoming: relationships.filter(r => r.toModel === model.name),
      };
    });

    return result;
  }, [models, relationships]);

  const sortedModels = useMemo(() => {
    return Object.values(modelRelationships)
      .filter(({ outgoing }) => outgoing.length > 0) // Only show models with outgoing references
      .sort((a, b) => b.outgoing.length - a.outgoing.length) // Most references first
      .map(({ model, outgoing, incoming }) => ({ model, outgoing, incoming }));
  }, [modelRelationships]);

  return (
    <div style={{
      width: '100%',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      backgroundColor: '#0a0a0a',
      border: '1px solid #333',
    }}>
      {/* Summary */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <h3 style={{ margin: 0, marginBottom: '8px' }}>Model Relationships</h3>
        <div style={{ fontSize: '14px', color: '#999' }}>
          <span><strong>{sortedModels.length}</strong> models, </span>
          <span><strong>{relationships.length}</strong> relationships</span>
        </div>
      </div>

      {/* Models Table */}
      <div>
        {sortedModels.map(({ model, outgoing, incoming }) => {
          const isExpanded = expandedModels.has(model.name);

          return (
            <div key={model.name} style={{ borderBottom: '1px solid #333' }}>
              {/* Model Header */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: isExpanded ? '#1a1a1a' : '#0a0a0a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onClick={() => toggleModel(model.name)}
              >
                <div style={{ width: '20px', display: 'flex', alignItems: 'center' }}>
                  {isExpanded ? <ChevronDown size={20} color="#00aaff" /> : <ChevronRight size={20} color="#999" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <strong style={{ fontSize: '15px' }}>{getModelDisplayName(model)}</strong>
                    <span className="badge" style={{ fontSize: '11px' }}>{model.kind}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {model.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ color: '#00aaff' }}>
                    <strong>{outgoing.length}</strong> <span style={{ color: '#666' }}>{outgoing.length === 1 ? 'reference' : 'references'}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectModel(model);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  title="View Model Details"
                >
                  View
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ backgroundColor: '#0f0f0f', padding: '16px' }}>
                  {/* Outgoing References */}
                  {outgoing.length > 0 && (
                    <div style={{ marginBottom: incoming.length > 0 ? '20px' : 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: '#00aaff',
                      }}>
                        References ({outgoing.length}):
                      </div>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#1a1a1a' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Field</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Referenced Model</th>
                          </tr>
                        </thead>
                        <tbody>
                          {outgoing.map((rel, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #222' }}>
                              <td style={{ padding: '8px', fontFamily: 'monospace', color: '#00aaff' }}>
                                {rel.fieldPath}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className="badge" style={{ fontSize: '10px' }}>{rel.fieldType}</span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <button
                                  onClick={() => {
                                    const targetModel = models.find(m => m.name === rel.toModel);
                                    if (targetModel) onSelectModel(targetModel);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #00aaff',
                                    color: '#00aaff',
                                  }}
                                >
                                  {getModelDisplayName(models.find(m => m.name === rel.toModel) || { name: rel.toModel } as any)}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Incoming References */}
                  {incoming.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: '#00ff88',
                      }}>
                        Referenced By ({incoming.length}):
                      </div>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#1a1a1a' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Model</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Field</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incoming.map((rel, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #222' }}>
                              <td style={{ padding: '8px' }}>
                                <button
                                  onClick={() => {
                                    const targetModel = models.find(m => m.name === rel.fromModel);
                                    if (targetModel) onSelectModel(targetModel);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #00ff88',
                                    color: '#00ff88',
                                  }}
                                >
                                  {getModelDisplayName(models.find(m => m.name === rel.fromModel) || { name: rel.fromModel } as any)}
                                </button>
                              </td>
                              <td style={{ padding: '8px', fontFamily: 'monospace', color: '#00ff88' }}>
                                {rel.fieldPath}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className="badge" style={{ fontSize: '10px' }}>{rel.fieldType}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
