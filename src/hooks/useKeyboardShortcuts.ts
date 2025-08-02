'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

type ShortcutHandler = (event: KeyboardEvent) => void | boolean

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  handler: ShortcutHandler
  description?: string
  preventDefault?: boolean
  stopPropagation?: boolean
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  target?: HTMLElement | Document | Window
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  target
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts)
  const [registeredShortcuts, setRegisteredShortcuts] = useState<KeyboardShortcut[]>(shortcuts)

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    setRegisteredShortcuts(shortcuts)
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const activeShortcuts = shortcutsRef.current.filter(shortcut => 
      shortcut.enabled !== false
    )

    for (const shortcut of activeShortcuts) {
      const {
        key,
        ctrl = false,
        alt = false,
        shift = false,
        meta = false,
        handler,
        preventDefault = true,
        stopPropagation = false
      } = shortcut

      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase() ||
                        event.code.toLowerCase() === key.toLowerCase()

      // Check if modifiers match
      const ctrlMatches = event.ctrlKey === ctrl
      const altMatches = event.altKey === alt
      const shiftMatches = event.shiftKey === shift
      const metaMatches = event.metaKey === meta

      if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
        if (preventDefault) {
          event.preventDefault()
        }
        if (stopPropagation) {
          event.stopPropagation()
        }

        const result = handler(event)
        
        // If handler returns false, stop processing other shortcuts
        if (result === false) {
          break
        }
      }
    }
  }, [enabled])

  useEffect(() => {
    const targetElement = target || document

    targetElement.addEventListener('keydown', handleKeyDown)

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, target])

  // Utility to add a shortcut dynamically
  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current = [...shortcutsRef.current, shortcut]
    setRegisteredShortcuts(prev => [...prev, shortcut])
  }, [])

  // Utility to remove a shortcut dynamically
  const removeShortcut = useCallback((key: string, modifiers?: {
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    meta?: boolean
  }) => {
    const newShortcuts = shortcutsRef.current.filter(shortcut => {
      if (shortcut.key.toLowerCase() !== key.toLowerCase()) return true
      
      if (modifiers) {
        return !(
          shortcut.ctrl === (modifiers.ctrl || false) &&
          shortcut.alt === (modifiers.alt || false) &&
          shortcut.shift === (modifiers.shift || false) &&
          shortcut.meta === (modifiers.meta || false)
        )
      }
      
      return false
    })
    
    shortcutsRef.current = newShortcuts
    setRegisteredShortcuts(newShortcuts)
  }, [])

  // Utility to enable/disable specific shortcuts
  const toggleShortcut = useCallback((key: string, enabled: boolean) => {
    const newShortcuts = shortcutsRef.current.map(shortcut => 
      shortcut.key.toLowerCase() === key.toLowerCase() 
        ? { ...shortcut, enabled }
        : shortcut
    )
    
    shortcutsRef.current = newShortcuts
    setRegisteredShortcuts(newShortcuts)
  }, [])

  return {
    registeredShortcuts,
    addShortcut,
    removeShortcut,
    toggleShortcut
  }
}

// Hook for editor-specific shortcuts
export function useEditorKeyboardShortcuts({
  onSave,
  onUndo,
  onRedo,
  onClear,
  onSelectAll,
  onCopy,
  onPaste,
  onToggleMode,
  enabled = true
}: {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onClear?: () => void
  onSelectAll?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onToggleMode?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [
    // Save
    {
      key: 's',
      ctrl: true,
      handler: () => onSave?.(),
      description: 'Save range',
      enabled: !!onSave
    },
    // Undo
    {
      key: 'z',
      ctrl: true,
      handler: () => onUndo?.(),
      description: 'Undo last action',
      enabled: !!onUndo
    },
    // Redo
    {
      key: 'z',
      ctrl: true,
      shift: true,
      handler: () => onRedo?.(),
      description: 'Redo last action',
      enabled: !!onRedo
    },
    // Clear all
    {
      key: 'Delete',
      ctrl: true,
      handler: () => onClear?.(),
      description: 'Clear all selections',
      enabled: !!onClear
    },
    // Select all
    {
      key: 'a',
      ctrl: true,
      handler: () => onSelectAll?.(),
      description: 'Select all hands',
      enabled: !!onSelectAll
    },
    // Copy
    {
      key: 'c',
      ctrl: true,
      handler: () => onCopy?.(),
      description: 'Copy selection',
      enabled: !!onCopy
    },
    // Paste
    {
      key: 'v',
      ctrl: true,
      handler: () => onPaste?.(),
      description: 'Paste selection',
      enabled: !!onPaste
    },
    // Toggle edit mode
    {
      key: 'e',
      ctrl: true,
      handler: () => onToggleMode?.(),
      description: 'Toggle edit mode',
      enabled: !!onToggleMode
    },
    // Escape to cancel
    {
      key: 'Escape',
      handler: () => {
        // Close any open dialogs or cancel operations
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.blur) {
          activeElement.blur()
        }
      },
      description: 'Cancel current operation'
    }
  ]

  return useKeyboardShortcuts({
    shortcuts: shortcuts.filter(s => s.enabled !== false),
    enabled
  })
}

// Hook for navigation shortcuts
export function useNavigationShortcuts({
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onEnter,
  onHome,
  onEnd,
  enabled = true
}: {
  onMoveUp?: () => void
  onMoveDown?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onEnter?: () => void
  onHome?: () => void
  onEnd?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ArrowUp',
      handler: () => onMoveUp?.(),
      description: 'Move selection up',
      enabled: !!onMoveUp
    },
    {
      key: 'ArrowDown',
      handler: () => onMoveDown?.(),
      description: 'Move selection down',
      enabled: !!onMoveDown
    },
    {
      key: 'ArrowLeft',
      handler: () => onMoveLeft?.(),
      description: 'Move selection left',
      enabled: !!onMoveLeft
    },
    {
      key: 'ArrowRight',
      handler: () => onMoveRight?.(),
      description: 'Move selection right',
      enabled: !!onMoveRight
    },
    {
      key: 'Enter',
      handler: () => onEnter?.(),
      description: 'Confirm selection',
      enabled: !!onEnter
    },
    {
      key: 'Home',
      handler: () => onHome?.(),
      description: 'Go to beginning',
      enabled: !!onHome
    },
    {
      key: 'End',
      handler: () => onEnd?.(),
      description: 'Go to end',
      enabled: !!onEnd
    }
  ]

  return useKeyboardShortcuts({
    shortcuts: shortcuts.filter(s => s.enabled !== false),
    enabled
  })
}

// Utility function to format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  
  if (shortcut.meta) parts.push('⌘')
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.shift) parts.push('⇧')
  
  // Format key name
  let keyName = shortcut.key
  switch (shortcut.key.toLowerCase()) {
    case 'arrowup': keyName = '↑'; break
    case 'arrowdown': keyName = '↓'; break
    case 'arrowleft': keyName = '←'; break
    case 'arrowright': keyName = '→'; break
    case 'enter': keyName = '↵'; break
    case 'escape': keyName = 'Esc'; break
    case 'delete': keyName = 'Del'; break
    case 'backspace': keyName = '⌫'; break
    case 'tab': keyName = '⇥'; break
    case 'space': keyName = '␣'; break
    default: keyName = shortcut.key.toUpperCase()
  }
  
  parts.push(keyName)
  
  return parts.join('+')
}

// Component to display keyboard shortcuts help
export function KeyboardShortcutsHelp({ 
  shortcuts,
  className = ""
}: { 
  shortcuts: KeyboardShortcut[]
  className?: string 
}) {
  const enabledShortcuts = shortcuts.filter(s => s.enabled !== false && s.description)

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="font-medium text-sm">Keyboard Shortcuts</h3>
      <div className="space-y-1">
        {enabledShortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
              {formatShortcut(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}