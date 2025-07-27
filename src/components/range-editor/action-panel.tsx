'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Action, MixedColor } from '@/types/range-editor'
import { ColorPicker } from './color-picker'
import { MixedColorManager } from './mixed-color-manager'
import { cn } from '@/lib/utils'

interface ActionPanelProps {
  actions: Action[]
  mixedColors: MixedColor[]
  activeActionId: string
  activeMixedColorId: string | null
  onActionsChange: (actions: Action[]) => void
  onMixedColorsChange: (mixedColors: MixedColor[]) => void
  onActiveActionChange: (actionId: string) => void
  onActiveMixedColorChange: (mixedColorId: string | null) => void
}

export function ActionPanel({
  actions,
  mixedColors,
  activeActionId,
  activeMixedColorId,
  onActionsChange,
  onMixedColorsChange,
  onActiveActionChange,
  onActiveMixedColorChange
}: ActionPanelProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)

  const addAction = () => {
    const newAction: Action = {
      id: `action-${Date.now()}`,
      name: '',
      color: '#6b994c',
      isActive: false
    }
    onActionsChange([...actions, newAction])
    // Auto-sélectionner la nouvelle action
    onActiveActionChange(newAction.id)
    onActiveMixedColorChange(null)
  }

  const updateAction = (actionId: string, updates: Partial<Action>) => {
    onActionsChange(actions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    ))
  }

  const deleteAction = (actionId: string) => {
    if (actions.length <= 1) return
    onActionsChange(actions.filter(action => action.id !== actionId))
    if (activeActionId === actionId) {
      onActiveActionChange(actions[0].id)
    }
  }

  const selectAction = (actionId: string) => {
    onActiveActionChange(actionId)
    onActiveMixedColorChange(null)
  }

  const selectMixedColor = (mixedColorId: string) => {
    onActiveMixedColorChange(mixedColorId)
    onActiveActionChange('')
  }

  return (
    <div className="space-y-6">
      {/* Actions Section */}
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div
            key={action.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border transition-colors",
              activeActionId === action.id && !activeMixedColorId
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            {/* Radio Button */}
            <input
              type="radio"
              checked={activeActionId === action.id && !activeMixedColorId}
              onChange={() => selectAction(action.id)}
              className="w-3 h-3 cursor-pointer accent-primary"
            />

            {/* Color Square */}
            <button
              className="w-8 h-8 rounded border border-border hover:scale-105 transition-transform cursor-pointer"
              style={{ backgroundColor: action.color }}
              onClick={() => setColorPickerOpen(action.id)}
            />

            {/* Name Input */}
            <Input
              value={action.name}
              onChange={(e) => updateAction(action.id, { name: e.target.value })}
              placeholder="Nom de l'action"
              className="flex-1 h-8 text-sm"
            />

            {/* Delete Button */}
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAction(action.id)}
                className="p-1 h-auto hover:text-destructive cursor-pointer"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Add Action Button */}
        <Button
          onClick={addAction}
          variant="outline"
          className="w-full gap-2 h-8 text-sm cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          Add Color
        </Button>
      </div>

      {/* Mixed Colors Section */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Mixed Colors</h4>
        <MixedColorManager
          actions={actions}
          mixedColors={mixedColors}
          activeMixedColorId={activeMixedColorId}
          onMixedColorsChange={onMixedColorsChange}
          onSelectMixedColor={selectMixedColor}
        />
      </div>

      {/* Color Picker */}
      {colorPickerOpen && (
        <ColorPicker
          isOpen={true}
          onClose={() => setColorPickerOpen(null)}
          color={actions.find(a => a.id === colorPickerOpen)?.color || '#6b994c'}
          onColorChange={(color) => {
            if (colorPickerOpen) {
              updateAction(colorPickerOpen, { color })
            }
          }}
        />
      )}
    </div>
  )
}