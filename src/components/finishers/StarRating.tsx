import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

export function StarRating({ value, onChange, readonly, size = 'md' }: StarRatingProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${iconSize} ${
              star <= value
                ? 'fill-gold-400 text-gold-400'
                : 'fill-none text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
