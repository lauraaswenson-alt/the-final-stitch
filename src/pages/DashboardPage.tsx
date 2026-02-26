import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Clock, AlertTriangle, ClipboardList } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { StatusBadge } from '../components/orders/StatusBadge'
import { DaysCounter } from '../components/orders/DaysCounter'
import type { FinishingOrder } from '../types/orders'

export default function DashboardPage() {
  const { appUser } = useAuth()
  const { orders, loading, fetchOrders } = useOrders()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    fetchOrders()
    setMounted(true)
  }, [])

  if (loading && !mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const activeOrders = orders.filter(
    (o) => o.status !== 'picked_up' && o.status !== 'paid_in_full'
  )

  const now = new Date()
  const dueSoon = activeOrders.filter((o) => {
    const days = differenceInDays(parseISO(o.expected_return_date), now)
    return days >= 0 && days <= 30
  })
  const overdue = activeOrders.filter(
    (o) => differenceInDays(parseISO(o.expected_return_date), now) < 0
  )
  const recentOrders = orders.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {appUser ? `Welcome, ${appUser.first_name}!` : 'Dashboard'}
        </h2>
        <Link to="/orders/new">
          <Button size="md">
            <Plus className="h-4 w-4" />
            Add Order
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-charcoal">
            Nothing at the finisher yet — lucky you!
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            When you drop off your first canvas, track it here.
          </p>
          <Link to="/orders/new" className="mt-6 inline-block">
            <Button>
              <Plus className="h-4 w-4" />
              Add Your First Order
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="At the Finisher"
              value={activeOrders.length}
              icon={<ClipboardList className="h-5 w-5 text-sage-400" />}
            />
            <StatCard
              label="Due Soon"
              value={dueSoon.length}
              icon={<Clock className="h-5 w-5 text-gold-400" />}
              highlight={dueSoon.length > 0 ? 'amber' : undefined}
            />
            <StatCard
              label="Overdue"
              value={overdue.length}
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              highlight={overdue.length > 0 ? 'red' : undefined}
            />
          </div>

          {/* Recent Activity */}
          {recentOrders.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recent Orders
              </h3>
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <RecentOrderCard key={order.id} order={order} />
                ))}
              </div>
              <Link
                to="/orders"
                className="mt-3 inline-block text-sm font-medium text-sage-500 hover:text-sage-600"
              >
                View all orders →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string
  value: number
  icon: React.ReactNode
  highlight?: 'amber' | 'red'
}) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm border ${
      highlight === 'amber' ? 'border-gold-300' :
      highlight === 'red' ? 'border-red-300' :
      'border-gray-100'
    }`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-2xl font-bold text-charcoal">{value}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  )
}

function RecentOrderCard({ order }: { order: FinishingOrder }) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm border border-gray-100 hover:border-sage-200 transition-colors"
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
  )
}
