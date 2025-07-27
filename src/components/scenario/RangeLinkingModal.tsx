'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TreeItem as TreeItemType, TreeNode } from '@/types/range'
import { useTreeItems } from '@/hooks/use-tree-items'
import { cn } from '@/lib/utils'

interface RangeLinkingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRange: (range: TreeItemType) => void
}

export function RangeLinkingModal({ open, onOpenChange, onSelectRange }: RangeLinkingModalProps) {
  const { items, loading, error, actions } = useTreeItems()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Reset search when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('')
      actions.loadItems()
      console.log('🔍 Modal opened, loading items...')
    }
  }, [open, actions])

  // Separate effect for expanding folders to avoid infinite loops
  useEffect(() => {
    if (open && items.length > 0) {
      const folderIds = items.filter(item => item.type === 'folder').map(item => item.id)
      setExpandedFolders(new Set(folderIds))
    }
  }, [open, items.length])

  // Debug: log items when they change
  useEffect(() => {
    console.log('📊 Items loaded in modal:', items)
    console.log('📊 Items count:', items.length)
    console.log('📊 Ranges only:', items.filter(item => item.type === 'range'))
  }, [items])

  // Build hierarchical tree
  const buildTree = (items: TreeItemType[], parentId: string | null = null, level = 0): TreeNode[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        item,
        children: buildTree(items, item.id, level + 1),
        level,
      }))
  }

  // Memoize filtered items and tree construction
  const { itemsToShow, tree } = useMemo(() => {
    // Filter items based on search term
    const filtered = searchTerm
      ? items.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : items

    // Get items with their parents to maintain hierarchy during search
    const getItemsWithParents = (items: TreeItemType[], filtered: TreeItemType[]): TreeItemType[] => {
      if (!searchTerm) return items
      
      const result = new Set<TreeItemType>()
      
      // Add all matching items
      filtered.forEach(item => result.add(item))
      
      // Add all necessary parents to maintain hierarchy
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

    const itemsToShow = getItemsWithParents(items, filtered)
    const tree = buildTree(itemsToShow)

    return { itemsToShow, tree }
  }, [items, searchTerm])
  
  // Debug: log tree construction
  console.log('🌳 Items to show:', itemsToShow)
  console.log('🌳 Built tree:', tree)
  console.log('🌳 Tree length:', tree.length)

  const handleToggle = (id: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectRange = (item: TreeItemType) => {
    if (item.type === 'range') {
      onSelectRange(item)
      onOpenChange(false)
    }
  }

  const TreeItemComponent = ({ node }: { node: TreeNode }) => {
    const { item, children, level } = node
    const isFolder = item.type === 'folder'
    const isExpanded = expandedFolders.has(item.id)
    const hasChildren = children.length > 0
    const isRange = item.type === 'range'
    
    // console.log(`🌳 Rendering ${item.name}, type: ${item.type}, isFolder: ${isFolder}, isExpanded: ${isExpanded}, hasChildren: ${hasChildren}`)

    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-sm cursor-pointer transition-colors",
            "hover:bg-accent/50",
            isRange && "hover:bg-primary/10"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              handleToggle(item.id)
            } else {
              handleSelectRange(item)
            }
          }}
        >
          {/* Expand/Collapse Icon for folders */}
          {isFolder && (
            <div className="w-4 h-4 flex items-center justify-center">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              ) : (
                <div className="h-3 w-3" />
              )}
            </div>
          )}
          {!isFolder && <div className="w-4 h-4" />}

          {/* Icon */}
          {isFolder ? (
            <Folder className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-blue-500" />
          )}

          {/* Name */}
          <span className={cn(
            "flex-1 text-sm truncate",
            isRange && "font-medium text-blue-700 dark:text-blue-300"
          )}>
            {item.name}
          </span>

          {/* Range indicator */}
          {isRange && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Range
            </span>
          )}
        </div>

        {/* Children */}
        {isFolder && isExpanded && hasChildren && (
          <div>
            {children.map((child) => (
              <TreeItemComponent key={child.item.id} node={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lier une range</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une range..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tree Content */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Chargement...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Erreur de chargement</div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Debug: Simple list of all items */}
              <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <div>Debug: {items.length} items total</div>
                <div>Tree length: {tree.length}</div>
                <div>Search: "{searchTerm}"</div>
                <div>Expanded folders: {Array.from(expandedFolders).join(', ')}</div>
              </div>
              
              {/* Simple list view for debugging */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent"
                  onClick={() => item.type === 'range' && handleSelectRange(item)}
                >
                  {item.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-sm">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {item.type}
                  </span>
                </div>
              ))}
              
              {tree.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>Tree vide - problème de construction</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Cliquez sur une range pour la lier
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}