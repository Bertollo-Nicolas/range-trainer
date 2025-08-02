'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { RangeEditorData } from '@/types/editor'

interface UseAutoSaveOptions {
  data: RangeEditorData
  onSave: (data: RangeEditorData) => Promise<void>
  enabled?: boolean
  interval?: number // milliseconds
  onError?: (error: Error) => void
  onSuccess?: () => void
}

interface AutoSaveState {
  isAutoSaving: boolean
  lastSaved: Date | null
  lastAttempt: Date | null
  error: Error | null
  pendingChanges: boolean
}

export const useAutoSave = ({
  data,
  onSave,
  enabled = true,
  interval = 5000, // 5 seconds default
  onError,
  onSuccess
}: UseAutoSaveOptions) => {
  const [state, setState] = useState<AutoSaveState>({
    isAutoSaving: false,
    lastSaved: null,
    lastAttempt: null,
    error: null,
    pendingChanges: false
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<string>('')
  const isMountedRef = useRef(true)

  // Track if data has changed
  const currentDataString = JSON.stringify(data)
  const hasDataChanged = currentDataString !== lastDataRef.current

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Auto save logic
  const performAutoSave = useCallback(async () => {
    if (!enabled || !hasDataChanged || state.isAutoSaving) {
      return
    }

    setState(prev => ({ 
      ...prev, 
      isAutoSaving: true, 
      lastAttempt: new Date(),
      error: null 
    }))

    try {
      await onSave(data)
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isAutoSaving: false,
          lastSaved: new Date(),
          pendingChanges: false,
          error: null
        }))
        lastDataRef.current = currentDataString
        onSuccess?.()
      }
    } catch (error) {
      if (isMountedRef.current) {
        const saveError = error instanceof Error ? error : new Error('Auto-save failed')
        setState(prev => ({
          ...prev,
          isAutoSaving: false,
          error: saveError
        }))
        onError?.(saveError)
      }
    }
  }, [data, enabled, hasDataChanged, state.isAutoSaving, onSave, currentDataString, onError, onSuccess])

  // Schedule auto save when data changes
  useEffect(() => {
    if (!enabled || !hasDataChanged) {
      return
    }

    setState(prev => ({ ...prev, pendingChanges: true }))

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule new auto save
    timeoutRef.current = setTimeout(() => {
      performAutoSave()
    }, interval)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [hasDataChanged, enabled, interval, performAutoSave])

  // Force save immediately
  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    await performAutoSave()
  }, [performAutoSave])

  // Cancel pending auto save
  const cancelAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setState(prev => ({ ...prev, pendingChanges: false }))
  }, [])

  // Reset auto save state
  const resetAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState({
      isAutoSaving: false,
      lastSaved: null,
      lastAttempt: null,
      error: null,
      pendingChanges: false
    })
    lastDataRef.current = ''
  }, [])

  // Get time since last save
  const getTimeSinceLastSave = useCallback((): number | null => {
    if (!state.lastSaved) return null
    return Date.now() - state.lastSaved.getTime()
  }, [state.lastSaved])

  // Get time until next auto save
  const getTimeUntilNextSave = useCallback((): number | null => {
    if (!state.pendingChanges || !enabled) return null
    if (!state.lastAttempt) return interval
    
    const elapsed = Date.now() - state.lastAttempt.getTime()
    return Math.max(0, interval - elapsed)
  }, [state.pendingChanges, state.lastAttempt, enabled, interval])

  // Format time for display
  const formatTime = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }, [])

  return {
    // State
    isAutoSaving: state.isAutoSaving,
    lastSaved: state.lastSaved,
    lastAttempt: state.lastAttempt,
    error: state.error,
    pendingChanges: state.pendingChanges,
    hasUnsavedChanges: hasDataChanged || state.pendingChanges,
    
    // Actions
    forceSave,
    cancelAutoSave,
    resetAutoSave,
    
    // Utilities
    getTimeSinceLastSave,
    getTimeUntilNextSave,
    formatTime,
    
    // Status helpers
    canForceSave: !state.isAutoSaving && (hasDataChanged || state.pendingChanges),
    isEnabled: enabled,
    
    // For display
    statusText: state.isAutoSaving 
      ? 'Auto-saving...' 
      : state.pendingChanges 
        ? `Auto-save in ${formatTime(getTimeUntilNextSave() || 0)}`
        : state.lastSaved 
          ? `Last saved ${formatTime(getTimeSinceLastSave() || 0)} ago`
          : 'Not saved',
          
    statusColor: state.error 
      ? 'destructive'
      : state.isAutoSaving 
        ? 'default'
        : state.pendingChanges 
          ? 'warning'
          : 'success'
  }
}

// Hook for manual debounced save (alternative to auto-save)
export const useDebouncedSave = ({
  data,
  onSave,
  delay = 1000,
  onError,
  onSuccess
}: {
  data: RangeEditorData
  onSave: (data: RangeEditorData) => Promise<void>
  delay?: number
  onError?: (error: Error) => void
  onSuccess?: () => void
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<string>('')

  const currentDataString = JSON.stringify(data)
  const hasChanged = currentDataString !== lastDataRef.current

  const debouncedSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      if (!hasChanged) return

      setIsSaving(true)
      try {
        await onSave(data)
        lastDataRef.current = currentDataString
        onSuccess?.()
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Save failed'))
      } finally {
        setIsSaving(false)
      }
    }, delay)
  }, [data, hasChanged, onSave, currentDataString, delay, onError, onSuccess])

  // Trigger debounced save when data changes
  useEffect(() => {
    if (hasChanged) {
      debouncedSave()
    }
  }, [hasChanged, debouncedSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const saveImmediately = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setIsSaving(true)
    try {
      await onSave(data)
      lastDataRef.current = currentDataString
      onSuccess?.()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Save failed'))
    } finally {
      setIsSaving(false)
    }
  }, [data, onSave, currentDataString, onError, onSuccess])

  return {
    isSaving,
    hasUnsavedChanges: hasChanged,
    saveImmediately,
    cancelSave: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }
}