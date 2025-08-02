'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { TreeItem } from '@/types/range'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DuplicateItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TreeItem | null
  onConfirm: (name: string) => void
}

export function DuplicateItemDialog({ open, onOpenChange, item, onConfirm }: DuplicateItemDialogProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !item) return

    setIsLoading(true)
    try {
      await onConfirm(name.trim())
      setName('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
    }
    onOpenChange(newOpen)
  }

  // Générer un nom par défaut quand le dialog s'ouvre
  const handleOpenChangeWithDefault = (newOpen: boolean) => {
    if (newOpen && item) {
      setName(`${item.name || 'Item'} - Copie`)
    }
    handleOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithDefault}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Dupliquer la range
          </DialogTitle>
          <DialogDescription>
            Créer une copie de "{item?.name}" avec un nouveau nom.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la copie</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez le nom de la copie..."
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? 'Duplication...' : 'Dupliquer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}