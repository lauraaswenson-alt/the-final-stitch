import { Check } from 'lucide-react'
import clsx from 'clsx'
import { STATUS_LABELS, ORDER_STATUSES } from '../../lib/constants'
import type { OrderStatus } from '../../types/orders'

interface StatusTimelineProps {
  currentStatus: OrderStatus
}

const statusOrder = ORDER_STATUSES as readonly string[]

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus)

  return (
    <div className="space-y-0">
      {ORDER_STATUSES.map((status, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={status} className="flex items-start gap-3">
            {/* Dot and line */}
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2',
                  isComplete && 'border-sage-400 bg-sage-400',
                  isCurrent && 'border-sage-400 bg-white',
                  isFuture && 'border-gray-200 bg-white'
                )}
              >
                {isComplete && <Check className="h-3.5 w-3.5 text-white" />}
                {isCurrent && <div className="h-2 w-2 rounded-full bg-sage-400" />}
              </div>
              {index < ORDER_STATUSES.length - 1 && (
                <div
                  className={clsx(
                    'h-6 w-0.5',
                    index < currentIndex ? 'bg-sage-400' : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Label */}
            <span
              className={clsx(
                'pt-0.5 text-sm',
                isCurrent ? 'font-semibold text-charcoal' : 'text-gray-500'
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
