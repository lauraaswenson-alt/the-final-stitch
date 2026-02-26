import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-6 sm:pb-6">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
