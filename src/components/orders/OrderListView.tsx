import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { parseISO } from 'date-fns'
import clsx from 'clsx'
import { StatusBadge } from './StatusBadge'
import { DaysCounter } from './DaysCounter'
import type { FinishingOrder } from '../../types/orders'

type SortField = 'canvas_name' | 'finisher_name' | 'status' | 'expected_return_date' | 'dropoff_date'
type SortDir = 'asc' | 'desc'

interface OrderListViewProps {
  orders: FinishingOrder[]
}

export function OrderListView({ orders }: OrderListViewProps) {
  const [sortField, setSortField] = useState<SortField>('expected_return_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      let cmp = 0
      const aVal = a[sortField] || ''
      const bVal = b[sortField] || ''

      if (sortField === 'expected_return_date' || sortField === 'dropoff_date') {
        cmp = parseISO(aVal as string).getTime() - parseISO(bVal as string).getTime()
      } else {
        cmp = String(aVal).localeCompare(String(bVal))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [orders, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  }

  // Mobile: card layout
  // Desktop: table layout
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-4">
                <button onClick={() => toggleSort('canvas_name')} className="inline-flex items-center gap-1 hover:text-gray-700">
                  Canvas <SortIcon field="canvas_name" />
                </button>
              </th>
              <th className="pb-3 pr-4">
                <button onClick={() => toggleSort('finisher_name')} className="inline-flex items-center gap-1 hover:text-gray-700">
                  Finisher <SortIcon field="finisher_name" />
                </button>
              </th>
              <th className="pb-3 pr-4">
                <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 hover:text-gray-700">
                  Status <SortIcon field="status" />
                </button>
              </th>
              <th className="pb-3 pr-4">
                <button onClick={() => toggleSort('expected_return_date')} className="inline-flex items-center gap-1 hover:text-gray-700">
                  Due <SortIcon field="expected_return_date" />
                </button>
              </th>
              <th className="pb-3">Timeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((order) => (
              <tr key={order.id} className="group">
                <td className="py-3 pr-4">
                  <Link to={`/orders/${order.id}`} className="font-medium text-charcoal hover:text-sage-500">
                    {order.canvas_name}
                  </Link>
                  {order.designer && (
                    <p className="text-xs text-gray-400">{order.designer}</p>
                  )}
                </td>
                <td className="py-3 pr-4 text-sm text-gray-600">
                  {order.finisher_name || '—'}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-3 pr-4 text-sm text-gray-600">
                  {new Date(order.expected_return_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="py-3">
                  <DaysCounter expectedReturnDate={order.expected_return_date} status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {sorted.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className={clsx(
              'flex items-center justify-between rounded-lg bg-white p-3 shadow-sm border border-gray-100',
              'hover:border-sage-200 transition-colors'
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-charcoal">{order.canvas_name}</p>
              <p className="text-xs text-gray-500">{order.finisher_name || 'No finisher'}</p>
            </div>
            <div className="flex items-center gap-3 pl-3">
              <DaysCounter expectedReturnDate={order.expected_return_date} status={order.status} />
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
