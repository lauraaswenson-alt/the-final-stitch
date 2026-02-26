import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Instagram } from 'lucide-react'
import { StarRating } from './StarRating'
import type { Finisher } from '../../types/finishers'

interface FinisherCardProps {
  finisher: Finisher
}

export function FinisherCard({ finisher }: FinisherCardProps) {
  return (
    <Link
      to={`/finishers/${finisher.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:border-sage-200 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-charcoal">{finisher.name}</h3>
          {(finisher.city || finisher.state) && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              {[finisher.city, finisher.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!finisher.is_active && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              Inactive
            </span>
          )}
          {finisher.personal_rating && (
            <StarRating value={finisher.personal_rating} readonly size="sm" />
          )}
        </div>
      </div>

      {/* Specialties */}
      {finisher.specialties.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {finisher.specialties.map((s) => (
            <span
              key={s}
              className="rounded-full bg-sage-50 px-2 py-0.5 text-xs text-sage-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Contact icons */}
      <div className="mt-3 flex items-center gap-3 text-gray-400">
        {finisher.contact_email && <Mail className="h-3.5 w-3.5" />}
        {finisher.contact_phone && <Phone className="h-3.5 w-3.5" />}
        {finisher.instagram && <Instagram className="h-3.5 w-3.5" />}
      </div>
    </Link>
  )
}
