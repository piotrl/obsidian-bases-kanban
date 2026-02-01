import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { createPortal } from 'react-dom';

export interface KanbanBoardProps {
  data: any[];
  groupBy: string | null;
  groupByDirection?: string;
  splitColumnsBy?: string | null;
  onCardUpdate: (item: any, updates: { [key: string]: string }) => void;
  onCardClick?: (item: any, event: React.MouseEvent | React.PointerEvent) => void;
  onCardAdd?: (rowVal: string, colVal: string) => void;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    data, 
    groupBy, 
    groupByDirection, 
    splitColumnsBy, 
    onCardUpdate, 
    onCardClick,
    onCardAdd,
    sortBy,
    sortDirection
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());

  const toggleRow = (row: string) => {
    const next = new Set(collapsedRows);
    if (next.has(row)) next.delete(row);
    else next.add(row);
    setCollapsedRows(next);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
          delay: 250,
          tolerance: 5,
        },
    }),
  );

  const { matrixData, rowKeys, colKeys, usageMode } = useMemo(() => {
    let mode: 'matrix' | 'simple' = 'simple';
    
    // Determine mode
    // IF splitColumnsBy is set, then that is columns, and groupBy (if present) is rows.
    // IF splitColumnsBy is NOT set, then groupBy is columns (standard).
    if (splitColumnsBy) {
        mode = 'matrix'; // Even if groupBy is null, we treat as matrix with 1 row 'All'
    } else {
        mode = 'simple';
    }

    const rows: Set<string> = new Set();
    const cols: Set<string> = new Set();
    const map: Record<string, Record<string, any[]>> = {};

    data.forEach(item => {
        let rVal = 'All';
        let cVal = 'Uncategorized';

        if (mode === 'matrix') {
            // Row = groupBy
            if (groupBy) {
                const rRaw = item[groupBy] ?? (item.frontmatter ? item.frontmatter[groupBy] : null);
                rVal = rRaw ? String(rRaw) : 'Uncategorized';
            }
            
            // Col = splitColumnsBy
            const cRaw = item[splitColumnsBy!] ?? (item.frontmatter ? item.frontmatter[splitColumnsBy!] : null);
            cVal = cRaw ? String(cRaw) : 'Uncategorized';
        } else {
            // Simple mode: Col = groupBy
            if (groupBy) {
                const cRaw = item[groupBy] ?? (item.frontmatter ? item.frontmatter[groupBy] : null);
                cVal = cRaw ? String(cRaw) : 'Uncategorized';
            }
        }

        rows.add(rVal);
        cols.add(cVal);

        if (!map[rVal]) map[rVal] = {};
        if (!map[rVal][cVal]) map[rVal][cVal] = [];
        map[rVal][cVal].push(item);
    });
    
    // Helper for sorting keys
    const sortKeys = (keys: Set<string>, propName: string | null) => {
        let arr = Array.from(keys).sort(); // Default ASC alpha
        
        // If sorting by the grouping property itself, respect the sort direction
        if (sortBy && propName && sortBy === propName) {
            if (sortDirection === 'DESC') {
                arr.reverse(); 
            }
        }
        return arr;
    };

    let sortedRows = sortKeys(rows, mode === 'matrix' ? groupBy : null);
    // In Simple mode, the 'columns' are actually the groupBy values.
    // In Matrix mode, the 'columns' are the splitColumnsBy values.
    const colPropRef = mode === 'matrix' ? splitColumnsBy : groupBy;
    const sortedCols = sortKeys(cols, colPropRef || null);

    // Sort items within cells
    if (sortBy) {
         Object.values(map).forEach(cols => {
             Object.values(cols).forEach(items => {
                 items.sort((a, b) => {
                     const getVal = (itm: any) => {
                         if (sortBy === 'file' || sortBy === 'name') return itm.file?.basename || itm.name || '';
                         return itm[sortBy] ?? (itm.frontmatter ? itm.frontmatter[sortBy] : '') ?? '';
                     };
                     const valA = String(getVal(a));
                     const valB = String(getVal(b));
                     
                     if (valA < valB) return sortDirection === 'DESC' ? 1 : -1;
                     if (valA > valB) return sortDirection === 'DESC' ? -1 : 1;
                     return 0;
                 });
             });
         });
    }

    return { 
        matrixData: map, 
        rowKeys: sortedRows, 
        colKeys: sortedCols, 
         usageMode: mode 
    };
  }, [data, groupBy, splitColumnsBy, groupByDirection, sortBy, sortDirection]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const overId = over.id as string;
    let targetRow: string | null = null;
    let targetCol: string | null = null;

    if (usageMode === 'matrix') {
        const parts = overId.split(':::');
        if (parts.length === 2) {
             targetRow = parts[0];
             targetCol = parts[1];
        } else {
             // Fallback find
             for (const r of rowKeys) {
                 for (const c of colKeys) {
                     const items = matrixData[r]?.[c] || [];
                     if (items.some((i: any) => (i.file?.path || i.id) === overId)) {
                         targetRow = r;
                         targetCol = c;
                         break;
                     }
                 }
                 if (targetRow) break;
             }
        }
    } else {
        // Simple mode
        if (colKeys.includes(overId)) {
            targetCol = overId;
            targetRow = 'All'; 
        } else {
            for (const r of rowKeys) {
                for (const c of colKeys) {
                     const items = matrixData[r]?.[c] || [];
                     if (items.some((i: any) => (i.file?.path || i.id) === overId)) {
                         targetRow = r;
                         targetCol = c;
                         break;
                     }
                }
            }
        }
    }

    if (targetCol && targetRow) {
        // Find Active Item
        // Ensure we find it by ID or path
        const activeItem = data.find((i: any) => (i.file?.path || i.id || JSON.stringify(i)) === active.id);
        
        if (activeItem) {
             const updates: Record<string, string> = {};
             if (usageMode === 'matrix') {
                 if (groupBy) updates[groupBy!] = targetRow;
                 if (splitColumnsBy) updates[splitColumnsBy] = targetCol;
             } else {
                 if (groupBy) updates[groupBy] = targetCol;
             }
             onCardUpdate(activeItem, updates);
        }
    }
  };

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return data.find((i: any) => (i.file?.path || i.id || JSON.stringify(i)) === activeId);
  }, [activeId, data]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board-scroll-container" style={{ height: '100%', overflowY: 'auto' }}>
      {rowKeys.map(row => {
          const isCollapsed = collapsedRows.has(row);
          return (
          <div key={row} className="kanban-row">
            {/* Show row header only if meaningful (more than 1 row or explicitly grouped) */}
            {(usageMode === 'matrix' && groupBy) && (
                 <h3 
                    onClick={() => toggleRow(row)}
                    style={{ 
                        margin: '10px 10px 5px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                 >
                    <span style={{ 
                        marginRight: '8px', 
                        display: 'inline-block', 
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        width: '1em',
                        textAlign: 'center'
                    }}>▼</span>
                    {row}
                 </h3>
            )}
            {!isCollapsed && (
            <div className="kanban-row-cols" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '0 10px 10px' }}>
                {colKeys.map(col => {
                    const dndId = usageMode === 'matrix' ? `${row}:::${col}` : col;
                    const items = matrixData[row]?.[col] || [];
                    return (
                        <KanbanColumn 
                            key={dndId} 
                            id={dndId} 
                            title={col} 
                            items={items} 
                            onCardClick={onCardClick}
                            onAdd={() => onCardAdd && onCardAdd(row, col)}
                        />
                    );
                })}
            </div>
            )}
          </div>
      )})}
      </div>
       {createPortal(
        <DragOverlay>
            {activeItem ? <KanbanCard id={activeId!} item={activeItem} onCardClick={onCardClick} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
};
