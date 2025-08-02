'use client'

import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'

interface EditorToasterProps {
  hasUnsavedChanges: boolean
  isSaving: boolean
  saveSuccess: boolean
  error: string | null
}

export function EditorToaster({ hasUnsavedChanges, isSaving, saveSuccess, error }: EditorToasterProps) {
  // Toast pour succès de sauvegarde
  useEffect(() => {
    if (saveSuccess) {
      toast.success('Range saved successfully', {
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 2000,
      })
    }
  }, [saveSuccess])

  // Toast pour erreurs
  useEffect(() => {
    if (error) {
      toast.error(`Save failed: ${error}`, {
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 4000,
      })
    }
  }, [error])

  // Toast persistant pour changements non sauvegardés (discret)
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      toast('Unsaved changes', {
        icon: <Save className="h-4 w-4" />,
        description: 'Press Ctrl+S to save',
        duration: Infinity, // Reste affiché
        id: 'unsaved-changes', // ID unique pour éviter les doublons
        position: 'bottom-right',
        className: 'opacity-75',
        action: {
          label: 'Save',
          onClick: () => {
            // Déclenche la sauvegarde via un event custom
            window.dispatchEvent(new CustomEvent('editor-save'))
          }
        }
      })

      return () => {
        toast.dismiss('unsaved-changes')
      }
    } else {
      toast.dismiss('unsaved-changes')
      return () => {} // Empty cleanup function
    }
  }, [hasUnsavedChanges, isSaving])

  return (
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        },
      }}
      closeButton
      richColors
    />
  )
}

// Hook pour écouter l'event de sauvegarde custom
export function useEditorSaveEvent(onSave: () => void) {
  useEffect(() => {
    const handleSave = () => onSave()
    window.addEventListener('editor-save', handleSave)
    return () => window.removeEventListener('editor-save', handleSave)
  }, [onSave])
}