import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, PlusCircle, BookUser, Settings } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/orders', icon: ClipboardList, label: 'Orders', end: true },
  { to: '/orders/new', icon: PlusCircle, label: 'Add' },
  { to: '/finishers', icon: BookUser, label: 'Finishers', end: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white sm:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors',
                isActive ? 'text-sage-500' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
