'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Search } from 'lucide-react'
import { TreeItem as TreeItemType, Folder, TreeNode } from '@/types/range'
import { TreeItem } from './tree-item'
import { CreateItemDialog } from './create-item-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AsideProps {
  className?: string
  onSelectItem?: (item: TreeItemType) => void
}

export function Aside({ className, onSelectItem }: AsideProps) {
  const [items, setItems] = useState<TreeItemType[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createType, setCreateType] = useState<'folder' | 'range'>('folder')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Sample data - À remplacer par des données Supabase
  useEffect(() => {
    const sampleData: TreeItemType[] = [
      {
        id: '1',
        name: 'Postflop',
        type: 'folder',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isExpanded: true,
      },
      {
        id: '2',
        name: 'UTG',
        type: 'folder',
        parentId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isExpanded: true,
      },
      {
        id: '3',
        name: 'Value Range',
        type: 'range',
        parentId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { hands: ['AA', 'KK', 'QQ'] },
      },
      {
        id: '4',
        name: 'Bluff Range',
        type: 'range',
        parentId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { hands: ['A5s', 'A4s', 'A3s'] },
      },
      {
        id: '5',
        name: 'Preflop',
        type: 'folder',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isExpanded: false,
      },
    ]
    setItems(sampleData)
  }, [])

  // Construire l'arbre hiérarchique
  const buildTree = (items: TreeItemType[], parentId: string | null = null, level = 0): TreeNode[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        item,
        children: buildTree(items, item.id, level + 1),
        level,
      }))
  }

  // Filtrer les éléments selon le terme de recherche
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const tree = buildTree(searchTerm ? filteredItems : items)

  const handleToggle = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id && item.type === 'folder'
        ? { ...item, isExpanded: !(item as Folder).isExpanded }
        : item
    ))
  }

  const handleCreate = (parentId: string, type: 'folder' | 'range') => {
    setCreateParentId(parentId)
    setCreateType(type)
    setShowCreateDialog(true)
  }

  const handleCreateItem = (name: string) => {
    const newItem: TreeItemType = {
      id: Date.now().toString(),
      name,
      type: createType,
      parentId: createParentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(createType === 'folder' && { isExpanded: false }),
      ...(createType === 'range' && { data: { hands: [] } }),
    }
    
    setItems(prev => [...prev, newItem])
    setShowCreateDialog(false)
    setCreateParentId(null)
  }

  const handleSelect = (item: TreeItemType) => {
    setSelectedId(item.id)
    onSelectItem?.(item)
  }

  const handleEdit = (item: TreeItemType) => {
    // TODO: Implement edit functionality
    console.log('Edit item:', item)
  }

  const handleDelete = (item: TreeItemType) => {
    // TODO: Implement delete functionality
    console.log('Delete item:', item)
  }

  const handleDuplicate = (item: TreeItemType) => {
    // TODO: Implement duplicate functionality
    console.log('Duplicate item:', item)
  }

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id)
  }

  const handleDragOver = () => {
    // Optionnel: feedback visuel pendant le survol
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    const draggedItem = items.find(item => item.id === active.id)
    const targetItem = items.find(item => item.id === over.id)
    
    if (!draggedItem || !targetItem) return

    // Empêcher de déplacer un dossier dans lui-même ou ses enfants
    if (draggedItem.type === 'folder' && isDescendant(targetItem.id, draggedItem.id, items)) {
      return
    }

    // Déterminer le nouveau parentId
    let newParentId: string | null
    
    if (targetItem.type === 'folder') {
      // Déposer dans un dossier
      newParentId = targetItem.id
    } else {
      // Déposer à côté d'un range (même niveau)
      newParentId = targetItem.parentId
    }

    // Mettre à jour l'élément déplacé
    setItems(prev => prev.map(item => 
      item.id === draggedItem.id
        ? { ...item, parentId: newParentId }
        : item
    ))

    console.log(`Moved ${draggedItem.name} to parent: ${newParentId || 'root'}`)
  }

  // Fonction utilitaire pour vérifier si un élément est descendant d'un autre
  const isDescendant = (itemId: string, ancestorId: string, items: TreeItemType[]): boolean => {
    const item = items.find(i => i.id === itemId)
    if (!item || !item.parentId) return false
    if (item.parentId === ancestorId) return true
    return isDescendant(item.parentId, ancestorId, items)
  }

  return (
    <div className={cn("flex flex-col h-full border-r bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-lg">Ranges</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCreateParentId(null)
              setCreateType('folder')
              setShowCreateDialog(true)
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="p-2">
              {tree.map((node) => (
                <TreeItem
                  key={node.item.id}
                  node={node}
                  onToggle={handleToggle}
                  onCreate={handleCreate}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  selectedId={selectedId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Create Dialog */}
      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        type={createType}
        onConfirm={handleCreateItem}
      />
    </div>
  )
}