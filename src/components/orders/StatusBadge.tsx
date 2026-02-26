import clsx from 'clsx'
import { STATUS_LABELS } from '../../lib/constants'
import type { OrderStatus } from '../../types/orders'

const statusStyles: Record<OrderStatus, string> = {
  dropped_off: 'bg-sage-100 text-sage-700',
  in_progress: 'bg-gold-100 text-gold-700',
  ready_for_pickup: 'bg-sage-200 text-sage-800',
  picked_up: 'bg-gray-100 text-gray-600',
  paid_in_full: 'bg-gray-100 text-gray-600',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        statusStyles[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
