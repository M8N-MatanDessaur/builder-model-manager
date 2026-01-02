import { useMemo, useState, useRef } from 'react';
import type { BuilderModel } from '../types/builder';
import { getModelDisplayName } from '../types/builder';

interface ModelRelationshipGraphProps {
  models: BuilderModel[];
  onSelectModel: (model: BuilderModel) => void;
}

interface GraphNode {
  id: string;
  model: BuilderModel;
  x: number;
  y: number;
  connections: number;
}

interface GraphEdge {
  from: string;
  to: string;
  fieldName: string;
}

export function ModelRelationshipGraph({ models, onSelectModel }: ModelRelationshipGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, edges } = useMemo(() => {
    const activeModels = models.filter(m => !m.archived);
    const edges: GraphEdge[] = [];

    // Extract relationships
    activeModels.forEach(model => {
      const extractReferences = (fields: any[], parentPath = '') => {
        fields.forEach(field => {
          // Get the model name from field.model or field.defaultValue.model
          const modelName = field.model || field.defaultValue?.model;

          // Check for reference type (can be 'reference' or 'ref')
          if ((field.type === 'reference' || field.type === 'ref') && modelName) {
            edges.push({
              from: model.name,
              to: modelName,
              fieldName: parentPath ? `${parentPath}.${field.name}` : field.name,
            });
          }
          // Check for list of references
          if (field.type === 'list' && (field.subType === 'reference' || field.subType === 'ref') && modelName) {
            edges.push({
              from: model.name,
              to: modelName,
              fieldName: parentPath ? `${parentPath}.${field.name}[]` : `${field.name}[]`,
            });
          }
          // Recursively check subFields
          if (field.subFields) {
            extractReferences(
              field.subFields,
              parentPath ? `${parentPath}.${field.name}` : field.name
            );
          }
        });
      };

      extractReferences(model.fields);
    });

    // Calculate connection counts
    const connectionCounts: Record<string, number> = {};
    activeModels.forEach(m => {
      connectionCounts[m.name] = edges.filter(e => e.from === m.name || e.to === m.name).length;
    });

    // Position nodes in a hierarchical layout
    // Group by kind and connection count
    const nodesByKind: Record<string, any[]> = {};

    activeModels.forEach(model => {
      if (!nodesByKind[model.kind]) {
        nodesByKind[model.kind] = [];
      }
      nodesByKind[model.kind].push({
        model,
        connections: connectionCounts[model.name] || 0,
      });
    });

    // Sort each kind by connection count
    Object.values(nodesByKind).forEach(arr => {
      arr.sort((a, b) => b.connections - a.connections);
    });

    // Layout nodes in layers
    const nodes: GraphNode[] = [];
    let yOffset = 100;
    const kinds = ['page', 'data', 'symbol', 'component', 'section'];

    kinds.forEach(kind => {
      const kindNodes = nodesByKind[kind];
      if (!kindNodes || kindNodes.length === 0) return;

      // Calculate required spacing based on estimated box widths
      const avgBoxWidth = 200; // Average box width
      const minSpacing = avgBoxWidth + 60; // Minimum space between boxes
      const totalWidth = kindNodes.length * minSpacing;
      const availableWidth = 1800;

      // Center the row if it fits, otherwise use minimum spacing
      const useWidth = Math.max(totalWidth, availableWidth);
      const spacing = useWidth / (kindNodes.length + 1);
      const startX = (2000 - useWidth) / 2 + spacing;

      kindNodes.forEach((item, i) => {
        nodes.push({
          id: item.model.name,
          model: item.model,
          x: startX + i * spacing,
          y: yOffset,
          connections: item.connections,
        });
      });

      yOffset += 180;
    });

    return { nodes, edges };
  }, [models]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node.id);
    onSelectModel(node.model);
  };

  const getNodeColor = (kind: string): string => {
    switch (kind) {
      case 'page': return '#00aaff';
      case 'component': return '#00ff88';
      case 'data': return '#ffa657';
      case 'section': return '#ff7b72';
      case 'symbol': return '#a78bfa';
      default: return '#999';
    }
  };

  const getRelatedNodes = (nodeId: string): Set<string> => {
    const related = new Set<string>();
    edges.forEach(edge => {
      if (edge.from === nodeId) related.add(edge.to);
      if (edge.to === nodeId) related.add(edge.from);
    });
    return related;
  };

  const relatedNodes = hoveredNode ? getRelatedNodes(hoveredNode) : new Set<string>();

  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 200px)',
      backgroundColor: '#0a0a0a',
      border: '1px solid #333',
      position: 'relative',
      overflow: 'hidden',
      cursor: isDragging ? 'grabbing' : 'grab'
    }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        padding: '12px',
      }}>
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          style={{ padding: '8px 12px', fontSize: '16px' }}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
          style={{ padding: '8px 12px', fontSize: '16px' }}
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{ padding: '8px 12px', fontSize: '12px' }}
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 10,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        padding: '12px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Model Types</div>
        {['page', 'data', 'symbol', 'component', 'section'].map(kind => (
          <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '20px',
              height: '16px',
              backgroundColor: getNodeColor(kind),
              border: '2px solid #000',
              borderRadius: '2px',
            }} />
            <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{kind}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {(() => {
            // Group edges by from-to pairs to avoid overlapping labels
            const edgeGroups: Record<string, GraphEdge[]> = {};
            edges.forEach(edge => {
              const key = `${edge.from}-${edge.to}`;
              if (!edgeGroups[key]) {
                edgeGroups[key] = [];
              }
              edgeGroups[key].push(edge);
            });

            return Object.entries(edgeGroups).map(([, groupEdges], groupIndex) => {
              const edge = groupEdges[0]; // Use first edge for positioning
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to;
              const opacity = hoveredNode ? (isHighlighted ? 1 : 0.15) : 0.5;

              // Calculate box dimensions
              const fromDisplayName = getModelDisplayName(fromNode.model);
              const toDisplayName = getModelDisplayName(toNode.model);
              const fromBoxWidth = Math.max(180, fromDisplayName.length * 9 + 40);
              const toBoxWidth = Math.max(180, toDisplayName.length * 9 + 40);
              const boxHeight = 90;

              // Calculate connection points on box edges
              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const angle = Math.atan2(dy, dx);

              // Start from edge of fromNode box
              const x1 = fromNode.x + Math.cos(angle) * (fromBoxWidth / 2);
              const y1 = fromNode.y + Math.sin(angle) * (boxHeight / 2);

              // End at edge of toNode box
              const x2 = toNode.x - Math.cos(angle) * (toBoxWidth / 2);
              const y2 = toNode.y - Math.sin(angle) * (boxHeight / 2);

              // Field names for this edge group
              const fieldNames = groupEdges.map(e => e.fieldName);
              const maxFieldNameLength = Math.max(...fieldNames.map(n => n.length));
              const labelWidth = Math.min(maxFieldNameLength * 8 + 24, 250);
              const labelHeight = fieldNames.length * 18 + 12;

              return (
                <g key={`edge-group-${groupIndex}`}>
                  {/* Shadow for better visibility */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#000"
                    strokeWidth={isHighlighted ? 5 : 3}
                    opacity={opacity * 0.4}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHighlighted ? '#00aaff' : '#999'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    opacity={opacity}
                    markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                  />
                  {isHighlighted && (
                    <>
                      {/* Label background */}
                      <rect
                        x={(x1 + x2) / 2 - labelWidth / 2}
                        y={(y1 + y2) / 2 - labelHeight / 2}
                        width={labelWidth}
                        height={labelHeight}
                        fill="#000"
                        stroke="#00aaff"
                        strokeWidth="2"
                        rx="6"
                      />
                      {/* Field names as list */}
                      {fieldNames.map((fieldName, idx) => (
                        <text
                          key={idx}
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2 - labelHeight / 2 + 18 + idx * 18}
                          fill="#00aaff"
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {fieldName.length > 28 ? fieldName.substring(0, 25) + '...' : fieldName}
                        </text>
                      ))}
                    </>
                  )}
                </g>
              );
            });
          })()}

          {/* Arrowhead markers */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#999" />
            </marker>
            <marker
              id="arrowhead-highlighted"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 12 4, 0 8" fill="#00aaff" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode === node.id;
            const isRelated = relatedNodes.has(node.id);
            const opacity = hoveredNode ? (isHovered || isRelated ? 1 : 0.3) : 1;
            const displayName = getModelDisplayName(node.model);

            // Calculate box dimensions based on text
            const estimatedTextWidth = displayName.length * 9;
            const boxWidth = Math.max(180, estimatedTextWidth + 40);
            const boxHeight = 90;

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
                opacity={opacity}
              >
                {/* Main box */}
                <rect
                  x={node.x - boxWidth / 2}
                  y={node.y - boxHeight / 2}
                  width={boxWidth}
                  height={boxHeight}
                  fill={getNodeColor(node.model.kind)}
                  stroke={isSelected ? '#fff' : isHovered ? '#fff' : '#000'}
                  strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                  rx="6"
                />

                {/* Inner shadow box */}
                <rect
                  x={node.x - boxWidth / 2 + 4}
                  y={node.y - boxHeight / 2 + 4}
                  width={boxWidth - 8}
                  height={boxHeight - 8}
                  fill="rgba(0, 0, 0, 0.3)"
                  rx="4"
                  pointerEvents="none"
                />

                {/* Model name */}
                <text
                  x={node.x}
                  y={node.y - 8}
                  fill="#000"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {displayName}
                </text>

                {/* Kind label */}
                <text
                  x={node.x}
                  y={node.y + 12}
                  fill="rgba(0, 0, 0, 0.7)"
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  fontWeight="600"
                >
                  {node.model.kind}
                </text>

                {/* Connection count badge */}
                {node.connections > 0 && (
                  <>
                    <circle
                      cx={node.x + boxWidth / 2 - 16}
                      cy={node.y - boxHeight / 2 + 16}
                      r="14"
                      fill="#000"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x={node.x + boxWidth / 2 - 16}
                      y={node.y - boxHeight / 2 + 16}
                      fill="#fff"
                      fontSize="12"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                    >
                      {node.connections}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Stats */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        padding: '12px',
        fontSize: '12px',
      }}>
        <div><strong>Models:</strong> {nodes.length}</div>
        <div><strong>Relationships:</strong> {edges.length}</div>
        {selectedNode && (
          <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <strong>Selected:</strong> {getModelDisplayName(nodes.find(n => n.id === selectedNode)!.model)}
          </div>
        )}
      </div>
    </div>
  );
}
