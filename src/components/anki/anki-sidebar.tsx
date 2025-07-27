'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Search, FolderPlus, Loader2, AlertCircle } from 'lucide-react'
import { AnkiTreeNode } from '@/types/anki'
import { useAnkiDecks } from '@/hooks/use-anki-decks'
import { AnkiTreeItem } from './anki-tree-item'
import { CreateDeckDialog } from './create-deck-dialog'
import { EditDeckDialog } from './edit-deck-dialog'
import { DeleteDeckDialog } from './delete-deck-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AnkiSidebarProps {
  className?: string
  onSelectDeck?: (deck: AnkiTreeNode) => void
  onRefreshReady?: (refreshFn: () => void) => void
}

export function AnkiSidebar({ className, onSelectDeck, onRefreshReady }: AnkiSidebarProps) {
  const { decks, loading, error, actions } = useAnkiDecks()
  
  // Exposer la fonction de refresh à la page parente
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(actions.loadDecks)
    }
  }, [onRefreshReady, actions.loadDecks])

  const [selectedId, setSelectedId] = useState<string>()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editDeck, setEditDeck] = useState<AnkiTreeNode | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteDeck, setDeleteDeck] = useState<AnkiTreeNode | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filtrer les decks selon la recherche
  const filterDecks = (deckList: AnkiTreeNode[], term: string): AnkiTreeNode[] => {
    if (!term) return deckList

    return deckList.reduce<AnkiTreeNode[]>((acc, deck) => {
      const matchesSearch = deck.name.toLowerCase().includes(term.toLowerCase())
      const filteredChildren = filterDecks(deck.children, term)
      
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...deck,
          children: filteredChildren,
          is_expanded: filteredChildren.length > 0 ? true : deck.is_expanded
        })
      }
      
      return acc
    }, [])
  }

  const filteredDecks = filterDecks(decks, searchTerm)

  // Fonction récursive pour obtenir tous les IDs (pour le drag and drop)
  const getAllDeckIds = (deckList: AnkiTreeNode[]): string[] => {
    return deckList.reduce<string[]>((acc, deck) => {
      acc.push(deck.id)
      if (deck.children) {
        acc.push(...getAllDeckIds(deck.children))
      }
      return acc
    }, [])
  }

  const allDeckIds = getAllDeckIds(filteredDecks)

  const handleSelectDeck = (deck: AnkiTreeNode) => {
    setSelectedId(deck.id)
    onSelectDeck?.(deck)
  }

  const handleCreateDeck = (parentId: string | null = null) => {
    setCreateParentId(parentId)
    setShowCreateDialog(true)
  }

  const handleEditDeck = (deck: AnkiTreeNode) => {
    setEditDeck(deck)
    setShowEditDialog(true)
  }

  const handleDeleteDeck = (deck: AnkiTreeNode) => {
    setDeleteDeck(deck)
    setShowDeleteDialog(true)
  }

  const handleDuplicateDeck = async (deck: AnkiTreeNode) => {
    try {
      await actions.createDeck({
        name: `${deck.name} (Copie)`,
        parent_id: deck.parent_id,
        color: deck.color,
        icon: deck.icon,
        description: deck.description
      })
    } catch (error) {
      console.error('Error duplicating deck:', error)
    }
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    try {
      // Logique de déplacement - simplifié pour l'exemple
      // Dans une vraie implémentation, il faudrait gérer les positions et la hiérarchie
      await actions.moveDeck(active.id as string, over.id as string)
    } catch (error) {
      console.error('Error moving deck:', error)
    }
    
    setActiveId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Logique pour le drag over si nécessaire
  }

  const handleSubmitCreate = async (deckData: any) => {
    try {
      await actions.createDeck({
        ...deckData,
        parent_id: createParentId
      })
      setShowCreateDialog(false)
      setCreateParentId(null)
    } catch (error) {
      console.error('Error creating deck:', error)
    }
  }

  const handleSubmitEdit = async (deckData: any) => {
    if (!editDeck) return
    
    try {
      await actions.updateDeck(editDeck.id, deckData)
      setShowEditDialog(false)
      setEditDeck(null)
    } catch (error) {
      console.error('Error editing deck:', error)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteDeck) return
    
    try {
      await actions.deleteDeck(deleteDeck.id)
      setShowDeleteDialog(false)
      setDeleteDeck(null)
      
      // Désélectionner si c'était le deck sélectionné
      if (selectedId === deleteDeck.id) {
        setSelectedId(undefined)
        onSelectDeck?.(null as any)
      }
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">🎴 Anki Decks</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateDeck()}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un deck..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <FolderPlus className="h-8 w-8 mb-2" />
            <span className="text-sm text-center">
              {searchTerm ? 'Aucun deck trouvé' : 'Aucun deck créé'}
            </span>
            {!searchTerm && (
              <Button
                variant="link"
                size="sm"
                onClick={() => handleCreateDeck()}
                className="mt-2"
              >
                Créer votre premier deck
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <SortableContext items={allDeckIds} strategy={verticalListSortingStrategy}>
              {filteredDecks.map((deck) => (
                <AnkiTreeItem
                  key={deck.id}
                  item={deck}
                  level={0}
                  isSelected={selectedId === deck.id}
                  onSelect={handleSelectDeck}
                  onToggleExpanded={actions.toggleExpanded}
                  onEdit={handleEditDeck}
                  onDelete={handleDeleteDeck}
                  onDuplicate={handleDuplicateDeck}
                  onCreateChild={handleCreateDeck}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Dialogs */}
      <CreateDeckDialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          setCreateParentId(null)
        }}
        onSubmit={handleSubmitCreate}
        parentId={createParentId}
      />

      <EditDeckDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          setEditDeck(null)
        }}
        onSubmit={handleSubmitEdit}
        deck={editDeck}
      />

      <DeleteDeckDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeleteDeck(null)
        }}
        onConfirm={handleConfirmDelete}
        deck={deleteDeck}
      />
    </div>
  )
}