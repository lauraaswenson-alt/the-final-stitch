import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)

  const uploadImage = useCallback(async (file: File, orderId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${orderId}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('canvas-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get signed URL (1 year expiry)
      const { data } = await supabase.storage
        .from('canvas-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365)

      if (!data?.signedUrl) throw new Error('Failed to get image URL')
      return data.signedUrl
    } finally {
      setUploading(false)
    }
  }, [])

  const deleteImage = useCallback(async (url: string) => {
    const match = url.match(/canvas-photos\/(.+?)(\?|$)/)
    if (!match) return
    await supabase.storage.from('canvas-photos').remove([match[1]])
  }, [])

  return { uploading, uploadImage, deleteImage }
}
