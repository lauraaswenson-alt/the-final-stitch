import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { DaysCounter } from './DaysCounter'
import type { FinishingOrder } from '../../types/orders'

interface KanbanCardProps {
  order: FinishingOrder
}

export function KanbanCard({ order }: KanbanCardProps) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/orders/${order.id}`)}
      className="cursor-pointer rounded-lg border border-gray-100 bg-white p-3 shadow-sm hover:border-sage-200 hover:shadow transition-all touch-manipulation"
    >
      <div className="flex items-start gap-3">
        {order.photo_url && (
          <img
            src={order.photo_url}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm text-charcoal">{order.canvas_name}</p>
          {order.finisher_name && (
            <p className="truncate text-xs text-gray-500">{order.finisher_name}</p>
          )}
          <div className="mt-1.5">
            <DaysCounter expectedReturnDate={order.expected_return_date} status={order.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
