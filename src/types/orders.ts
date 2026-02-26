export type FinishType = 'Ornament' | 'Pillow' | 'Stocking' | 'Belt' | 'Bag' | 'Framing' | 'Other'

export type OrderStatus = 'dropped_off' | 'in_progress' | 'ready_for_pickup' | 'picked_up' | 'paid_in_full'

export interface FinishingOrder {
  id: string
  user_id: string
  canvas_name: string
  designer: string | null
  photo_url: string | null
  finisher_name: string | null
  finish_type: FinishType | null
  dropoff_date: string
  expected_return_date: string
  quoted_price: number | null
  deposit_paid: boolean
  deposit_amount: number | null
  status: OrderStatus
  alert_enabled: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FinishingOrderInput {
  canvas_name: string
  designer?: string
  photo_url?: string
  finisher_name?: string
  finish_type?: FinishType
  dropoff_date: string
  expected_return_date: string
  quoted_price?: number
  deposit_paid?: boolean
  deposit_amount?: number
  status?: OrderStatus
  alert_enabled?: boolean
  notes?: string
}
