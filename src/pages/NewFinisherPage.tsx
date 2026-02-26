import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useFinishers } from '../hooks/useFinishers'
import { FinisherForm } from '../components/finishers/FinisherForm'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import type { Finisher, FinisherInput } from '../types/finishers'

export default function NewFinisherPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { createFinisher, updateFinisher, getFinisher } = useFinishers()
  const [existing, setExisting] = useState<Finisher | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)

  const isEdit = !!id

  useEffect(() => {
    if (id) {
      setFetching(true)
      getFinisher(id)
        .then(setExisting)
        .catch(() => {
          toast.error('Finisher not found')
          navigate('/finishers')
        })
        .finally(() => setFetching(false))
    }
  }, [id])

  const handleSubmit = async (data: FinisherInput) => {
    setLoading(true)
    try {
      if (isEdit && id) {
        await updateFinisher(id, data)
        toast.success('Finisher updated!')
        navigate(`/finishers/${id}`)
      } else {
        const finisher = await createFinisher(data)
        toast.success('Finisher saved!')
        navigate(`/finishers/${finisher.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
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
        {isEdit ? 'Edit Finisher' : 'Add Finisher'}
      </h2>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <FinisherForm
          finisher={existing || undefined}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          loading={loading}
        />
      </div>
    </div>
  )
}
