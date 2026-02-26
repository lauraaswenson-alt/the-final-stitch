import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FinishingOrder, FinishingOrderInput, OrderStatus } from '../types/orders'

export function useOrders() {
  const [orders, setOrders] = useState<FinishingOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('finishing_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }, [])

  const getOrder = useCallback(async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('finishing_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    return data as FinishingOrder
  }, [])

  const createOrder = useCallback(async (input: FinishingOrderInput) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: insertError } = await supabase
      .from('finishing_orders')
      .insert({
        ...input,
        user_id: user.id,
        status: input.status || 'dropped_off',
        alert_enabled: input.alert_enabled ?? true,
        deposit_paid: input.deposit_paid ?? false,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)
    setOrders((prev) => [data, ...prev])
    return data as FinishingOrder
  }, [])

  const updateOrder = useCallback(async (id: string, input: Partial<FinishingOrderInput>) => {
    const { data, error: updateError } = await supabase
      .from('finishing_orders')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    setOrders((prev) => prev.map((o) => (o.id === id ? data : o)))
    return data as FinishingOrder
  }, [])

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    )

    const { error: updateError } = await supabase
      .from('finishing_orders')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      // Revert on failure
      await fetchOrders()
      throw new Error(updateError.message)
    }
  }, [fetchOrders])

  const deleteOrder = useCallback(async (id: string) => {
    // Also delete photo if exists
    const order = orders.find((o) => o.id === id)
    if (order?.photo_url) {
      const path = extractStoragePath(order.photo_url)
      if (path) {
        await supabase.storage.from('canvas-photos').remove([path])
      }
    }

    const { error: deleteError } = await supabase
      .from('finishing_orders')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)
    setOrders((prev) => prev.filter((o) => o.id !== id))
  }, [orders])

  return {
    orders,
    loading,
    error,
    fetchOrders,
    getOrder,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
  }
}

function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/canvas-photos\/(.+?)(\?|$)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
