import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit2, Trash2, MapPin, Mail, Phone, Instagram } from 'lucide-react'
import { useFinishers } from '../hooks/useFinishers'
import { StarRating } from '../components/finishers/StarRating'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import type { Finisher } from '../types/finishers'

export default function FinisherDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getFinisher, deleteFinisher } = useFinishers()
  const [finisher, setFinisher] = useState<Finisher | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      getFinisher(id)
        .then(setFinisher)
        .catch(() => {
          toast.error('Finisher not found')
          navigate('/finishers')
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await deleteFinisher(id)
      toast.success('Finisher deleted')
      navigate('/finishers')
    } catch {
      toast.error('Failed to delete finisher')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!finisher) {
    return <div className="py-12 text-center text-gray-500">Finisher not found.</div>
  }

  return (
    <div>
      <button
        onClick={() => navigate('/finishers')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All Finishers
      </button>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{finisher.name}</h2>
              {!finisher.is_active && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">Inactive</span>
              )}
            </div>
            {(finisher.city || finisher.state) && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {[finisher.city, finisher.state].filter(Boolean).join(', ')}
              </p>
            )}
            {finisher.personal_rating && (
              <div className="mt-2">
                <StarRating value={finisher.personal_rating} readonly />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/finishers/${id}/edit`)}>
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        {(finisher.contact_email || finisher.contact_phone || finisher.instagram) && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Contact</h3>
            <div className="space-y-2">
              {finisher.contact_email && (
                <p className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${finisher.contact_email}`} className="text-sage-500 hover:underline">
                    {finisher.contact_email}
                  </a>
                </p>
              )}
              {finisher.contact_phone && (
                <p className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${finisher.contact_phone}`} className="text-sage-500 hover:underline">
                    {finisher.contact_phone}
                  </a>
                </p>
              )}
              {finisher.instagram && (
                <p className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4 text-gray-400" />
                  <span className="text-charcoal">{finisher.instagram}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Specialties */}
        {finisher.specialties.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {finisher.specialties.map((s) => (
                <span key={s} className="rounded-full bg-sage-100 px-3 py-1 text-sm text-sage-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="grid gap-4 sm:grid-cols-2">
          {finisher.turnaround_notes && (
            <NoteCard title="Typical Turnaround" text={finisher.turnaround_notes} />
          )}
          {finisher.price_notes && (
            <NoteCard title="Price Notes" text={finisher.price_notes} />
          )}
          {finisher.how_found && (
            <NoteCard title="How I Found Them" text={finisher.how_found} />
          )}
          {finisher.personal_notes && (
            <NoteCard title="Personal Notes" text={finisher.personal_notes} />
          )}
        </div>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Finisher">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <strong>{finisher.name}</strong>? This won't affect any existing finishing orders.
        </p>
        <div className="mt-4 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}

function NoteCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-charcoal">{text}</p>
    </div>
  )
}
