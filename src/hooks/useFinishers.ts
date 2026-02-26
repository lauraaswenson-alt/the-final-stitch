import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Finisher, FinisherInput } from '../types/finishers'

export function useFinishers() {
  const [finishers, setFinishers] = useState<Finisher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFinishers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('finishers')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setFinishers(data || [])
    }
    setLoading(false)
  }, [])

  const getFinisher = useCallback(async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('finishers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    return data as Finisher
  }, [])

  const createFinisher = useCallback(async (input: FinisherInput) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: insertError } = await supabase
      .from('finishers')
      .insert({
        ...input,
        user_id: user.id,
        is_active: input.is_active ?? true,
        specialties: input.specialties || [],
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)
    setFinishers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data as Finisher
  }, [])

  const updateFinisher = useCallback(async (id: string, input: Partial<FinisherInput>) => {
    const { data, error: updateError } = await supabase
      .from('finishers')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    setFinishers((prev) => prev.map((f) => (f.id === id ? data : f)))
    return data as Finisher
  }, [])

  const deleteFinisher = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('finishers')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)
    setFinishers((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const quickSaveFinisher = useCallback(async (name: string) => {
    return createFinisher({ name })
  }, [createFinisher])

  return {
    finishers,
    loading,
    error,
    fetchFinishers,
    getFinisher,
    createFinisher,
    updateFinisher,
    deleteFinisher,
    quickSaveFinisher,
  }
}
