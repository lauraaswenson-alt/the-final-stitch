export interface Finisher {
  id: string
  user_id: string
  name: string
  city: string | null
  state: string | null
  contact_email: string | null
  contact_phone: string | null
  instagram: string | null
  specialties: string[]
  turnaround_notes: string | null
  price_notes: string | null
  how_found: string | null
  personal_notes: string | null
  personal_rating: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinisherInput {
  name: string
  city?: string
  state?: string
  contact_email?: string
  contact_phone?: string
  instagram?: string
  specialties?: string[]
  turnaround_notes?: string
  price_notes?: string
  how_found?: string
  personal_notes?: string
  personal_rating?: number
  is_active?: boolean
}
