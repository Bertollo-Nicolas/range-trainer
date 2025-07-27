'use client'

import { AnkiCard } from '@/types/anki'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, RotateCcw, Target } from 'lucide-react'

interface CardPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  card: AnkiCard | null
}

export function CardPreviewDialog({ isOpen, onClose, card }: CardPreviewDialogProps) {
  if (!card) return null

  const getStateColor = (state: string) => {
    switch (state) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'learning': return 'bg-yellow-100 text-yellow-800'
      case 'review': return 'bg-green-100 text-green-800'
      case 'relearning': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'new': return 'Nouvelle'
      case 'learning': return 'Apprentissage'
      case 'review': return 'Révision'
      case 'relearning': return 'Réapprentissage'
      default: return state
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Prévisualisation de la carte</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStateColor(card.card_state)}>
                {getStateLabel(card.card_state)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-2 font-medium">Question</div>
              <div className="text-lg leading-relaxed">{card.front}</div>
            </CardContent>
          </Card>

          {/* Réponse */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-2 font-medium">Réponse</div>
              <div className="text-lg leading-relaxed">{card.back}</div>
            </CardContent>
          </Card>

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-2 font-medium">Tags</div>
              <div className="flex flex-wrap gap-1">
                {card.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Statistiques de la carte */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <RotateCcw className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-lg font-semibold">{card.review_count}</div>
              <div className="text-xs text-muted-foreground">Révisions</div>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-lg font-semibold">{card.ease_factor.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Ease Factor</div>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-lg font-semibold">{card.interval_days}</div>
              <div className="text-xs text-muted-foreground">Intervalle (j)</div>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <RotateCcw className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-lg font-semibold">{card.lapse_count}</div>
              <div className="text-xs text-muted-foreground">Échecs</div>
            </div>
          </div>

          {/* Dates importantes */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créée le:</span>
              <span>{formatDate(card.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prochaine révision:</span>
              <span>{formatDate(card.due_date)}</span>
            </div>
            {card.last_reviewed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière révision:</span>
                <span>{formatDate(card.last_reviewed)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}