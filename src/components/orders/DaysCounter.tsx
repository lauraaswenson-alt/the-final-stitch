import { differenceInDays, parseISO } from 'date-fns'
import clsx from 'clsx'
import type { OrderStatus } from '../../types/orders'

interface DaysCounterProps {
  expectedReturnDate: string
  status: OrderStatus
}

export function DaysCounter({ expectedReturnDate, status }: DaysCounterProps) {
  if (status === 'picked_up' || status === 'paid_in_full') {
    return <span className="text-xs text-gray-400">Complete</span>
  }

  const days = differenceInDays(parseISO(expectedReturnDate), new Date())

  if (days < 0) {
    return (
      <span className={clsx('text-xs font-medium text-red-600')}>
        {Math.abs(days)}d overdue
      </span>
    )
  }

  if (days === 0) {
    return <span className="text-xs font-medium text-gold-500">Due today!</span>
  }

  if (days <= 7) {
    return <span className="text-xs font-medium text-gold-500">{days}d left</span>
  }

  if (days <= 30) {
    return <span className="text-xs font-medium text-gold-400">{days}d left</span>
  }

  return <span className="text-xs text-gray-500">{days}d left</span>
}
