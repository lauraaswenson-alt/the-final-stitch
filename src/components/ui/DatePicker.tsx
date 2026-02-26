import { type InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          className={clsx(
            'block w-full rounded-lg border px-3 py-2 text-sm text-charcoal transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-sage-400 focus:ring-sage-200',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
