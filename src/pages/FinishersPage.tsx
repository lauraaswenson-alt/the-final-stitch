import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookUser } from 'lucide-react'
import { useFinishers } from '../hooks/useFinishers'
import { FinisherCard } from '../components/finishers/FinisherCard'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function FinishersPage() {
  const { finishers, loading, fetchFinishers } = useFinishers()

  useEffect(() => {
    fetchFinishers()
  }, [])

  if (loading && finishers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const active = finishers.filter((f) => f.is_active)
  const inactive = finishers.filter((f) => !f.is_active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Finishers</h2>
        <Link to="/finishers/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Finisher</span>
          </Button>
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        Your private finisher contact book. This info is never shared with anyone.
      </p>

      {finishers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <BookUser className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-charcoal">
            No finishers saved yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Save your finisher contacts here for easy reference. Your list is completely private.
          </p>
          <Link to="/finishers/new" className="mt-6 inline-block">
            <Button>
              <Plus className="h-4 w-4" />
              Add Your First Finisher
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-2">
              {active.map((f) => (
                <FinisherCard key={f.id} finisher={f} />
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Inactive
              </h3>
              <div className="space-y-2 opacity-60">
                {inactive.map((f) => (
                  <FinisherCard key={f.id} finisher={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
