import { ClipboardList, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

interface EmptyStateProps {
  title?: string
  description?: string
  showAddButton?: boolean
}

export function EmptyState({
  title = "Nothing at the finisher yet — lucky you!",
  description = "When you drop off your first canvas, track it here.",
  showAddButton = true,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-lg font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      {showAddButton && (
        <Link to="/orders/new" className="mt-6 inline-block">
          <Button>
            <Plus className="h-4 w-4" />
            Add Finishing Order
          </Button>
        </Link>
      )}
    </div>
  )
}
