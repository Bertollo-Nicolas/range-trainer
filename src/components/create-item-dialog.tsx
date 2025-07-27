'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Folder, FileText } from 'lucide-react'

interface CreateItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'folder' | 'range'
  onConfirm: (name: string) => void
}

export function CreateItemDialog({ open, onOpenChange, type, onConfirm }: CreateItemDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onConfirm(name.trim())
      setName('')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'folder' ? (
              <Folder className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Créer un {type === 'folder' ? 'dossier' : 'range'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder={`Nom du ${type === 'folder' ? 'dossier' : 'range'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}