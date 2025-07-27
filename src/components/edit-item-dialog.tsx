'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Folder, FileText } from 'lucide-react'
import { TreeItem } from '@/types/range'

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TreeItem | null
  onConfirm: (id: string, name: string) => void
}

export function EditItemDialog({ open, onOpenChange, item, onConfirm }: EditItemDialogProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && item) {
      onConfirm(item.id, name.trim())
      setName('')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setName('')
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'folder' ? (
              <Folder className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Modifier {item.type === 'folder' ? 'le dossier' : 'le range'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder={`Nom du ${item.type === 'folder' ? 'dossier' : 'range'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || name === item.name}>
              Modifier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}