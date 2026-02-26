import { LayoutGrid, List } from 'lucide-react'
import clsx from 'clsx'

export type ViewMode = 'board' | 'list'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        onClick={() => onViewChange('board')}
        className={clsx(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          view === 'board'
            ? 'bg-sage-100 text-sage-700'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Board
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={clsx(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          view === 'list'
            ? 'bg-sage-100 text-sage-700'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <List className="h-4 w-4" />
        List
      </button>
    </div>
  )
}
