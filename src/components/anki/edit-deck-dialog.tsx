'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AnkiTreeNode, AnkiDeckUpdate } from '@/types/anki'
import { IconSelector } from './icon-selector'

interface EditDeckDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (deckData: AnkiDeckUpdate) => void
  deck: AnkiTreeNode | null
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'
]

// Icônes supprimées - utilisées maintenant dans IconSelector

export function EditDeckDialog({ isOpen, onClose, onSubmit, deck }: EditDeckDialogProps) {
  const [formData, setFormData] = useState<AnkiDeckUpdate>({})

  // Initialiser le formulaire quand le deck change
  useEffect(() => {
    if (deck) {
      setFormData({
        name: deck.name,
        description: deck.description,
        color: deck.color,
        icon: deck.icon,
        new_cards_per_day: deck.new_cards_per_day,
        review_cards_per_day: deck.review_cards_per_day
      })
    }
  }, [deck])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name?.trim()) return
    
    onSubmit({
      ...formData,
      name: formData.name.trim()
    })
  }

  const handleClose = () => {
    setFormData({})
    onClose()
  }

  if (!deck) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le deck</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du deck</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Ranges d'ouverture"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
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
              selectedIcon={formData.icon || '📚'}
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

          {/* Configuration */}
          <details className="space-y-2" open>
            <summary className="cursor-pointer text-sm font-medium">
              Configuration
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
                    value={formData.new_cards_per_day || 20}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      new_cards_per_day: parseInt(e.target.value) || 20
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
                    value={formData.review_cards_per_day || 200}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      review_cards_per_day: parseInt(e.target.value) || 200
                    }))}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Statistiques en lecture seule */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Statistiques</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-blue-600">{deck.cardCount}</div>
                <div className="text-muted-foreground">Cartes</div>
              </div>
              <div>
                <div className="font-bold text-green-600">{deck.newCards}</div>
                <div className="text-muted-foreground">Nouvelles</div>
              </div>
              <div>
                <div className="font-bold text-red-600">{deck.dueCards}</div>
                <div className="text-muted-foreground">À réviser</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formData.name?.trim()}>
              Sauvegarder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}