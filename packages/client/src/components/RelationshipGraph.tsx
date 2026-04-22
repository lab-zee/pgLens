import { useMemo, useState, useRef } from 'react';
import type { SchemaOverview } from '@/types/schema';

interface RelationshipGraphProps {
  schema: SchemaOverview;
  onSelectTable: (tableName: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  fromCol: string;
  toCol: string;
  label: string;
}

export function RelationshipGraph({ schema, onSelectTable }: RelationshipGraphProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Build edges from FK relationships
  const edges = useMemo<Edge[]>(() => {
    const result: Edge[] = [];
    for (const table of schema.tables) {
      for (const fk of table.foreignKeys) {
        result.push({
          from: table.name,
          to: fk.referencedTable,
          fromCol: fk.columnName,
          toCol: fk.referencedColumn,
          label: `${fk.columnName} → ${fk.referencedColumn}`,
        });
      }
    }
    return result;
  }, [schema]);

  // Layout: force-directed-ish positioning using a simple grid with connected nodes closer
  const positions = useMemo(() => {
    return layoutNodes(schema, edges);
  }, [schema, edges]);

  const bounds = useMemo(() => {
    const xs = Object.values(positions).map((p) => p.x);
    const ys = Object.values(positions).map((p) => p.y);
    return {
      width: Math.max(...xs) + 200,
      height: Math.max(...ys) + 100,
    };
  }, [positions]);

  // Highlight edges connected to hovered table
  const connectedEdges = useMemo(() => {
    if (!hoveredTable) return new Set<number>();
    const set = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from === hoveredTable || e.to === hoveredTable) set.add(i);
    });
    return set;
  }, [hoveredTable, edges]);

  const connectedTables = useMemo(() => {
    if (!hoveredTable) return new Set<string>();
    const set = new Set<string>();
    set.add(hoveredTable);
    edges.forEach((e) => {
      if (e.from === hoveredTable) set.add(e.to);
      if (e.to === hoveredTable) set.add(e.from);
    });
    return set;
  }, [hoveredTable, edges]);

  if (edges.length === 0) {
    return null; // Don't show graph if there are no relationships
  }

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-6 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
      >
        <span>Relationships ({edges.length} connections)</span>
        <span>{collapsed ? '▸ Show' : '▾ Hide'}</span>
      </button>

      {!collapsed && (
        <div className="overflow-auto px-6 pb-4" style={{ maxHeight: 360 }}>
          <svg ref={svgRef} width={bounds.width} height={bounds.height} className="select-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#a3a3a3" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#171717" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((edge, i) => {
              const from = positions[edge.from];
              const to = positions[edge.to];
              if (!from || !to) return null;

              const isActive = connectedEdges.has(i);
              const midX = (from.x + 80 + to.x + 80) / 2;
              const midY = (from.y + 20 + to.y + 20) / 2;

              return (
                <g key={i}>
                  <line
                    x1={from.x + 80}
                    y1={from.y + 20}
                    x2={to.x + 80}
                    y2={to.y + 20}
                    stroke={isActive ? '#171717' : '#d4d4d4'}
                    strokeWidth={isActive ? 2 : 1}
                    markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  />
                  {isActive && (
                    <text
                      x={midX}
                      y={midY - 6}
                      textAnchor="middle"
                      className="fill-foreground text-[10px]"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {schema.tables.map((table) => {
              const pos = positions[table.name];
              if (!pos) return null;

              const isConnected = connectedTables.size === 0 || connectedTables.has(table.name);
              const isHovered = hoveredTable === table.name;

              return (
                <g
                  key={table.name}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredTable(table.name)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onClick={() => onSelectTable(table.name)}
                  className="cursor-pointer"
                  opacity={isConnected ? 1 : 0.3}
                >
                  <rect
                    width={160}
                    height={40}
                    rx={6}
                    fill={isHovered ? '#f5f5f5' : 'white'}
                    stroke={isHovered ? '#171717' : '#e5e5e5'}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  <text
                    x={80}
                    y={18}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-semibold"
                  >
                    {table.name}
                  </text>
                  <text
                    x={80}
                    y={32}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {table.columns.length} cols · {table.rowCount.toLocaleString()} rows
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Simple layout: tables with FK connections are placed near each other.
 * Uses a modified grid layout where connected components cluster together.
 */
function layoutNodes(schema: SchemaOverview, edges: Edge[]): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  const placed = new Set<string>();

  // Build adjacency
  const adj = new Map<string, Set<string>>();
  for (const t of schema.tables) adj.set(t.name, new Set());
  for (const e of edges) {
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }

  // Sort tables: most connected first
  const sorted = [...schema.tables].sort(
    (a, b) => (adj.get(b.name)?.size ?? 0) - (adj.get(a.name)?.size ?? 0),
  );

  const NODE_W = 200;
  const NODE_H = 70;
  const COLS = Math.max(3, Math.ceil(Math.sqrt(schema.tables.length)));

  // BFS-based placement
  function place(name: string, x: number, y: number) {
    if (placed.has(name)) return;
    positions[name] = { x, y };
    placed.add(name);

    const neighbors = adj.get(name) ?? new Set();
    let ni = 0;
    for (const neighbor of neighbors) {
      if (placed.has(neighbor)) continue;
      const nx = x + (ni % 2 === 0 ? 1 : -1) * NODE_W * (Math.floor(ni / 2) + 1);
      const ny = y + NODE_H;
      place(neighbor, Math.max(0, nx), ny);
      ni++;
    }
  }

  // Place connected components via BFS
  let startX = 20;
  for (const table of sorted) {
    if (!placed.has(table.name)) {
      place(table.name, startX, 20);
      // Advance startX for next disconnected component
      const maxX = Math.max(
        ...Object.entries(positions)
          .filter(([name]) => placed.has(name))
          .map(([, p]) => p.x),
      );
      startX = maxX + NODE_W + 40;
    }
  }

  // Place any remaining isolated tables in a grid
  let gridIdx = 0;
  for (const table of schema.tables) {
    if (!placed.has(table.name)) {
      const col = gridIdx % COLS;
      const row = Math.floor(gridIdx / COLS);
      positions[table.name] = { x: col * NODE_W + 20, y: row * NODE_H + 20 };
      gridIdx++;
    }
  }

  return positions;
}
