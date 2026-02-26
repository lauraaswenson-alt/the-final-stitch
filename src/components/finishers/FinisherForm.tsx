import { useState, type FormEvent } from 'react'
import { Input } from '../ui/Input'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { StarRating } from './StarRating'
import type { Finisher, FinisherInput } from '../../types/finishers'

const SPECIALTIES = ['Ornaments', 'Pillows', 'Stockings', 'Belts', 'Bags', 'Framing']

interface FinisherFormProps {
  finisher?: Finisher
  onSubmit: (data: FinisherInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function FinisherForm({ finisher, onSubmit, onCancel, loading }: FinisherFormProps) {
  const [name, setName] = useState(finisher?.name || '')
  const [city, setCity] = useState(finisher?.city || '')
  const [state, setState] = useState(finisher?.state || '')
  const [contactEmail, setContactEmail] = useState(finisher?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(finisher?.contact_phone || '')
  const [instagram, setInstagram] = useState(finisher?.instagram || '')
  const [specialties, setSpecialties] = useState<string[]>(finisher?.specialties || [])
  const [turnaroundNotes, setTurnaroundNotes] = useState(finisher?.turnaround_notes || '')
  const [priceNotes, setPriceNotes] = useState(finisher?.price_notes || '')
  const [howFound, setHowFound] = useState(finisher?.how_found || '')
  const [personalNotes, setPersonalNotes] = useState(finisher?.personal_notes || '')
  const [personalRating, setPersonalRating] = useState(finisher?.personal_rating || 0)
  const [isActive, setIsActive] = useState(finisher?.is_active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: 'Finisher name is required' })
      return
    }
    setErrors({})

    await onSubmit({
      name: name.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      instagram: instagram.trim() || undefined,
      specialties,
      turnaround_notes: turnaroundNotes.trim() || undefined,
      price_notes: priceNotes.trim() || undefined,
      how_found: howFound.trim() || undefined,
      personal_notes: personalNotes.trim() || undefined,
      personal_rating: personalRating || undefined,
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Basic Info
        </h3>
        <Input
          label="Finisher Name / Business"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Amy's Custom Finishing"
          error={errors.name}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Dallas"
          />
          <Input
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. TX"
          />
        </div>
        <Toggle label="Active" checked={isActive} onChange={setIsActive} />
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Contact Info
        </h3>
        <Input
          label="Email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="finisher@example.com"
        />
        <Input
          label="Phone"
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
        <Input
          label="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@handle"
        />
      </div>

      {/* Specialties */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Specialties
        </h3>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                specialties.includes(s)
                  ? 'bg-sage-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Your Notes
        </h3>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-charcoal">Typical Turnaround</label>
          <textarea
            value={turnaroundNotes}
            onChange={(e) => setTurnaroundNotes(e.target.value)}
            rows={2}
            placeholder="e.g. 3-4 months for ornaments"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal placeholder-gray-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-charcoal">Price Notes</label>
          <textarea
            value={priceNotes}
            onChange={(e) => setPriceNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Pillows ~$125, ornaments ~$55"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal placeholder-gray-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
          />
        </div>
        <Input
          label="How I Found Them"
          value={howFound}
          onChange={(e) => setHowFound(e.target.value)}
          placeholder="e.g. Referred by Jane at my LNS"
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-charcoal">Personal Notes</label>
          <textarea
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Prefers canvas prep with no excess mono canvas"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal placeholder-gray-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
          />
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-charcoal">Personal Rating</label>
        <StarRating value={personalRating} onChange={setPersonalRating} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {finisher ? 'Save Changes' : 'Save Finisher'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
