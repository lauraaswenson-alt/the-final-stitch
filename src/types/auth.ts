import type { Session, User as SupabaseUser } from '@supabase/supabase-js'

export interface AppUser {
  id: string
  email: string
  first_name: string
  notification_prefs: {
    email_alerts: boolean
  }
  created_at: string
  updated_at: string
}

export interface AuthState {
  session: Session | null
  user: SupabaseUser | null
  appUser: AppUser | null
  loading: boolean
}
