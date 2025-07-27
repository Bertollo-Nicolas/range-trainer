'use client'

import { useState, useEffect } from 'react'
import { Search, Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TreeItem as TreeItemType } from '@/types/range'
import { TreeService } from '@/lib/services/tree-service'

interface SimpleRangeLinkingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRange: (range: TreeItemType) => void
}

export function SimpleRangeLinkingModal({ open, onOpenChange, onSelectRange }: SimpleRangeLinkingModalProps) {
  const [items, setItems] = useState<TreeItemType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Load data from database when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('') // Reset search when opening
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading ranges from database...')
      
      const data = await TreeService.getAll()
      console.log('📊 Loaded data:', data)
      
      setItems(data)
      
      // Auto-expand folders that have ranges
      const folderIds = data
        .filter(item => item.type === 'folder')
        .filter(folder => data.some(item => item.parentId === folder.id && item.type === 'range'))
        .map(folder => folder.id)
      
      setExpandedFolders(new Set(folderIds))
      
    } catch (err) {
      console.error('❌ Error loading ranges:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      
      // Fallback to test data if database fails
      console.log('📊 Using fallback test data')
      const testData: TreeItemType[] = [
        {
          id: 'folder-preflop',
          name: 'Preflop',
          type: 'folder',
          parentId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isExpanded: true
        },
        {
          id: 'range-1',
          name: 'UTG Opening Range',
          type: 'range',
          parentId: 'folder-preflop',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          data: {
            hands: ["AA", "KK", "QQ", "JJ", "AKs", "AQs"],
            notes: 'Range d\'ouverture UTG (données de test)'
          }
        },
        {
          id: 'range-2',
          name: 'CO vs 3bet Calling',
          type: 'range',
          parentId: 'folder-preflop',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          data: {
            hands: ["AA", "KK", "QQ", "JJ", "TT"],
            notes: 'Range de call vs 3bet (données de test)'
          }
        }
      ]
      setItems(testData)
      setExpandedFolders(new Set(['folder-preflop']))
      
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRange = (range: TreeItemType) => {
    onSelectRange(range)
    onOpenChange(false)
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Build tree structure
  const buildTree = (items: TreeItemType[], parentId: string | null = null): TreeItemType[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => {
        // Folders first, then ranges
        if (a.type === 'folder' && b.type === 'range') return -1
        if (a.type === 'range' && b.type === 'folder') return 1
        return a.name.localeCompare(b.name)
      })
  }

  // Filter items for search
  const filteredItems = searchTerm
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.data?.notes && item.data.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : items

  const rootItems = buildTree(filteredItems)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Chargement des ranges...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <div className="text-destructive text-sm mb-2">
                Erreur: {error}
              </div>
              <div className="text-muted-foreground text-xs mb-4">
                Utilisation des données de test
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {rootItems.map((item) => (
                <TreeItemRenderer
                  key={item.id}
                  item={item}
                  level={0}
                  allItems={filteredItems}
                  expandedFolders={expandedFolders}
                  onToggleFolder={toggleFolder}
                  onSelectRange={handleSelectRange}
                />
              ))}
              
              {rootItems.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  {searchTerm ? 'Aucune range trouvée' : 'Aucune range disponible'}
                </div>
              )}
            </div>
          )}
        </div>

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

// Tree item renderer component
interface TreeItemRendererProps {
  item: TreeItemType
  level: number
  allItems: TreeItemType[]
  expandedFolders: Set<string>
  onToggleFolder: (id: string) => void
  onSelectRange: (range: TreeItemType) => void
}

function TreeItemRenderer({ 
  item, 
  level, 
  allItems, 
  expandedFolders, 
  onToggleFolder, 
  onSelectRange 
}: TreeItemRendererProps) {
  const isFolder = item.type === 'folder'
  const isExpanded = expandedFolders.has(item.id)
  const children = allItems.filter(child => child.parentId === item.id)
  const hasChildren = children.length > 0

  const handleClick = () => {
    if (isFolder) {
      onToggleFolder(item.id)
    } else {
      onSelectRange(item)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
          isFolder 
            ? 'hover:bg-accent/50' 
            : 'hover:bg-primary/10 border border-transparent hover:border-primary/20'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse for folders */}
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

        {/* Content */}
        <div className="flex-1">
          <div className={`text-sm ${isFolder ? 'font-medium' : 'font-medium text-blue-700 dark:text-blue-300'}`}>
            {item.name}
          </div>
          {!isFolder && item.data?.notes && (
            <div className="text-xs text-muted-foreground">{item.data.notes}</div>
          )}
        </div>

        {/* Range badge */}
        {!isFolder && (
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Range
          </div>
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && hasChildren && (
        <div>
          {children
            .sort((a, b) => {
              if (a.type === 'folder' && b.type === 'range') return -1
              if (a.type === 'range' && b.type === 'folder') return 1
              return a.name.localeCompare(b.name)
            })
            .map((child) => (
              <TreeItemRenderer
                key={child.id}
                item={child}
                level={level + 1}
                allItems={allItems}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectRange={onSelectRange}
              />
            ))}
        </div>
      )}
    </div>
  )
}