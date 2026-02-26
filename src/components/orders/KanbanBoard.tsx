import { useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { KANBAN_COLUMNS } from '../../lib/constants'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { FinishingOrder, OrderStatus } from '../../types/orders'

interface KanbanBoardProps {
  orders: FinishingOrder[]
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>
}

export function KanbanBoard({ orders, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => ({
      ...col,
      orders: orders.filter((o) => (col.statuses as readonly string[]).includes(o.status)),
    }))
  }, [orders])

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const orderId = active.id as string

    // Find which column the item was dropped onto
    let targetColumnId = over.id as string

    // If dropped on a card, find that card's column
    const droppedOnOrder = orders.find((o) => o.id === targetColumnId)
    if (droppedOnOrder) {
      const col = KANBAN_COLUMNS.find((c) =>
        (c.statuses as readonly string[]).includes(droppedOnOrder.status)
      )
      if (col) targetColumnId = col.id
    }

    // Map column ID to status
    const statusMap: Record<string, OrderStatus> = {
      dropped_off: 'dropped_off',
      in_progress: 'in_progress',
      ready_for_pickup: 'ready_for_pickup',
      complete: 'picked_up',
    }

    const newStatus = statusMap[targetColumnId]
    if (!newStatus) return

    const order = orders.find((o) => o.id === orderId)
    if (!order || order.status === newStatus) return

    try {
      await onStatusChange(orderId, newStatus)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            orders={col.orders}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? <KanbanCard order={activeOrder} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
