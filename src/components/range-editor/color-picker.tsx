'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ColorPickerProps {
  isOpen: boolean
  onClose: () => void
  color: string
  onColorChange: (color: string) => void
}

const PRESET_COLORS = [
  '#6b994c', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#059669', '#ea580c', '#be123c',
  '#4338ca', '#047857', '#b45309', '#9333ea',
  '#0284c7', '#16a34a', '#c2410c', '#7c2d12'
]

export function ColorPicker({ isOpen, onClose, color, onColorChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(color)

  const handleColorSelect = (selectedColor: string) => {
    onColorChange(selectedColor)
    onClose()
  }

  const handleCustomColorChange = () => {
    onColorChange(customColor)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir une couleur</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preset Colors */}
          <div>
            <p className="text-sm font-medium mb-2">Couleurs prédéfinies</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className="w-12 h-12 rounded border border-border hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorSelect(presetColor)}
                />
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div>
            <p className="text-sm font-medium mb-2">Couleur personnalisée</p>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-16 h-10 p-1 border"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#6b994c"
                className="flex-1"
              />
              <Button onClick={handleCustomColorChange}>
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}