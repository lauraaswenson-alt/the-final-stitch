import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { useFinishers } from '../hooks/useFinishers'
import { useImageUpload } from '../hooks/useImageUpload'
import { OrderForm } from '../components/orders/OrderForm'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import type { FinishingOrder, FinishingOrderInput } from '../types/orders'

export default function NewOrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createOrder, updateOrder, getOrder } = useOrders()
  const { finishers, fetchFinishers, quickSaveFinisher } = useFinishers()
  const { uploadImage, deleteImage } = useImageUpload()
  const [existingOrder, setExistingOrder] = useState<FinishingOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)
  const [saveFinisherPrompt, setSaveFinisherPrompt] = useState<string | null>(null)

  const isEdit = !!id

  useEffect(() => {
    fetchFinishers()
    if (id) {
      setFetching(true)
      getOrder(id)
        .then(setExistingOrder)
        .catch(() => {
          toast.error('Order not found')
          navigate('/orders')
        })
        .finally(() => setFetching(false))
    }
  }, [id])

  const handleSubmit = async (data: FinishingOrderInput) => {
    setLoading(true)
    try {
      let createdOrder: FinishingOrder
      if (isEdit && id) {
        await updateOrder(id, data)
        toast.success('Order updated!')
        navigate(`/orders/${id}`)
        return
      } else {
        createdOrder = await createOrder(data)
        toast.success('Order created!')
      }

      // Check if finisher name is new (not in saved finishers)
      if (data.finisher_name) {
        const isKnown = finishers.some(
          (f) => f.name.toLowerCase() === data.finisher_name!.toLowerCase()
        )
        if (!isKnown) {
          setSaveFinisherPrompt(data.finisher_name)
          // Wait for user response before navigating
          return
        }
      }

      navigate(`/orders/${createdOrder.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFinisher = async (name: string) => {
    try {
      await quickSaveFinisher(name)
      toast.success(`${name} saved to your finishers!`)
    } catch {
      toast.error('Could not save finisher')
    }
    setSaveFinisherPrompt(null)
    // Navigate to the most recently created order
    navigate('/orders')
  }

  const handleImageUpload = async (file: File) => {
    const orderId = id || 'new-' + Date.now()
    return await uploadImage(file, orderId)
  }

  const handleImageRemove = () => {
    if (existingOrder?.photo_url) {
      deleteImage(existingOrder.photo_url)
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h2 className="mb-6 text-2xl font-bold">
        {isEdit ? 'Edit Order' : 'New Finishing Order'}
      </h2>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <OrderForm
          order={existingOrder || undefined}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          savedFinishers={finishers}
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          loading={loading}
        />
      </div>

      {/* Auto-populate finisher prompt */}
      <Modal
        isOpen={!!saveFinisherPrompt}
        onClose={() => {
          setSaveFinisherPrompt(null)
          navigate('/orders')
        }}
        title="Save Finisher?"
      >
        <p className="text-sm text-gray-600">
          Want to save <strong>{saveFinisherPrompt}</strong> to your finisher contacts? You can add more details later.
        </p>
        <div className="mt-4 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setSaveFinisherPrompt(null)
              navigate('/orders')
            }}
          >
            Skip
          </Button>
          <Button onClick={() => saveFinisherPrompt && handleSaveFinisher(saveFinisherPrompt)}>
            Save Finisher
          </Button>
        </div>
      </Modal>
    </div>
  )
}
