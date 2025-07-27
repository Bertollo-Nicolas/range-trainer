'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Folder, FileText, AlertTriangle } from 'lucide-react'
import { TreeItem } from '@/types/range'

interface DeleteItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TreeItem | null
  onConfirm: (id: string) => void
  hasChildren?: boolean
}

export function DeleteItemDialog({ open, onOpenChange, item, onConfirm, hasChildren = false }: DeleteItemDialogProps) {
  const handleConfirm = () => {
    if (item) {
      onConfirm(item.id)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Supprimer {item.type === 'folder' ? 'le dossier' : 'le range'}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              {item.type === 'folder' ? (
                <Folder className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="font-medium">{item.name}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cet élément ?
          </p>
          
          {hasChildren && item.type === 'folder' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Ce dossier contient des éléments
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                Tous les sous-dossiers et ranges seront également supprimés.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}