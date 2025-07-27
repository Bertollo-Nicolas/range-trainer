'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AnkiCardInsert } from '@/types/anki'
import { TagInput } from './tag-input'

interface CreateCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (cardData: AnkiCardInsert) => void
  deckId: string
}

export function CreateCardDialog({ isOpen, onClose, onSubmit, deckId }: CreateCardDialogProps) {
  const [formData, setFormData] = useState<AnkiCardInsert>({
    deck_id: deckId,
    front: '',
    back: '',
    tags: []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.front.trim() || !formData.back.trim()) return
    
    onSubmit({
      ...formData,
      front: formData.front.trim(),
      back: formData.back.trim(),
      deck_id: deckId
    })
    
    // Reset form
    setFormData({
      deck_id: deckId,
      front: '',
      back: '',
      tags: []
    })
  }

  const handleClose = () => {
    setFormData({
      deck_id: deckId,
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle carte</DialogTitle>
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
              tags={formData.tags || []}
              onTagsChange={handleTagsChange}
              placeholder="Ajouter un tag..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!formData.front.trim() || !formData.back.trim()}>
              Créer la carte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}