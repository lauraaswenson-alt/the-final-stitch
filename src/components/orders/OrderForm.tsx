import { useState, type FormEvent } from 'react'
import { FINISH_TYPES, ORDER_STATUSES, STATUS_LABELS } from '../../lib/constants'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import { CurrencyInput } from '../ui/CurrencyInput'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
import { ImageUpload } from '../ui/ImageUpload'
import type { FinishingOrder, FinishingOrderInput } from '../../types/orders'
import type { Finisher } from '../../types/finishers'

interface OrderFormProps {
  order?: FinishingOrder
  onSubmit: (data: FinishingOrderInput) => Promise<void>
  onCancel: () => void
  savedFinishers?: Finisher[]
  onNewFinisherName?: (name: string) => void
  onImageUpload: (file: File) => Promise<string>
  onImageRemove?: () => void
  loading?: boolean
}

export function OrderForm({
  order,
  onSubmit,
  onCancel,
  savedFinishers = [],
  onNewFinisherName: _onNewFinisherName,
  onImageUpload,
  onImageRemove,
  loading,
}: OrderFormProps) {
  const [canvasName, setCanvasName] = useState(order?.canvas_name || '')
  const [designer, setDesigner] = useState(order?.designer || '')
  const [photoUrl, setPhotoUrl] = useState(order?.photo_url || '')
  const [finisherName, setFinisherName] = useState(order?.finisher_name || '')
  const [finishType, setFinishType] = useState(order?.finish_type || '')
  const [dropoffDate, setDropoffDate] = useState(order?.dropoff_date || '')
  const [expectedReturnDate, setExpectedReturnDate] = useState(order?.expected_return_date || '')
  const [quotedPrice, setQuotedPrice] = useState(order?.quoted_price?.toString() || '')
  const [depositPaid, setDepositPaid] = useState(order?.deposit_paid || false)
  const [depositAmount, setDepositAmount] = useState(order?.deposit_amount?.toString() || '')
  const [status, setStatus] = useState(order?.status || 'dropped_off')
  const [alertEnabled, setAlertEnabled] = useState(order?.alert_enabled ?? true)
  const [notes, setNotes] = useState(order?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!canvasName.trim()) newErrors.canvasName = 'Canvas name is required'
    if (!dropoffDate) newErrors.dropoffDate = 'Drop-off date is required'
    if (!expectedReturnDate) newErrors.expectedReturnDate = 'Expected return date is required'
    if (dropoffDate && expectedReturnDate && expectedReturnDate < dropoffDate) {
      newErrors.expectedReturnDate = 'Return date must be after drop-off date'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    await onSubmit({
      canvas_name: canvasName.trim(),
      designer: designer.trim() || undefined,
      photo_url: photoUrl || undefined,
      finisher_name: finisherName.trim() || undefined,
      finish_type: finishType as FinishingOrderInput['finish_type'] || undefined,
      dropoff_date: dropoffDate,
      expected_return_date: expectedReturnDate,
      quoted_price: quotedPrice ? parseFloat(quotedPrice) : undefined,
      deposit_paid: depositPaid,
      deposit_amount: depositAmount ? parseFloat(depositAmount) : undefined,
      status,
      alert_enabled: alertEnabled,
      notes: notes.trim() || undefined,
    })
  }

  const handleImageUpload = async (file: File) => {
    const url = await onImageUpload(file)
    setPhotoUrl(url)
    return url
  }

  const handleImageRemove = () => {
    setPhotoUrl('')
    onImageRemove?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Canvas Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Canvas Details
        </h3>
        <Input
          label="Canvas Name"
          value={canvasName}
          onChange={(e) => setCanvasName(e.target.value)}
          placeholder="e.g. Santa with Toys"
          error={errors.canvasName}
          required
        />
        <Input
          label="Designer / Brand"
          value={designer}
          onChange={(e) => setDesigner(e.target.value)}
          placeholder="e.g. Kirk & Bradley"
        />
        <ImageUpload
          value={photoUrl || null}
          onUpload={handleImageUpload}
          onRemove={handleImageRemove}
        />
      </div>

      {/* Finishing Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Finishing Details
        </h3>
        {savedFinishers.length > 0 ? (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-charcoal">Finisher</label>
            <select
              value={finisherName}
              onChange={(e) => setFinisherName(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
            >
              <option value="">Select a finisher or type below...</option>
              {savedFinishers.filter(f => f.is_active).map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
            <Input
              value={finisherName}
              onChange={(e) => setFinisherName(e.target.value)}
              placeholder="Or type a new finisher name"
            />
          </div>
        ) : (
          <Input
            label="Finisher Name"
            value={finisherName}
            onChange={(e) => setFinisherName(e.target.value)}
            placeholder="e.g. Amy's Finishing"
          />
        )}
        <Select
          label="Finish Type"
          value={finishType}
          onChange={(e) => setFinishType(e.target.value)}
          placeholder="Select type..."
          options={FINISH_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Dates
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Drop-off Date"
            value={dropoffDate}
            onChange={(e) => setDropoffDate(e.target.value)}
            error={errors.dropoffDate}
            required
          />
          <DatePicker
            label="Expected Return"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            error={errors.expectedReturnDate}
            required
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Pricing
        </h3>
        <CurrencyInput
          label="Quoted Price"
          value={quotedPrice}
          onChange={setQuotedPrice}
          placeholder="0.00"
        />
        <Toggle
          label="Deposit Paid"
          checked={depositPaid}
          onChange={setDepositPaid}
        />
        {depositPaid && (
          <CurrencyInput
            label="Deposit Amount"
            value={depositAmount}
            onChange={setDepositAmount}
            placeholder="0.00"
          />
        )}
      </div>

      {/* Status & Alerts */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Status
        </h3>
        <Select
          label="Current Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          options={ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />
        <Toggle
          label="Email alerts for this order"
          checked={alertEnabled}
          onChange={setAlertEnabled}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-charcoal">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any special instructions or notes..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal placeholder-gray-400 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-200"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {order ? 'Save Changes' : 'Create Order'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
