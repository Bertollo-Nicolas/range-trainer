'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AnkiDeckInsert, DEFAULT_DECK_CONFIG } from '@/types/anki'
import { IconSelector } from './icon-selector'

interface CreateDeckDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (deckData: AnkiDeckInsert) => void
  parentId?: string | null
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
]

// Icons now handled by IconSelector

export function CreateDeckDialog({ isOpen, onClose, onSubmit, parentId }: CreateDeckDialogProps) {
  const [formData, setFormData] = useState<AnkiDeckInsert>({
    ...DEFAULT_DECK_CONFIG,
    name: '',
    description: '',
    parent_id: parentId || null,
    learning_steps: [...DEFAULT_DECK_CONFIG.learning_steps]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return
    
    onSubmit({
      ...formData,
      name: formData.name.trim(),
      parent_id: parentId || null
    })
    
    // Reset form
    setFormData({
      ...DEFAULT_DECK_CONFIG,
      name: '',
      description: '',
      parent_id: parentId || null,
      learning_steps: [...DEFAULT_DECK_CONFIG.learning_steps]
    })
  }

  const handleClose = () => {
    setFormData({
      ...DEFAULT_DECK_CONFIG,
      name: '',
      description: '',
      parent_id: parentId || null,
      learning_steps: [...DEFAULT_DECK_CONFIG.learning_steps]
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentId ? 'Créer un sous-deck' : 'Créer un nouveau deck'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du deck</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Ranges d'ouverture"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du contenu de ce deck..."
              rows={3}
            />
          </div>

          {/* Icône */}
          <div className="space-y-2">
            <Label>Icône</Label>
            <IconSelector
              selectedIcon={formData.icon || DEFAULT_DECK_CONFIG.icon}
              onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
            />
          </div>

          {/* Couleur */}
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full border-2"
                  style={{ 
                    backgroundColor: color,
                    borderColor: formData.color === color ? '#000' : color
                  }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          {/* Configuration avancée (pliable) */}
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">
              Configuration avancée
            </summary>
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="new_cards">Nouvelles cartes/jour</Label>
                  <Input
                    id="new_cards"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.new_cards_per_day}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_cards_per_day: parseInt(e.target.value) || DEFAULT_DECK_CONFIG.new_cards_per_day 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="review_cards">Révisions/jour</Label>
                  <Input
                    id="review_cards"
                    type="number"
                    min="1"
                    max="500"
                    value={formData.review_cards_per_day}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      review_cards_per_day: parseInt(e.target.value) || DEFAULT_DECK_CONFIG.review_cards_per_day 
                    }))}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formData.name.trim()}>
              Créer le deck
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}