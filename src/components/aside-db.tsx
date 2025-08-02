'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FolderPlus, Search, Folder, FileText, Loader2, AlertCircle, Upload } from 'lucide-react'
import { TreeItem as TreeItemType, TreeNode } from '@/types/range'
import { useTreeItems } from '@/hooks/use-tree-items'
import { TreeItem } from './tree-item'
import { CreateItemDialog } from './create-item-dialog'
import { EditItemDialog } from './edit-item-dialog'
import { DeleteItemDialog } from './delete-item-dialog'
import { DuplicateItemDialog } from './duplicate-item-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { RangeManagerImportDialog } from './range-manager-import-dialog'
import { RangeManagerData, RangeManagerFolder, RangeManagerImportResult } from '@/lib/services/range-manager-import'

interface AsideProps {
  className?: string
  onSelectItem?: (item: TreeItemType) => void
  onRefreshReady?: (refreshFn: () => void) => void
}

export function AsideDB({ className, onSelectItem, onRefreshReady }: AsideProps) {
  const { items, loading, error, actions } = useTreeItems()

  // Exposer la fonction de refresh à la page parente
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(actions.loadItems)
    }
  }, [onRefreshReady, actions.loadItems])
  const [selectedId, setSelectedId] = useState<string>()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createType, setCreateType] = useState<'folder' | 'range'>('folder')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editItem, setEditItem] = useState<TreeItemType | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteItem, setDeleteItem] = useState<TreeItemType | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateItem, setDuplicateItem] = useState<TreeItemType | null>(null)
  const [showRMImportDialog, setShowRMImportDialog] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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
  const filteredItems = searchTerm
    ? items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items

  // Construire l'arbre avec les éléments filtrés, en incluant les parents nécessaires
  const getItemsWithParents = (items: TreeItemType[], filtered: TreeItemType[]): TreeItemType[] => {
    if (!searchTerm) return items
    
    const result = new Set<TreeItemType>()
    
    // Ajouter tous les éléments qui matchent
    filtered.forEach(item => result.add(item))
    
    // Ajouter tous les parents nécessaires pour maintenir la hiérarchie
    filtered.forEach(item => {
      let currentParentId = item.parentId
      while (currentParentId) {
        const parent = items.find(i => i.id === currentParentId)
        if (parent) {
          result.add(parent)
          currentParentId = parent.parentId
        } else {
          break
        }
      }
    })
    
    return Array.from(result)
  }

  const itemsToShow = getItemsWithParents(items, filteredItems)
  const tree = buildTree(itemsToShow)

  const handleToggle = async (id: string) => {
    try {
      // Vérifier que l'élément existe et est un dossier
      const item = items.find(item => item.id === id)
      if (!item || item.type !== 'folder') {
        logger.warn('Cannot toggle: item not found or not a folder', { id }, 'AsideDB')
        return
      }
      
      await actions.toggleExpanded(id)
    } catch (error) {
      logger.error('Error toggling folder', { error, id }, 'AsideDB')
      // Recharger les données en cas d'erreur
      actions.loadItems()
    }
  }

  const handleCreate = (parentId: string, type: 'folder' | 'range') => {
    setCreateParentId(parentId)
    setCreateType(type)
    setShowCreateDialog(true)
  }

  const handleCreateItem = async (name: string) => {
    try {
      const newItem: Omit<TreeItemType, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        type: createType,
        parentId: createParentId,
        ...(createType === 'folder' && { isExpanded: false }),
        ...(createType === 'range' && { data: { hands: [] } }),
      }
      
      const createdItem = await actions.createItem(newItem)
      setShowCreateDialog(false)
      setCreateParentId(null)
      
      // Si c'est une range, l'auto-sélectionner pour ouvrir l'édition
      if (createType === 'range' && createdItem) {
        setSelectedId(createdItem.id)
        onSelectItem?.(createdItem)
      }
    } catch (error) {
      logger.error('Error creating item', { error, name, type: createType }, 'AsideDB')
    }
  }

  const handleSelect = (item: TreeItemType) => {
    setSelectedId(item.id)
    onSelectItem?.(item)
  }

  const handleEdit = (item: TreeItemType) => {
    setEditItem(item)
    setShowEditDialog(true)
  }

  const handleEditConfirm = async (id: string, name: string) => {
    try {
      await actions.updateItem(id, { name })
      setShowEditDialog(false)
      setEditItem(null)
    } catch (error) {
      logger.error('Error editing item', { error, id, name }, 'AsideDB')
    }
  }

  const handleDelete = (item: TreeItemType) => {
    setDeleteItem(item)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async (id: string) => {
    try {
      await actions.deleteItem(id)
      setShowDeleteDialog(false)
      setDeleteItem(null)
    } catch (error) {
      logger.error('Error deleting item', { error, id }, 'AsideDB')
    }
  }

  const handleDuplicate = (item: TreeItemType) => {
    setDuplicateItem(item)
    setShowDuplicateDialog(true)
  }

  const handleDuplicateConfirm = async (name: string) => {
    if (!duplicateItem) return
    
    try {
      await actions.duplicateItem(duplicateItem.id, name)
      setShowDuplicateDialog(false)
      setDuplicateItem(null)
    } catch (error) {
      logger.error('Error duplicating item', { error, itemId: duplicateItem.id, name }, 'AsideDB')
    }
  }

  // Vérifier si un dossier a des enfants
  const hasChildren = (itemId: string) => {
    return items.some(item => item.parentId === itemId)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    logger.debug('Drag started', { itemId: event.active.id }, 'AsideDB')
  }

  const handleDragOver = () => {
    // Optionnel: feedback visuel pendant le survol
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    
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

    // Si le parent ne change pas, ne rien faire
    if (draggedItem.parentId === newParentId) return

    try {
      await actions.moveItem(draggedItem.id, newParentId)
      logger.info('Item moved', {
        itemName: draggedItem.name,
        itemId: draggedItem.id,
        newParentId: newParentId || 'root'
      }, 'AsideDB')
    } catch (error) {
      logger.error('Error moving item', { error, itemId: draggedItem.id }, 'AsideDB')
    }
  }

  const handleRMImportSuccess = async (importResult: RangeManagerImportResult) => {
    try {
      let totalItems = 0
      
      // Créer les dossiers et leurs contenus récursivement
      if (importResult.folders) {
        for (const folder of importResult.folders) {
          const createdItems = await createFolderHierarchy(folder, null)
          totalItems += createdItems
        }
      }
      
      // Créer les ranges individuelles (celles qui ne sont pas dans des dossiers)
      if (importResult.ranges) {
          for (const range of importResult.ranges) {
          const newItem = {
            name: range.name,
            type: 'range' as const,
            parentId: null,
            data: { 
              hands: range.hands,
              // Inclure l'editorData si présent pour les actions et stratégies mixtes
              ...(range.editorData && { editorData: range.editorData })
            }
          }
          
          await actions.createItem(newItem)
          totalItems++
        }
      }
      
      logger.info('Range Manager import completed', { 
        totalItems,
        folders: importResult.folders?.length || 0, 
        ranges: importResult.ranges?.length || 0 
      }, 'AsideDB')
    } catch (error) {
      logger.error('Error importing from Range Manager', { error }, 'AsideDB')
    }
  }

  // Fonction récursive pour créer la hiérarchie de dossiers
  const createFolderHierarchy = async (
    item: RangeManagerFolder | RangeManagerData, 
    parentId: string | null
  ): Promise<number> => {
    let createdItems = 0
    
    if ('type' in item && item.type === 'folder') {
      // Créer le dossier
      const folderItem = {
        name: item.name,
        type: 'folder' as const,
        parentId,
        data: {}
      }
      
      const createdFolder = await actions.createItem(folderItem)
      createdItems++
      
      // Créer récursivement tous les enfants
      for (const child of item.children) {
        const childItems = await createFolderHierarchy(child, createdFolder.id)
        createdItems += childItems
      }
    } else {
      // Créer la range
      const rangeItem = {
        name: item.name,
        type: 'range' as const,
        parentId,
        data: { 
          hands: item.hands,
          // Inclure l'editorData si présent pour les actions et stratégies mixtes
          ...(item.editorData && { editorData: item.editorData })
        }
      }
      
      await actions.createItem(rangeItem)
      createdItems++
    }
    
    return createdItems
  }

  // Fonction utilitaire pour vérifier si un élément est descendant d'un autre
  const isDescendant = (itemId: string, ancestorId: string, items: TreeItemType[]): boolean => {
    const item = items.find(i => i.id === itemId)
    if (!item || !item.parentId) return false
    if (item.parentId === ancestorId) return true
    return isDescendant(item.parentId, ancestorId, items)
  }

  if (loading) {
    return (
      <div className={cn("flex flex-col h-full border-r bg-background", className)}>
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-col h-full border-r bg-background", className)}>
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Erreur de chargement</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full border-r bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        {/* Button Ajouter un dossier */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 cursor-pointer"
          onClick={() => {
            setCreateParentId(null)
            setCreateType('folder')
            setShowCreateDialog(true)
          }}
        >
          <FolderPlus className="h-4 w-4" />
          Ajouter un dossier
        </Button>
        
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 cursor-pointer"
          onClick={() => setShowRMImportDialog(true)}
        >
          <Upload className="h-4 w-4" />
          Importer Range Manager
        </Button>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dossiers et ranges..."
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
              {tree.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Aucun élément trouvé</p>
                  {searchTerm && (
                    <p className="text-sm">Essayez un autre terme de recherche</p>
                  )}
                </div>
              ) : (
                tree.map((node) => (
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
                ))
              )}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeId ? (
              <div className="flex items-center gap-2 p-2 bg-background border rounded shadow-lg">
                {items.find(item => item.id === activeId)?.type === 'folder' ? (
                  <Folder className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {items.find(item => item.id === activeId)?.name}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Dialog */}
      {/* Dialogues */}
      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        type={createType}
        onConfirm={handleCreateItem}
      />
      
      <EditItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={editItem}
        onConfirm={handleEditConfirm}
      />
      
      <DeleteItemDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={deleteItem}
        onConfirm={handleDeleteConfirm}
        hasChildren={deleteItem ? hasChildren(deleteItem.id) : false}
      />
      
      <DuplicateItemDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        item={duplicateItem}
        onConfirm={handleDuplicateConfirm}
      />
      
      <RangeManagerImportDialog
        isOpen={showRMImportDialog}
        onClose={() => setShowRMImportDialog(false)}
        onSuccess={handleRMImportSuccess}
      />
    </div>
  )
}