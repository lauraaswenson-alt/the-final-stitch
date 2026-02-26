import { format, parseISO } from 'date-fns'
import { Edit2, Trash2, Calendar, DollarSign, User, StickyNote } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { StatusTimeline } from './StatusTimeline'
import { DaysCounter } from './DaysCounter'
import { Button } from '../ui/Button'
import type { FinishingOrder } from '../../types/orders'

interface OrderDetailProps {
  order: FinishingOrder
  onEdit: () => void
  onDelete: () => void
}

export function OrderDetail({ order, onEdit, onDelete }: OrderDetailProps) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          {order.photo_url && (
            <img
              src={order.photo_url}
              alt={order.canvas_name}
              className="h-24 w-24 rounded-lg object-cover border border-gray-200 shrink-0"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{order.canvas_name}</h2>
            {order.designer && (
              <p className="text-sm text-gray-500">by {order.designer}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={order.status} />
              <DaysCounter expectedReturnDate={order.expected_return_date} status={order.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Status Timeline */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Progress
          </h3>
          <StatusTimeline currentStatus={order.status} />
        </div>

        {/* Dates */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Dates
          </h3>
          <div className="space-y-3">
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-gray-400" />}
              label="Dropped Off"
              value={format(parseISO(order.dropoff_date), 'MMM d, yyyy')}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-gray-400" />}
              label="Expected Return"
              value={format(parseISO(order.expected_return_date), 'MMM d, yyyy')}
            />
          </div>
        </div>

        {/* Finisher */}
        {order.finisher_name && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Finisher
            </h3>
            <DetailRow
              icon={<User className="h-4 w-4 text-gray-400" />}
              label="Name"
              value={order.finisher_name}
            />
            {order.finish_type && (
              <div className="mt-3">
                <DetailRow
                  icon={<StickyNote className="h-4 w-4 text-gray-400" />}
                  label="Finish Type"
                  value={order.finish_type}
                />
              </div>
            )}
          </div>
        )}

        {/* Pricing */}
        {(order.quoted_price || order.deposit_paid) && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pricing
            </h3>
            <div className="space-y-3">
              {order.quoted_price && (
                <DetailRow
                  icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                  label="Quoted Price"
                  value={`$${order.quoted_price.toFixed(2)}`}
                />
              )}
              {order.deposit_paid && (
                <DetailRow
                  icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                  label="Deposit"
                  value={order.deposit_amount ? `$${order.deposit_amount.toFixed(2)}` : 'Paid'}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm text-charcoal">{order.notes}</p>
        </div>
      )}

      {/* Alert status */}
      <p className="text-xs text-gray-400">
        Email alerts: {order.alert_enabled ? 'On' : 'Off'}
      </p>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-charcoal">{value}</span>
    </div>
  )
}
