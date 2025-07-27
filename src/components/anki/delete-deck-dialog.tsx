'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { AnkiTreeNode } from '@/types/anki'

interface DeleteDeckDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deck: AnkiTreeNode | null
}

export function DeleteDeckDialog({ isOpen, onClose, onConfirm, deck }: DeleteDeckDialogProps) {
  if (!deck) return null

  const hasChildren = deck.children && deck.children.length > 0
  const hasCards = deck.cardCount > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer le deck
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer le deck "{deck.name}" ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations sur le deck */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{deck.icon}</span>
              <span className="font-medium">{deck.name}</span>
            </div>
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

          {/* Avertissements */}
          {(hasChildren || hasCards) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong>
                <ul className="mt-1 text-sm">
                  {hasCards && (
                    <li>• Toutes les {deck.cardCount} cartes seront supprimées définitivement</li>
                  )}
                  {hasChildren && (
                    <li>• Tous les sous-decks seront également supprimés</li>
                  )}
                  <li>• L'historique de révision sera perdu</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Toutes les données associées à ce deck seront 
            perdues définitivement.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}