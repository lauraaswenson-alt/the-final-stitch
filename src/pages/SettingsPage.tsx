import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/Input'
import { Toggle } from '../components/ui/Toggle'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

export default function SettingsPage() {
  const { appUser, signOut } = useAuth()
  const [firstName, setFirstName] = useState(appUser?.first_name || '')
  const [emailAlerts, setEmailAlerts] = useState(
    appUser?.notification_prefs?.email_alerts ?? true
  )
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (appUser) {
      setFirstName(appUser.first_name)
      setEmailAlerts(appUser.notification_prefs?.email_alerts ?? true)
    }
  }, [appUser])

  const handleSave = async () => {
    if (!appUser) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          notification_prefs: { email_alerts: emailAlerts },
        })
        .eq('id', appUser.id)

      if (error) throw error
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      // Delete user data (cascades will handle orders and finishers)
      if (appUser) {
        await supabase.from('users').delete().eq('id', appUser.id)
      }
      await signOut()
      toast.success('Account deleted')
    } catch {
      toast.error('Failed to delete account. Please contact support.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Profile */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</h3>
        <Input
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Email"
          value={appUser?.email || ''}
          disabled
          helperText="Email cannot be changed here"
        />
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      {/* Notifications */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notifications</h3>
        <Toggle
          label="Email alerts for finishing orders"
          checked={emailAlerts}
          onChange={(checked) => {
            setEmailAlerts(checked)
          }}
        />
        <p className="text-xs text-gray-500">
          When enabled, you'll receive email reminders at 30 days, 7 days, and when an order is overdue.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-red-100 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-red-500">Danger Zone</h3>
        <p className="text-sm text-gray-600">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </Button>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete your account? All your finishing orders, finisher contacts, and settings will be lost forever.
        </p>
        <div className="mt-4 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDeleteAccount}>
            Delete Everything
          </Button>
        </div>
      </Modal>
    </div>
  )
}
