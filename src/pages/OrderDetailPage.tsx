import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { OrderDetail } from '../components/orders/OrderDetail'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import type { FinishingOrder } from '../types/orders'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getOrder, deleteOrder } = useOrders()
  const [order, setOrder] = useState<FinishingOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      getOrder(id)
        .then(setOrder)
        .catch(() => {
          toast.error('Order not found')
          navigate('/orders')
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteOrder(id)
      toast.success('Order deleted')
      navigate('/orders')
    } catch {
      toast.error('Failed to delete order')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found.</p>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All Orders
      </button>

      <OrderDetail
        order={order}
        onEdit={() => navigate(`/orders/${id}/edit`)}
        onDelete={() => setShowDeleteModal(true)}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Order"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>{order.canvas_name}</strong>? This action cannot be undone.
        </p>
        <div className="mt-4 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
