import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { KanbanCard } from './KanbanCard'
import type { FinishingOrder } from '../../types/orders'

interface KanbanColumnProps {
  id: string
  title: string
  orders: FinishingOrder[]
}

export function KanbanColumn({ id, title, orders }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className={clsx(
        'flex min-w-[260px] flex-col rounded-xl bg-gray-100/80 p-3 snap-center',
        isOver && 'ring-2 ring-sage-300'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
          {orders.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 min-h-[60px]"
      >
        <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <KanbanCard key={order.id} order={order} />
          ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="flex h-[60px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}
