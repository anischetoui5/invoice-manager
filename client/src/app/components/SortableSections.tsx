// Drag-to-reorder wrapper for Dashboard sections.
// Usage:
//   <SortableSectionList role="director" defaultOrder={['a','b','c']}>
//     <DashboardSection id="a">...</DashboardSection>
//     ...
//   </SortableSectionList>

import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useWorkspaceConfig } from '../context/WorkspaceConfigContext';

// ── DashboardSection ─────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  children: React.ReactNode;
}

export function DashboardSection({ id, children }: SectionProps) {
  const { isEditingLayout } = useWorkspaceConfig();
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:  CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
        opacity:    isDragging ? 0.55 : 1,
        position:   'relative',
        zIndex:     isDragging ? 10 : 'auto',
      }}
    >
      {/* Edit-mode overlay */}
      {isEditingLayout && (
        <div style={{
          position:'absolute',inset:0,
          border:'1.5px dashed rgba(99,102,241,.45)',
          borderRadius:'10px',pointerEvents:'none',zIndex:2,
          transition:'border-color 0.15s',
        }} />
      )}

      {/* Drag handle — only in edit mode */}
      {isEditingLayout && (
        <button
          {...attributes} {...listeners}
          title="Drag to reorder"
          style={{
            position:'absolute',top:'10px',right:'10px',zIndex:3,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none',borderRadius:'7px',
            cursor:'grab',padding:'4px 8px',
            display:'flex',alignItems:'center',gap:'4px',
            color:'white',fontSize:'11px',fontWeight:600,
            boxShadow:'0 4px 12px rgba(99,102,241,.4)',
            userSelect:'none',
          }}
        >
          <GripVertical size={13} /> drag
        </button>
      )}

      {children}
    </div>
  );
}

// ── SortableSectionList ──────────────────────────────────────────────────────

interface ListProps {
  role:         string;
  defaultOrder: string[];
  children:     React.ReactElement<SectionProps>[];
}

export function SortableSectionList({ role, defaultOrder, children }: ListProps) {
  const { config, isEditingLayout, setDashboardSections } = useWorkspaceConfig();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const saved = config.dashboardSections[role];
  // Use saved order only if it contains all the same ids as defaultOrder
  const order: string[] =
    saved && saved.length === defaultOrder.length && defaultOrder.every(id => saved.includes(id))
      ? saved
      : defaultOrder;

  // Render children in the configured order
  const childMap = new Map(children.map(c => [c.props.id, c]));
  const ordered  = order.map(id => childMap.get(id)).filter((c): c is React.ReactElement<SectionProps> => !!c);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    setDashboardSections(role, arrayMove(order, oldIdx, newIdx));
  };

  if (!isEditingLayout) {
    // In normal mode just render in saved order with no DnD overhead
    return <>{ordered}</>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        {ordered}
      </SortableContext>
    </DndContext>
  );
}
