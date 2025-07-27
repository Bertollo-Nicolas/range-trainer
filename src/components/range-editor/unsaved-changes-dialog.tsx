'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  onDiscard, 
  onCancel 
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Changements non sauvegardés
          </DialogTitle>
          <DialogDescription>
            Vous avez des changements non sauvegardés dans l'éditeur de range. 
            Que souhaitez-vous faire ?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            • <strong>Sauvegarder</strong> : Enregistrer les changements et continuer
          </p>
          <p className="text-sm text-muted-foreground">
            • <strong>Ignorer</strong> : Perdre les changements et continuer
          </p>
          <p className="text-sm text-muted-foreground">
            • <strong>Annuler</strong> : Rester sur la range actuelle
          </p>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} className="order-3 sm:order-1 w-full sm:w-auto">
            Annuler
          </Button>
          <Button variant="destructive" onClick={onDiscard} className="order-2 w-full sm:w-auto">
            Ignorer les changements
          </Button>
          <Button onClick={onSave} className="order-1 sm:order-3 w-full sm:w-auto">
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}