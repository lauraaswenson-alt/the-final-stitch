import { useRef, useState, type DragEvent } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'

interface ImageUploadProps {
  value?: string | null
  onUpload: (file: File) => Promise<string>
  onRemove?: () => void
  disabled?: boolean
}

export function ImageUpload({ value, onUpload, onRemove, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, or WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setError(null)
    setUploading(true)
    try {
      await onUpload(file)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (value) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-charcoal">Canvas Photo</label>
        <div className="relative inline-block">
          <img
            src={value}
            alt="Canvas preview"
            className="h-32 w-32 rounded-lg object-cover border border-gray-200"
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-charcoal">Canvas Photo</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
          dragActive ? 'border-sage-400 bg-sage-50' : 'border-gray-300 hover:border-sage-300 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" />
            Uploading...
          </div>
        ) : (
          <>
            {dragActive ? (
              <ImageIcon className="h-8 w-8 text-sage-400" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
            <p className="text-sm text-gray-500">
              <span className="font-medium text-sage-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">JPEG, PNG, or WebP up to 5MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
