import { useState, useMemo } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import type { BuilderContent, BuilderModel } from '../types/builder';

interface ContentComparisonProps {
  leftContent: BuilderContent;
  rightContent: BuilderContent;
  model: BuilderModel;
  onClose: () => void;
}

type DiffType = 'equal' | 'modified' | 'added' | 'removed';

interface DiffResult {
  path: string;
  leftValue: any;
  rightValue: any;
  type: DiffType;
}

export function ContentComparison({ leftContent, rightContent, onClose }: ContentComparisonProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const diffs = useMemo(() => {
    const results: DiffResult[] = [];

    const compareObjects = (left: any, right: any, path: string = '') => {
      const leftKeys = left && typeof left === 'object' ? Object.keys(left) : [];
      const rightKeys = right && typeof right === 'object' ? Object.keys(right) : [];
      const allKeys = new Set([...leftKeys, ...rightKeys]);

      allKeys.forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        const leftVal = left?.[key];
        const rightVal = right?.[key];

        const leftExists = left && key in left;
        const rightExists = right && key in right;

        if (!leftExists && rightExists) {
          results.push({ path: currentPath, leftValue: undefined, rightValue: rightVal, type: 'added' });
        } else if (leftExists && !rightExists) {
          results.push({ path: currentPath, leftValue: leftVal, rightValue: undefined, type: 'removed' });
        } else if (leftExists && rightExists) {
          const leftIsObj = leftVal !== null && typeof leftVal === 'object';
          const rightIsObj = rightVal !== null && typeof rightVal === 'object';

          if (leftIsObj && rightIsObj && !Array.isArray(leftVal) && !Array.isArray(rightVal)) {
            compareObjects(leftVal, rightVal, currentPath);
          } else if (Array.isArray(leftVal) && Array.isArray(rightVal)) {
            if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) {
              results.push({ path: currentPath, leftValue: leftVal, rightValue: rightVal, type: 'modified' });
            } else {
              results.push({ path: currentPath, leftValue: leftVal, rightValue: rightVal, type: 'equal' });
            }
          } else {
            const isDifferent = JSON.stringify(leftVal) !== JSON.stringify(rightVal);
            results.push({
              path: currentPath,
              leftValue: leftVal,
              rightValue: rightVal,
              type: isDifferent ? 'modified' : 'equal',
            });
          }
        }
      });
    };

    compareObjects(leftContent.data, rightContent.data);
    return results;
  }, [leftContent, rightContent]);

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `Array (${value.length} items)`;
    if (typeof value === 'object') return `Object (${Object.keys(value).length} properties)`;
    return String(value);
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

  const getDiffColor = (type: DiffType): string => {
    switch (type) {
      case 'added': return '#00ff8822';
      case 'removed': return '#ff444422';
      case 'modified': return '#00aaff22';
      default: return 'transparent';
    }
  };

  const getDiffBorderColor = (type: DiffType): string => {
    switch (type) {
      case 'added': return '#00ff88';
      case 'removed': return '#ff4444';
      case 'modified': return '#00aaff';
      default: return '#333';
    }
  };

  const changesCount = diffs.filter(d => d.type !== 'equal').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
      }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '8px' }}>Content Comparison</h2>
          <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
            {changesCount} {changesCount === 1 ? 'difference' : 'differences'} found
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Close Comparison"
        >
          <X size={18} />
        </button>
      </div>

      {/* Comparison Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '16px',
        padding: '16px 20px',
        borderBottom: '1px solid #333',
        backgroundColor: '#0a0a0a',
      }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '16px' }}>{leftContent.name}</h3>
          <div style={{ fontSize: '12px', color: '#999' }}>
            <div><strong>Status:</strong> <span className="badge" style={{ marginLeft: '4px' }}>{leftContent.published || 'draft'}</span></div>
            <div><strong>Last Updated:</strong> {formatDate(leftContent.lastUpdated)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <ArrowLeftRight size={24} color="#666" />
        </div>
        <div>
          <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '16px' }}>{rightContent.name}</h3>
          <div style={{ fontSize: '12px', color: '#999' }}>
            <div><strong>Status:</strong> <span className="badge" style={{ marginLeft: '4px' }}>{rightContent.published || 'draft'}</span></div>
            <div><strong>Last Updated:</strong> {formatDate(rightContent.lastUpdated)}</div>
          </div>
        </div>
      </div>

      {/* Diff Legend */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: getDiffColor('added'), border: `1px solid ${getDiffBorderColor('added')}` }} />
          <span>Added</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: getDiffColor('removed'), border: `1px solid ${getDiffBorderColor('removed')}` }} />
          <span>Removed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: getDiffColor('modified'), border: `1px solid ${getDiffBorderColor('modified')}` }} />
          <span>Modified</span>
        </div>
      </div>

      {/* Comparison Body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {diffs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            No data fields found in these content entries.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {diffs.map((diff, index) => {
              const isExpanded = expandedPaths.has(diff.path);
              const hasComplexValue =
                (diff.leftValue !== null && typeof diff.leftValue === 'object') ||
                (diff.rightValue !== null && typeof diff.rightValue === 'object');

              return (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '16px',
                    backgroundColor: getDiffColor(diff.type),
                    border: `1px solid ${getDiffBorderColor(diff.type)}`,
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                  }}
                >
                  {/* Field Path */}
                  <div style={{
                    gridColumn: '1 / -1',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: '#00aaff',
                    cursor: hasComplexValue ? 'pointer' : 'default',
                  }}
                  onClick={() => hasComplexValue && togglePath(diff.path)}
                  >
                    {diff.path}
                    {hasComplexValue && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', color: '#999' }}>
                        {isExpanded ? '▼' : '▶'} Click to {isExpanded ? 'collapse' : 'expand'}
                      </span>
                    )}
                  </div>

                  {/* Left Value */}
                  <div style={{
                    padding: '8px',
                    backgroundColor: diff.type === 'removed' ? '#ff444411' : '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    minHeight: '40px',
                  }}>
                    {diff.leftValue === undefined ? (
                      <span style={{ color: '#666', fontStyle: 'italic' }}>Not present</span>
                    ) : isExpanded ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(diff.leftValue, null, 2)}
                      </pre>
                    ) : (
                      <span>{formatValue(diff.leftValue)}</span>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                  }}>
                    {diff.type === 'equal' ? '=' : '≠'}
                  </div>

                  {/* Right Value */}
                  <div style={{
                    padding: '8px',
                    backgroundColor: diff.type === 'added' ? '#00ff8811' : '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    minHeight: '40px',
                  }}>
                    {diff.rightValue === undefined ? (
                      <span style={{ color: '#666', fontStyle: 'italic' }}>Not present</span>
                    ) : isExpanded ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(diff.rightValue, null, 2)}
                      </pre>
                    ) : (
                      <span>{formatValue(diff.rightValue)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
