import { LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Header() {
  const { appUser, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <h1 className="text-xl font-bold text-sage-700">The Final Stitch</h1>
        <div className="flex items-center gap-3">
          {appUser && (
            <span className="hidden text-sm text-gray-600 sm:inline">
              Hi, {appUser.first_name}!
            </span>
          )}
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
