'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Action, MixedColor } from '@/types/range-editor'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'

interface MixedColorManagerProps {
  actions: Action[]
  mixedColors: MixedColor[]
  activeMixedColorId: string | null
  onMixedColorsChange: (mixedColors: MixedColor[]) => void
  onSelectMixedColor: (mixedColorId: string) => void
}

export function MixedColorManager({
  actions,
  mixedColors,
  activeMixedColorId,
  onMixedColorsChange,
  onSelectMixedColor
}: MixedColorManagerProps) {

  const addMixedColor = () => {
    const newMixedColor: MixedColor = {
      id: `mixed-${Date.now()}`,
      actions: [] // Commencer vide, l'utilisateur choisira
    }
    onMixedColorsChange([...mixedColors, newMixedColor])
    // Auto-sélectionner la nouvelle mixed color
    onSelectMixedColor(newMixedColor.id)
  }

  const deleteMixedColor = (mixedColorId: string) => {
    onMixedColorsChange(mixedColors.filter(mc => mc.id !== mixedColorId))
  }

  const updateMixedColor = (mixedColorId: string, updates: Partial<MixedColor>) => {
    onMixedColorsChange(mixedColors.map(mc => 
      mc.id === mixedColorId ? { ...mc, ...updates } : mc
    ))
  }

  const addActionToMixedColor = (mixedColorId: string, actionId: string) => {
    const mixedColor = mixedColors.find(mc => mc.id === mixedColorId)
    if (!mixedColor || mixedColor.actions.length >= 2) return

    const firstActionPercentage = mixedColor.actions[0]?.percentage || 50
    const newActionPercentage = 100 - firstActionPercentage

    updateMixedColor(mixedColorId, {
      actions: [
        ...mixedColor.actions,
        { actionId, percentage: newActionPercentage }
      ]
    })
  }

  const removeActionFromMixedColor = (mixedColorId: string, index: number) => {
    const mixedColor = mixedColors.find(mc => mc.id === mixedColorId)
    if (!mixedColor) return

    updateMixedColor(mixedColorId, {
      actions: mixedColor.actions.filter((_, i) => i !== index)
    })
  }

  const updatePercentages = (mixedColorId: string, percentage: number) => {
    const mixedColor = mixedColors.find(mc => mc.id === mixedColorId)
    if (!mixedColor || mixedColor.actions.length !== 2) return

    updateMixedColor(mixedColorId, {
      actions: [
        { ...mixedColor.actions[0], percentage },
        { ...mixedColor.actions[1], percentage: 100 - percentage }
      ]
    })
  }

  const getAvailableActionsForMixedColor = (mixedColor: MixedColor) => {
    const usedActionIds = mixedColor.actions.map(a => a.actionId)
    return actions.filter(action => !usedActionIds.includes(action.id))
  }

  return (
    <div className="space-y-4">
      {mixedColors.map((mixedColor) => (
        <div
          key={mixedColor.id}
          className={cn(
            "p-2 rounded-lg border transition-colors",
            activeMixedColorId === mixedColor.id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {/* Radio Button */}
            <input
              type="radio"
              checked={activeMixedColorId === mixedColor.id}
              onChange={() => onSelectMixedColor(mixedColor.id)}
              className="w-3 h-3 cursor-pointer accent-primary"
            />

            {/* Color Squares */}
            <div className="flex gap-1">
              {mixedColor.actions.map((mixedAction, index) => {
                const action = actions.find(a => a.id === mixedAction.actionId)
                return (
                  <div key={index} className="relative">
                    <div
                      className="w-8 h-8 rounded border border-border"
                      style={{ backgroundColor: action?.color || '#33353b' }}
                    />
                    <button
                      onClick={() => removeActionFromMixedColor(mixedColor.id, index)}
                      className="absolute -top-1 -left-1 w-3 h-3 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform cursor-pointer"
                    >
                      <X className="w-1.5 h-1.5" />
                    </button>
                  </div>
                )
              })}

              {/* Add Action Button */}
              {mixedColor.actions.length < 2 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-8 h-8 border-dashed border-muted-foreground/50 hover:border-muted-foreground cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {getAvailableActionsForMixedColor(mixedColor).length === 0 ? (
                      <DropdownMenuItem disabled>
                        Aucune action disponible
                      </DropdownMenuItem>
                    ) : (
                      getAvailableActionsForMixedColor(mixedColor).map((action) => (
                        <DropdownMenuItem
                          key={action.id}
                          onClick={() => addActionToMixedColor(mixedColor.id, action.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: action.color }}
                            />
                            {action.name || 'Sans nom'}
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMixedColor(mixedColor.id)}
              className="ml-auto p-1 h-auto hover:text-destructive cursor-pointer"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Percentage Slider */}
          {mixedColor.actions.length >= 2 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mixedColor.actions[0].percentage}%</span>
                <span>{mixedColor.actions[1].percentage}%</span>
              </div>
              <Slider
                value={[mixedColor.actions[0].percentage]}
                onValueChange={([value]) => updatePercentages(mixedColor.id, value)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          )}

          {/* Single Action Case */}
          {mixedColor.actions.length === 1 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mixedColor.actions[0].percentage}%</span>
                <span>Transparent</span>
              </div>
              <Slider
                value={[mixedColor.actions[0].percentage]}
                onValueChange={([value]) => updateMixedColor(mixedColor.id, {
                  actions: [{ ...mixedColor.actions[0], percentage: value }]
                })}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </div>
      ))}

      {/* Add Mixed Color Button */}
      <Button
        onClick={addMixedColor}
        variant="outline"
        className="w-full gap-2 h-8 text-sm cursor-pointer"
        disabled={actions.length === 0}
      >
        <Plus className="h-3 w-3" />
        Add Mixed Color
      </Button>
    </div>
  )
}