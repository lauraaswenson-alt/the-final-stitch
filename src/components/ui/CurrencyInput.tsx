import { type InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  error?: string
  value: string | number
  onChange: (value: string) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, value, onChange, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
          <input
            ref={ref}
            id={inputId}
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={clsx(
              'block w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-charcoal transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-sage-400 focus:ring-sage-200',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
