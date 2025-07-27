'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AnkiCard, AnkiCardUpdate } from '@/types/anki'
import { TagInput } from './tag-input'

interface EditCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (cardId: string, updates: AnkiCardUpdate) => void
  card: AnkiCard | null
}

export function EditCardDialog({ isOpen, onClose, onSubmit, card }: EditCardDialogProps) {
  const [formData, setFormData] = useState<{
    front: string
    back: string
    tags: string[]
  }>({
    front: '',
    back: '',
    tags: []
  })

  useEffect(() => {
    if (card) {
      setFormData({
        front: card.front,
        back: card.back,
        tags: card.tags || []
      })
    }
  }, [card])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.front.trim() || !formData.back.trim() || !card) return
    
    onSubmit(card.id, {
      front: formData.front.trim(),
      back: formData.back.trim(),
      tags: formData.tags
    })
    
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      front: '',
      back: '',
      tags: []
    })
    onClose()
  }

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags
    }))
  }

  if (!card) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la carte</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recto */}
          <div className="space-y-2">
            <Label htmlFor="front">Recto (Question)</Label>
            <Textarea
              id="front"
              value={formData.front}
              onChange={(e) => setFormData(prev => ({ ...prev, front: e.target.value }))}
              placeholder="Qu'est-ce qu'une range d'ouverture en UTG ?"
              rows={4}
              required
            />
          </div>

          {/* Verso */}
          <div className="space-y-2">
            <Label htmlFor="back">Verso (Réponse)</Label>
            <Textarea
              id="back"
              value={formData.back}
              onChange={(e) => setFormData(prev => ({ ...prev, back: e.target.value }))}
              placeholder="C'est l'ensemble des mains qu'on joue depuis la position Under The Gun..."
              rows={4}
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              tags={formData.tags}
              onTagsChange={handleTagsChange}
              placeholder="Ajouter un tag..."
            />
          </div>

          {/* Informations en lecture seule */}
          <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
            <div className="font-medium text-muted-foreground">Informations de la carte</div>
            <div>État: {card.card_state}</div>
            <div>Révisions: {card.review_count}</div>
            <div>Ease Factor: {card.ease_factor.toFixed(2)}</div>
            <div>Intervalle: {card.interval_days} jours</div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formData.front.trim() || !formData.back.trim()}>
              Sauvegarder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}