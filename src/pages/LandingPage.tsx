import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Bell, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function LandingPage() {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWaitlist = async (e: FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !email.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ first_name: firstName.trim(), email: email.trim().toLowerCase() })

      if (insertError) {
        if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          setSubmitted(true) // Already on list
        } else {
          setError('Something went wrong. Please try again.')
        }
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-xl font-bold text-sage-700">The Final Stitch</h1>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sage-50 to-white" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h2 className="text-4xl font-bold text-charcoal sm:text-5xl">
            Track your canvas from{' '}
            <span className="text-sage-500">drop-off to done</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            The simple, beautiful way for needlepoint stitchers to track finishing orders,
            manage deadlines, and keep their finisher contacts private.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button size="lg">Start Tracking Free</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<ClipboardCheck className="h-8 w-8 text-sage-400" />}
            title="Track Every Order"
            description="Log finishing orders in under 2 minutes. See everything on a clean Kanban board — from drop-off through pickup."
          />
          <FeatureCard
            icon={<Bell className="h-8 w-8 text-gold-400" />}
            title="Never Miss a Deadline"
            description="Get email reminders at 30 days, 7 days, and when a piece is overdue. No more guessing when your canvas is due back."
          />
          <FeatureCard
            icon={<Lock className="h-8 w-8 text-sage-400" />}
            title="Private Finisher Book"
            description="Keep your finisher contacts, notes, and ratings in a private contact book. Your info is never shared with anyone."
          />
        </div>
      </section>

      {/* Waitlist */}
      <section className="bg-sage-50 py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <h3 className="text-2xl font-bold text-charcoal">Join the Waitlist</h3>
          <p className="mt-2 text-sm text-gray-600">
            Be the first to know about new features and updates.
          </p>

          {submitted ? (
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm border border-sage-200">
              <p className="text-sage-600 font-medium">You're on the list! We'll be in touch.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="mt-6 space-y-3">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
              />
              <Button type="submit" loading={loading} className="w-full">
                Join Waitlist
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          Built for the needlepoint community.
        </p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-50">
        {icon}
      </div>
      <h4 className="font-semibold text-charcoal">{title}</h4>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
