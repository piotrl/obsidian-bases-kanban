import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  item: any;
  onCardClick?: (item: any, event: React.MouseEvent | React.PointerEvent) => void;
}

export const KanbanCard: React.FC<Props> = ({ id, item, onCardClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayName = item.file?.basename || item.name || id;

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && onCardClick) {
        onCardClick(item, e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={handleClick}
      onAuxClick={handleClick}
      onContextMenu={(e) => {
          // Pass context menu event up
          if (!isDragging && onCardClick) {
              onCardClick(item, e);
          }
      }}
    >
      <div className="kanban-card-content">
        {displayName}
      </div>
    </div>
  );
};
