import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { KanbanItem } from '../types';

interface Props {
  id: string;
  title?: string;
  items: KanbanItem[];
  onCardClick?: (item: KanbanItem, event: React.MouseEvent | React.PointerEvent) => void;
  onAdd?: () => void;
}

export const KanbanColumn: React.FC<Props> = ({ id, title, items, onCardClick, onAdd }) => {
  const { setNodeRef } = useDroppable({ id });
  const displayTitle = title || id;
  const [isColumnHovered, setIsColumnHovered] = React.useState(false);
  const [isButtonHovered, setIsButtonHovered] = React.useState(false);

  return (
    <div 
        ref={setNodeRef} 
        className="kanban-column"
        onMouseEnter={() => setIsColumnHovered(true)}
        onMouseLeave={() => setIsColumnHovered(false)}
    >
      <div className="kanban-column-header">
        {displayTitle} ({items.length})
      </div>
      <div className="kanban-column-content">
        <SortableContext 
            items={items.map((item: KanbanItem) => item.file?.path || item.id || JSON.stringify(item))} 
            strategy={verticalListSortingStrategy}
        >
          {items.map((item: KanbanItem) => {
             const key = item.file?.path || item.id || JSON.stringify(item);
             return <KanbanCard key={key} id={key} item={item} onCardClick={onCardClick} />;
          })}
        </SortableContext>
        <div style={{ marginTop: '8px', paddingBottom: '4px' }}>
             <button 
                onClick={onAdd} 
                className="kanban-create-btn"
                style={{ 
                    width: '100%', 
                    cursor: 'pointer', 
                    background: 'transparent',
                    border: isButtonHovered ? '1px dashed var(--interactive-accent)' : '1px dashed var(--background-modifier-border)',
                    boxShadow: 'none',
                    color: isButtonHovered ? 'var(--text-normal)' : 'var(--text-muted)',
                    opacity: isColumnHovered ? (isButtonHovered ? 1 : 0.6) : 0,
                    transition: 'all 0.2s ease-in-out',
                    pointerEvents: isColumnHovered ? 'auto' : 'none'
                }}
                onMouseEnter={() => setIsButtonHovered(true)}
                onMouseLeave={() => setIsButtonHovered(false)}
             >
                + Create note
            </button>
        </div>
      </div>
    </div>
  );
};
