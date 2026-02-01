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

import { useKanbanData } from '../hooks/useKanbanData';
import { KanbanItem } from '../types';

export interface KanbanBoardProps {
  data: KanbanItem[];
  groupBy: string | null;
  groupByDirection?: string;
  splitColumnsBy?: string | null;
  onCardUpdate: (item: KanbanItem, updates: { [key: string]: string }) => void;
  onCardClick?: (item: KanbanItem, event: React.MouseEvent | React.PointerEvent) => void;
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

  const { matrixData, rowKeys, colKeys, usageMode } = useKanbanData({
      data,
      groupBy,
      groupByDirection,
      splitColumnsBy,
      sortBy,
      sortDirection
  });

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
             targetRow = parts[0] || null;
             targetCol = parts[1] || null;
        } else {
             // Fallback find
             for (const r of rowKeys) {
                 for (const c of colKeys) {
                     const items = matrixData[r]?.[c] || [];
                     if (items.some((i: KanbanItem) => (i.file?.path || i.id) === overId)) {
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
                     if (items.some((i: KanbanItem) => (i.file?.path || i.id) === overId)) {
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
        const activeItem = data.find((i: KanbanItem) => (i.file?.path || i.id || JSON.stringify(i)) === active.id);
        
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
    return data.find((i: KanbanItem) => (i.file?.path || i.id || JSON.stringify(i)) === activeId);
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
