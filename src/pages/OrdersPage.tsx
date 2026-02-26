import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { KanbanBoard } from '../components/orders/KanbanBoard'
import { OrderListView } from '../components/orders/OrderListView'
import { ViewToggle, type ViewMode } from '../components/orders/ViewToggle'
import { EmptyState } from '../components/orders/EmptyState'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function OrdersPage() {
  const { orders, loading, fetchOrders, updateOrderStatus } = useOrders()
  const [view, setView] = useState<ViewMode>(() => {
    return (localStorage.getItem('ordersView') as ViewMode) || 'board'
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleViewChange = (v: ViewMode) => {
    setView(v)
    localStorage.setItem('ordersView', v)
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (orders.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Finishing Orders</h2>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={handleViewChange} />
          <Link to="/orders/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Order</span>
            </Button>
          </Link>
        </div>
      </div>

      {view === 'board' ? (
        <KanbanBoard orders={orders} onStatusChange={updateOrderStatus} />
      ) : (
        <OrderListView orders={orders} />
      )}
    </div>
  )
}
